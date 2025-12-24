
import * as XLSX from "xlsx";
import { Invoice, Client, LineItem } from "@/app/page";

/**
 * Generates a standardized CSV for invoices, compatible with the import schema.
 * Explodes each line item into its own row, repeating header/customer info.
 */
export function generateInvoiceCSV(invoices: Invoice[]) {
    const rows: any[] = [];

    invoices.forEach((inv) => {
        const client = inv.client;

        // Calculate tax rates for export (import expects rates, not just amounts)
        // Defaulting to standard rates if not explicitly stored as rates
        const subtotal = inv.subtotal || 0;
        const cgstRate = subtotal > 0 ? (inv.cgst || 0) * 100 / subtotal : 9;
        const sgstRate = subtotal > 0 ? (inv.sgst || 0) * 100 / subtotal : 9;
        const igstRate = subtotal > 0 ? (inv.igst || 0) * 100 / subtotal : 18;

        inv.lineItems.forEach((li) => {
            rows.push({
                // Invoice Header
                "Invoice Number": inv.invoiceNumber,
                "Invoice Date": inv.invoiceDate,
                "Due Date": inv.dueDate,
                "Order / PO Number": inv.orderNumber || "",
                "Subject / Project Title": inv.subject || "",
                "Invoice Status": inv.status,
                "Notes": inv.notes || "",
                "Terms & Conditions": inv.termsAndConditions || "",
                "Tax Type": (inv as any).taxType || (inv.igst ? "interstate" : "intrastate"),
                "TDS": inv.tdsDeducted ? "TRUE" : "FALSE",
                "TDS Amount": inv.tdsAmount || 0,

                // Tax Info
                "CGST Rate": Math.round(cgstRate * 100) / 100,
                "SGST Rate": Math.round(sgstRate * 100) / 100,
                "IGST Rate": Math.round(igstRate * 100) / 100,

                // Customer Info
                "Customer Name": client?.displayName || client?.firstName || "",
                "Customer Email": client?.email || "",
                "Customer GSTIN": client?.gst || "",
                "Customer PAN": client?.pan || "",
                "Customer Phone": client?.phone || "",
                "Customer Address": client?.address || "",
                "Customer Type": client?.customerType || "Individual",

                // Line Item Info
                "Item Description": li.description,
                "Item SAC": li.sacCode || "",
                "Item Quantity": li.quantity,
                "Item Rate": li.rate,
            });
        });
    });

    // Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

    // Generate CSV and trigger download
    XLSX.writeFile(workbook, `invoices_export_${new Date().toISOString().split('T')[0]}.csv`, { bookType: 'csv' });
}

/**
 * Returns a list of Financial Years based on the existing invoices
 */
export function getAvailableFinancialYears(invoices: Invoice[]): string[] {
    const years = new Set<string>();
    invoices.forEach(inv => {
        const date = new Date(inv.invoiceDate);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed

        // FY in India starts Apr 1st
        // If Jan-Mar, it belongs to previous year's FY
        if (month < 3) {
            years.add(`${year - 1}-${year.toString().slice(-2)}`);
        } else {
            years.add(`${year}-${(year + 1).toString().slice(-2)}`);
        }
    });
    return Array.from(years).sort().reverse();
}

/**
 * Returns a list of available months and years
 */
export function getAvailableMonthYears(invoices: Invoice[]): { month: number, year: number, label: string }[] {
    const monthsMap = new Map<string, { month: number, year: number, label: string }>();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    invoices.forEach(inv => {
        const date = new Date(inv.invoiceDate);
        const month = date.getMonth();
        const year = date.getFullYear();
        const key = `${year}-${month}`;
        if (!monthsMap.has(key)) {
            monthsMap.set(key, { month, year, label: `${monthNames[month]} ${year}` });
        }
    });

    return Array.from(monthsMap.values()).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
}

/**
 * Filters invoices by Financial Year
 */
export function filterInvoicesByFY(invoices: Invoice[], fy: string): Invoice[] {
    const [startYear] = fy.split('-').map(Number);
    const startDate = new Date(startYear, 3, 1); // April 1st
    const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59); // March 31st next year

    return invoices.filter(inv => {
        const d = new Date(inv.invoiceDate);
        return d >= startDate && d <= endDate;
    });
}

/**
 * Filters invoices by Month/Year
 */
export function filterInvoicesByMonth(invoices: Invoice[], month: number, year: number): Invoice[] {
    return invoices.filter(inv => {
        const d = new Date(inv.invoiceDate);
        return d.getMonth() === month && d.getFullYear() === year;
    });
}
