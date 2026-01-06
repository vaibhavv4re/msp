import { Business, Invoice } from "@/app/page";

export function getFY() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed, 0 = Jan

    // Fiscal Year in India starts in April
    // If month is Jan-Mar, FY is (year-1)-year
    // If month is Apr-Dec, FY is year-(year+1)
    // But common shorthand is just the starting year or ending year.
    // The user example showed "FY25". Let's assume it means the year the FY starts or is currently in.
    // Actually, let's just use the current year's last 2 digits as "FYXX".
    return now.getFullYear().toString().slice(-2);
}

export function generateNextInvoiceNumber(business: Business, allInvoices: Invoice[]) {
    const prefix = business.invoicePrefix || "INV";
    const separator = business.invoiceSeparator || "/";
    const includeFY = business.invoiceIncludeFY || false;
    const startNumber = business.invoiceStartNumber || 1;
    const padding = business.invoicePadding || 4;

    const fy = getFY();
    const fyFormat = (business as any).invoiceFYFormat === "25" ? fy : `FY${fy}`;
    const fyPart = includeFY ? `${fyFormat}${separator}` : "";
    const pattern = `${prefix}${separator}${fyPart}`;

    // Filter invoices for this business and this series pattern
    const seriesInvoices = allInvoices.filter(inv =>
        (inv as any).business?.id === business.id &&
        (inv.invoiceNumber || "").startsWith(pattern)
    );

    let maxSequence = 0;

    seriesInvoices.forEach(inv => {
        // Extract the sequence number part
        const sequencePart = (inv.invoiceNumber || "").replace(pattern, "");
        const sequence = parseInt(sequencePart, 10);
        if (!isNaN(sequence) && sequence > maxSequence) {
            maxSequence = sequence;
        }
    });

    const nextSequence = Math.max(startNumber, maxSequence + 1);
    const paddedSequence = String(nextSequence).padStart(padding, '0');

    return `${pattern}${paddedSequence}`;
}
