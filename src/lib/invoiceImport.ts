import { id } from "@instantdb/react";
import { db } from "./db";
import * as XLSX from "xlsx";

export interface ImportRow {
    // Invoice Header
    "Invoice Number": string;
    "Invoice Date": string;
    "Due Date"?: string;
    "Order / PO Number"?: string;
    "Subject / Project Title"?: string;
    "Invoice Status": "Draft" | "Sent" | "Paid" | "Overdue";
    "Notes"?: string;
    "Terms & Conditions"?: string;
    "Tax Type": "intrastate" | "interstate";
    "TDS"?: string | boolean;
    "TDS Amount"?: number;

    // Tax Info (Rates Only)
    "CGST Rate"?: number;
    "SGST Rate"?: number;
    "IGST Rate"?: number;

    // Client Info
    "Client Name": string;
    "Client Email"?: string;
    "Client GSTIN"?: string;
    "Client PAN"?: string;
    "Client Phone"?: string;
    "Client Address"?: string;
    "Client Type"?: "Individual" | "Business" | "Agency";

    // Line Item Info
    "Item Description": string;
    "Item SAC"?: string;
    "Item Quantity"?: number;
    "Item Rate": number;
}

export interface ImportSummary {
    totalRows: number;
    uniqueInvoices: number;
    newClientsCount: number;
    reusedClientsCount: number;
    duplicatesSkipped: number;
    invoicesToImport: any[];
    newClients: any[];
}

export async function parseFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary", cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
    });
}

