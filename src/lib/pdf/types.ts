export type InvoiceTemplate = "classic" | "compact" | "creative";

export interface InvoicePDFData {
    schemaVersion: "v1";
    business: {
        name: string;
        legalName?: string;
        address?: string;
        city?: string;
        state?: string;
        pin?: string;
        country?: string;
        email?: string;
        phone?: string;
        gstin?: string;
        pan?: string;
        logoUrl?: string;
        signatureUrl?: string;
        brandColor: string;
    };
    customer: {
        name: string;
        address?: string;
        email?: string;
        phone?: string;
        gstin?: string;
    };
    invoice: {
        number: string;
        date: string;
        dueDate?: string;
        orderNumber?: string;
        subject?: string;
    };
    items: {
        description: string;
        sacCode?: string;
        quantity: number;
        rate: number;
        amount: number;
    }[];
    totals: {
        subtotal: number;
        cgst?: number;
        sgst?: number;
        igst?: number;
        discount?: number;
        total: number;
        advancePaid?: number;
        balanceDue: number;
        tdsAmount?: number;
        amountInWords?: string;
    };
    bankAccount?: {
        bankName: string;
        holderName: string;
        accountNumber: string;
        ifsc: string;
        upiId?: string;
        chequeName?: string;
    };
    notes?: string;
    terms?: string;
}
