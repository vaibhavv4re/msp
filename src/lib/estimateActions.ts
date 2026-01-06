import { db } from "./db";
import { id } from "@instantdb/react";
import { Estimate, Invoice, LineItem, Business } from "@/app/page";
import { generateNextInvoiceNumber } from "./invoiceUtils";

export async function convertToInvoice(estimate: Estimate, userId: string, allInvoices: Invoice[], businesses: Business[]) {
    if (estimate.status === "converted") {
        throw new Error("Estimate is already converted.");
    }

    const invoiceId = id();

    const business = businesses.find(b => b.id === estimate.business?.id);
    let invoiceNumber = "TEMP-" + id().slice(0, 5);

    if (business) {
        invoiceNumber = generateNextInvoiceNumber(business, allInvoices);
    }

    // 1. Format Structured Scope into readable text for Invoice
    let invoiceNotes = estimate.notes || "";
    let invoiceTerms = estimate.termsAndConditions || "";

    try {
        if (estimate.notes?.startsWith('{')) {
            const scope = JSON.parse(estimate.notes);
            const notesParts = [];
            if (scope.deliverables) notesParts.push(`DELIVERABLES:\n${scope.deliverables}`);
            if (scope.schedule) notesParts.push(`SCHEDULE:\n${scope.schedule}`);
            if (scope.usage) notesParts.push(`USAGE RIGHTS:\n${scope.usage}`);
            if (scope.additionalNotes) notesParts.push(`ADDITIONAL NOTES:\n${scope.additionalNotes}`);

            invoiceNotes = notesParts.join('\n\n');

            if (scope.exclusions) {
                invoiceTerms = `EXCLUSIONS:\n${scope.exclusions}\n\n${invoiceTerms}`;
            }
        }
    } catch (e) {
        console.warn("Failed to parse structured notes during conversion, falling back to raw text.");
    }

    // 2. Create the Invoice entity
    const invoiceUpdate = {
        invoiceNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        status: "draft",
        subtotal: estimate.subtotal,
        total: estimate.total,
        notes: invoiceNotes,
        termsAndConditions: invoiceTerms,
        advanceAmount: estimate.advanceIntent,
        isAdvanceReceived: false,
        source: "estimate",
        subject: `Project Estimate: ${estimate.recipientName || estimate.client?.displayName || "New Project"}`
    };

    const txs: any[] = [
        db.tx.invoices[invoiceId].update(invoiceUpdate),
        db.tx.invoices[invoiceId].link({
            owner: userId,
            business: estimate.business?.id,
            client: estimate.client?.id,
            sourceEstimate: estimate.id
        }),
        // 2. Mark Estimate as converted
        db.tx.estimates[estimate.id].update({
            status: "converted"
        }),
        db.tx.estimates[estimate.id].link({
            convertedInvoice: invoiceId
        })
    ];

    // 3. Duplicate Line Items
    estimate.lineItems?.forEach((item: LineItem) => {
        const newItemId = id();
        txs.push(db.tx.lineItems[newItemId].update({
            itemType: item.itemType,
            description: item.description,
            sacCode: item.sacCode,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount
        }));
        txs.push(db.tx.lineItems[newItemId].link({
            invoice: invoiceId,
            owner: userId
        }));
    });

    try {
        await db.transact(txs);
        return invoiceId;
    } catch (error) {
        console.error("Failed to convert estimate to invoice:", error);
        throw error;
    }
}