function ensureDateString(val: any): string {
    if (!val) return "";
    if (val instanceof Date) {
        return val.toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    if (typeof val === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    }
    return String(val).trim();
}

export function preprocessImportData(
    rows: any[],
    existingInvoices: any[],
    existingClients: any[]
): ImportSummary {
    const invoicesMap = new Map<string, any>();
    const clientMap = new Map<string, any>();
    let duplicatesSkipped = 0;

    rows.forEach((row) => {
        const invNum = String(row["Invoice Number"] || row["Invoice number"] || "").trim();
        const invDate = ensureDateString(row["Invoice Date"] || row["Invoice date"]);
        if (!invNum || !invDate) return;

        const key = `${invNum}_${invDate}`;

        // Rule 5 — Idempotency: Skip entire invoice if key exists
        const isDuplicateInDB = existingInvoices.some(
            (ei) => ei.invoiceNumber === invNum && ei.invoiceDate === invDate
        );

        if (isDuplicateInDB) {
            duplicatesSkipped++;
            return;
        }

        if (!invoicesMap.has(key)) {
            invoicesMap.set(key, {
                invoiceNumber: invNum,
                invoiceDate: invDate,
                dueDate: ensureDateString(row["Due Date"] || row["Due date"] || row["Invoice Date"]), // Add flexible fallback
                orderNumber: String(row["Order / PO Number"] || row["Order Number"] || row["PO Number"] || "").trim(),
                subject: String(row["Subject / Project Title"] || row["Subject"] || row["Project Title"] || "").trim(),
                status: row["Invoice Status"] || row["Status"] || "Draft",
                notes: row["Notes"] || "",
                termsAndConditions: row["Terms & Conditions"] || row["Terms"] || "",
                taxType: row["Tax Type"] || "intrastate",
                cgstRate: Number(row["CGST Rate"]) || 9,
                sgstRate: Number(row["SGST Rate"]) || 9,
                igstRate: Number(row["IGST Rate"]) || 18,

                // TDS fields
                tdsDeducted: String(row["TDS"]).toLowerCase() === "true" || row["TDS"] === true,
                tdsAmount: Number(row["TDS Amount"]) || 0,

                // Client resolution details
                clientName: String(row["Client Name"] || "").trim(),
                clientEmail: String(row["Client Email"] || "").trim(),
                clientGst: String(row["Client GSTIN"] || "").trim(),
                clientPan: String(row["Client PAN"] || "").trim(),
                clientPhone: String(row["Client Phone"] || "").trim(),
                clientAddress: String(row["Client Address"] || "").trim(),
                clientType: row["Client Type"] || "Individual",

                lineItems: [],
                subtotal: 0,
            });
        }

        const inv = invoicesMap.get(key);
        const qty = Number(row["Item Quantity"]) || 1;
        const rate = Number(row["Item Rate"]) || 0;
        const amount = qty * rate;

        inv.lineItems.push({
            id: id(),
            description: String(row["Item Description"] || "Service"),
            sacCode: String(row["Item SAC"] || ""), // Fix: Ensure sacCode is string
            quantity: qty,
            rate: rate,
            amount: amount,
        });
        inv.subtotal += amount;
    });

    const finalInvoices = Array.from(invoicesMap.values());

    let newClientsCount = 0;
    let reusedClientsCount = 0;

    finalInvoices.forEach((inv) => {
        const gst = inv.clientGst;
        const email = inv.clientEmail;
        const nameNormalized = inv.clientName.toLowerCase();

        // Rule 4 — Client Resolution Priority: GSTIN > Email > Normalized Name
        let matchedClient = existingClients.find((c) => {
            if (gst && c.gst === gst) return true;
            if (email && c.email === email) return true;
            if (c.displayName?.toLowerCase() === nameNormalized) return true;
            return false;
        });

        if (matchedClient) {
            inv.clientId = matchedClient.id;
            reusedClientsCount++;
            // Mark client as TDS deducting if any of their invoices have TDS
            if (inv.tdsDeducted) {
                matchedClient.isTdsDeductedInBatch = true;
            }
        } else {
            // Check if we already created a new client for this identity in this batch
            const tempKey = gst || email || nameNormalized;
            if (clientMap.has(tempKey)) {
                inv.clientId = clientMap.get(tempKey).id;
                reusedClientsCount++;
            } else {
                const newId = id();
                const newClient = {
                    id: newId,
                    displayName: inv.clientName,
                    email: inv.clientEmail,
                    gst: inv.clientGst,
                    pan: inv.clientPan,
                    phone: inv.clientPhone,
                    address: inv.clientAddress,
                    clientType: inv.clientType,
                    isTdsDeducting: inv.tdsDeducted,
                };
                clientMap.set(tempKey, newClient);
                inv.clientId = newId;
                inv.isNewClient = true;
                newClientsCount++;
            }
        }
    });

    return {
        totalRows: rows.length,
        uniqueInvoices: finalInvoices.length,
        newClientsCount,
        reusedClientsCount,
        duplicatesSkipped,
        invoicesToImport: finalInvoices,
        newClients: Array.from(clientMap.values()),
    };
}

export async function executeImport(
    summary: ImportSummary,
    userId: string
): Promise<void> {
    const txs: any[] = [];

    summary.invoicesToImport.forEach((inv: any) => {
        if (inv.isNewClient) return; // Already handled
        if (inv.tdsDeducted) {
            txs.push(db.tx.clients[inv.clientId].update({ isTdsDeducting: true }));
        }
    });

    summary.newClients.forEach((client: any) => {
        txs.push(db.tx.clients[client.id].update(client));
        txs.push(db.tx.clients[client.id].link({ owner: userId }));
    });

    summary.invoicesToImport.forEach((inv: any) => {
        const invId = id();

        // Rule: Totals are recalculated, not trusted blindly
        let cgst = 0, sgst = 0, igst = 0;
        if (inv.taxType === "interstate") {
            igst = (inv.subtotal * inv.igstRate) / 100;
        } else {
            cgst = (inv.subtotal * inv.cgstRate) / 100;
            sgst = (inv.subtotal * inv.sgstRate) / 100;
        }
        const total = inv.subtotal + cgst + sgst + igst;

        txs.push(
            db.tx.invoices[invId].update({
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.invoiceDate,
                dueDate: inv.dueDate,
                orderNumber: inv.orderNumber,
                subject: inv.subject,
                status: inv.status,
                subtotal: inv.subtotal,
                cgst,
                sgst,
                igst,
                total,
                notes: inv.notes,
                termsAndConditions: inv.termsAndConditions,
                tdsDeducted: inv.tdsDeducted,
                tdsAmount: inv.tdsAmount,
            })
        );

        txs.push(db.tx.invoices[invId].link({ owner: userId }));
        txs.push(db.tx.invoices[invId].link({ client: inv.clientId }));

        const liIds: string[] = [];
        inv.lineItems.forEach((li: any) => {
            liIds.push(li.id);
            txs.push(db.tx.lineItems[li.id].update(li));
        });
        txs.push(db.tx.invoices[invId].link({ lineItems: liIds }));
    });

    await db.transact(txs);
}
