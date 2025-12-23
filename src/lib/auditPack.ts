import JSZip from "jszip";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export interface AuditData {
    fy: string;
    expenses: any[];
    invoices: any[];
}

export async function generateAuditPack(data: AuditData) {
    const zip = new JSZip();
    const rootFolder = zip.folder(`CA-Pack-FY-${data.fy}`);
    if (!rootFolder) return;

    // 1. README.txt
    const readmeContent = `This CA Pack contains:

1. Expenses folder
   - expenses-summary.xlsx: one row per expense
   - Column "Bill File" maps each expense to its document
   - Subfolders organized by category (Travel, Studio, etc.)
   - Bills named using stable Expense ID (EXP-XXXX)

2. Invoices folder
   - invoices-summary.xlsx: one row per invoice
   - PDFs named using stable Invoice ID (INV-XXXX or original ID)

GST ITC marked as:
Yes / No / Unsure

Final tax treatment to be determined by CA.
Generated on: ${new Date().toLocaleString()}
`;
    rootFolder.file("README.txt", readmeContent);

    // 2. Expenses
    const expensesFolder = rootFolder.folder("Expenses");
    if (expensesFolder) {
        // First, normalize expenses with deterministic IDs if missing
        const normalizedExpenses = data.expenses.map((exp, index) => ({
            ...exp,
            calculatedDisplayId: exp.displayId || `EXP-${(index + 1).toString().padStart(4, "0")}`
        }));

        const expenseRows = normalizedExpenses.map((exp) => {
            const displayId = exp.calculatedDisplayId;
            const attachment = exp.attachment;
            let billFile = "—";

            if (attachment) {
                const extension = attachment.url.split(".").pop() || "pdf";
                billFile = `${exp.category}/${displayId}.${extension}`;
            }

            return {
                "Expense ID": displayId,
                "Date": exp.date,
                "Category": exp.category,
                "Vendor": exp.vendorName || "—",
                "Amount": exp.amount,
                "GST Charged": exp.gstCharged ? "Yes" : "No",
                "GST Amount": exp.gstAmount || 0,
                "ITC Review": exp.itcReview || "Unsure",
                "Bill File": billFile
            };
        });

        const expenseWS = XLSX.utils.json_to_sheet(expenseRows);
        const expenseWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(expenseWB, expenseWS, "Expenses Summary");
        const expenseExcelBase64 = XLSX.write(expenseWB, { bookType: "xlsx", type: "base64" });
        expensesFolder.file("expenses-summary.xlsx", expenseExcelBase64, { base64: true });

        // Add Proofs
        const missingFiles: string[] = [];
        for (const exp of normalizedExpenses) {
            if (exp.attachment) {
                const categoryFolder = expensesFolder.folder(exp.category);
                if (categoryFolder) {
                    const displayId = exp.calculatedDisplayId;
                    const extension = exp.attachment.url.split(".").pop() || "pdf";
                    const fileName = `${displayId}.${extension}`;

                    try {
                        const blob = await fetch(exp.attachment.url).then(r => r.blob());
                        categoryFolder.file(fileName, blob);
                    } catch (err) {
                        console.error(`Failed to download ${exp.attachment.url}`, err);
                        missingFiles.push(`${displayId} (${exp.category})`);
                    }
                }
            }
        }

        if (missingFiles.length > 0) {
            const errorLogs = `Missing files during export:\n${missingFiles.join("\n")}`;
            rootFolder.file("ERROR_LOGS.txt", errorLogs);
        }
    }

    // 3. Invoices
    const invoicesFolder = rootFolder.folder("Invoices");
    if (invoicesFolder) {
        const invoiceRows = data.invoices.map(inv => {
            const attachment = inv.attachment;
            let attachmentFile = "—";

            if (attachment) {
                const extension = attachment.url.split(".").pop() || "pdf";
                attachmentFile = `${inv.invoiceNumber}.${extension}`;
            }

            return {
                "Invoice ID": inv.invoiceNumber,
                "Date": inv.invoiceDate,
                "Customer": inv.client?.displayName || inv.client?.firstName || "—",
                "Total Amount": inv.total,
                "GST Portion": (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0),
                "Status": inv.status,
                "Attachment": attachmentFile
            };
        });

        const invoiceWS = XLSX.utils.json_to_sheet(invoiceRows);
        const invoiceWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(invoiceWB, invoiceWS, "Invoices Summary");
        const invoiceExcelBase64 = XLSX.write(invoiceWB, { bookType: "xlsx", type: "base64" });
        invoicesFolder.file("invoices-summary.xlsx", invoiceExcelBase64, { base64: true });

        // Add Invoice PDFs
        for (const inv of data.invoices) {
            if (inv.attachment) {
                const extension = inv.attachment.url.split(".").pop() || "pdf";
                const fileName = `${inv.invoiceNumber}.${extension}`;
                try {
                    const blob = await fetch(inv.attachment.url).then(r => r.blob());
                    invoicesFolder.file(fileName, blob);
                } catch (err) {
                    console.error(`Failed to download invoice ${inv.attachment.url}`, err);
                }
            }
        }
    }

    // 4. GST Summary
    const gstFolder = rootFolder.folder("GST");
    if (gstFolder) {
        // Group by month
        const monthlySummary: any[] = [];
        const months = new Set([
            ...data.invoices.map(i => i.invoiceDate.slice(0, 7)),
            ...data.expenses.map(e => e.date.slice(0, 7))
        ]);

        Array.from(months).sort().forEach(month => {
            const monthInvoices = data.invoices.filter(i => i.invoiceDate.startsWith(month));
            const monthExpenses = data.expenses.filter(e => e.date.startsWith(month));

            const gstCollected = monthInvoices.reduce((sum, i) => sum + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0);
            const gstPaid = monthExpenses.reduce((sum, e) => sum + (e.gstAmount || 0), 0);
            const eligibleITC = monthExpenses.filter(e => e.itcReview === "yes").reduce((sum, e) => sum + (e.gstAmount || 0), 0);

            monthlySummary.push({
                "Month": month,
                "GST Collected (Sales)": gstCollected,
                "GST Paid (Expenses)": gstPaid,
                "Eligible ITC (Confirmed)": eligibleITC,
                "ITC To Review": monthExpenses.filter(e => e.itcReview === "unsure").length + " items"
            });
        });

        const gstWS = XLSX.utils.json_to_sheet(monthlySummary);
        const gstWB = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(gstWB, gstWS, "GST Summary");
        const gstExcelBase64 = XLSX.write(gstWB, { bookType: "xlsx", type: "base64" });
        gstFolder.file("gst-summary.xlsx", gstExcelBase64, { base64: true });
    }

    // Generate and Download
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `CA-Audit-Pack-${data.fy}-${new Date().toISOString().slice(0, 10)}.zip`);
}
