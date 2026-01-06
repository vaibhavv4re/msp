
import { id } from "@instantdb/react";
import { db } from "./db";
import * as XLSX from "xlsx";

export interface ClientImportSummary {
    totalRows: number;
    newClients: number;
    updatedClients: number;
    skippedClients: number;
    clientsToImport: any[];
}

export async function parseClientFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
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

export function preprocessClientData(
    rows: any[],
    existingClients: any[]
): ClientImportSummary {
    const clientsToImport: any[] = [];
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const seenInBatch = new Set<string>();

    rows.forEach((row) => {
        const displayName = String(row["Display Name"] || row["Name"] || "").trim();
        const email = String(row["Email"] || "").trim();
        const gst = String(row["GSTIN"] || row["GST"] || "").trim();

        if (!displayName && !email && !gst) {
            skippedCount++;
            return;
        }

        const identityKey = gst || email || displayName.toLowerCase();
        if (seenInBatch.has(identityKey)) {
            skippedCount++;
            return;
        }
        seenInBatch.add(identityKey);

        const matchedClient = existingClients.find(c => {
            if (gst && c.gst === gst) return true;
            if (email && c.email === email) return true;
            if (displayName && c.displayName?.toLowerCase() === displayName.toLowerCase()) return true;
            return false;
        });

        const clientData = {
            id: matchedClient ? matchedClient.id : id(),
            clientType: row["Client Type"] || row["Customer Type"] || "Individual",
            salutation: row["Salutation"] || "",
            firstName: row["First Name"] || "",
            lastName: row["Last Name"] || "",
            companyName: row["Company Name"] || "",
            displayName: displayName || matchedClient?.displayName || "",
            email: email || matchedClient?.email || "",
            phone: row["Phone"] || "",
            workPhone: row["Work Phone"] || "",
            mobile: row["Mobile"] || "",
            address: row["Address"] || "",
            pan: row["PAN"] || "",
            tan: row["TAN"] || "",
            gst: gst || matchedClient?.gst || "",
            currency: row["Currency"] || "INR",
            paymentTerms: row["Payment Terms"] || "Due on receipt",
            customTermDays: Number(row["Custom Term Days"]) || 0,
            isTdsDeducting: String(row["TDS Deducting"]).toLowerCase() === "true" || row["TDS Deducting"] === true
        };

        clientsToImport.push({
            ...clientData,
            isNew: !matchedClient
        });

        if (matchedClient) updatedCount++;
        else newCount++;
    });

    return {
        totalRows: rows.length,
        newClients: newCount,
        updatedClients: updatedCount,
        skippedClients: skippedCount,
        clientsToImport
    };
}

export async function executeClientImport(
    summary: ClientImportSummary,
    userId: string
): Promise<void> {
    const txs: any[] = [];

    summary.clientsToImport.forEach((client) => {
        const { isNew, ...data } = client;
        txs.push(db.tx.clients[client.id].update(data));
        if (isNew) {
            txs.push(db.tx.clients[client.id].link({ owner: userId }));
        }
    });

    await db.transact(txs);
}
