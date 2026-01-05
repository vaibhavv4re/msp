import { Invoice, Client } from "@/components/Invoices";
import { Business } from "@/app/page";
import { InvoicePDFData } from "./types";

export function normalizeInvoiceData(
    invoice: Invoice,
    business?: Business,
    client?: Client
): InvoicePDFData {
    const subtotal = invoice.subtotal || 0;
    const cgst = invoice.cgst || 0;
    const sgst = invoice.sgst || 0;
    const igst = invoice.igst || 0;
    const total = subtotal + cgst + sgst + igst;
    const advancePaid = invoice.isAdvanceReceived ? (invoice.advanceAmount || 0) : 0;
    const tdsAmount = (invoice as any).tdsAmount || 0;
    const balanceDue = total - advancePaid - tdsAmount;

    return {
        schemaVersion: "v1",
        business: {
            name: business?.name || "N/A",
            legalName: business?.legalName,
            address: business?.address,
            city: business?.city,
            state: business?.state,
            pin: business?.pin,
            country: business?.country,
            email: business?.email,
            phone: business?.contact,
            gstin: business?.gst,
            logoUrl: undefined, // Add if business schema supports logos
            signatureUrl: business?.signatureUrl,
            brandColor: business?.color || "#000000",
        },
        customer: {
            name: client?.displayName || client?.firstName || "N/A",
            address: client?.address,
            email: client?.email,
            phone: client?.phone || client?.mobile,
            gstin: client?.gst,
        },
        invoice: {
            number: invoice.invoiceNumber,
            date: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            orderNumber: invoice.orderNumber,
            subject: invoice.subject,
        },
        items: (invoice.lineItems || []).map((item) => ({
            description: item.description,
            sacCode: item.sacCode,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
        })),
        totals: {
            subtotal,
            cgst: cgst > 0 ? cgst : undefined,
            sgst: sgst > 0 ? sgst : undefined,
            igst: igst > 0 ? igst : undefined,
            total,
            advancePaid: advancePaid > 0 ? advancePaid : undefined,
            balanceDue,
            tdsAmount: tdsAmount > 0 ? tdsAmount : undefined,
        },
        bankAccount: invoice.bankAccount ? {
            bankName: invoice.bankAccount.bankName,
            holderName: invoice.bankAccount.holderName,
            accountNumber: invoice.bankAccount.accountNumber,
            ifsc: invoice.bankAccount.ifsc,
            upiId: invoice.bankAccount.upiId,
            chequeName: invoice.bankAccount.chequeName,
        } : undefined,
        notes: invoice.notes,
        terms: invoice.termsAndConditions,
    };
}
