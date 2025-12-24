
import * as XLSX from 'xlsx';

export interface Client {
    id: string;
    customerType?: string;
    salutation?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    workPhone?: string;
    mobile?: string;
    address?: string;
    pan?: string;
    tan?: string;
    gst?: string;
    currency?: string;
    paymentTerms?: string;
    customTermDays?: number;
    isTdsDeducting?: boolean;
}

export function generateClientCSV(clients: Client[]) {
    const rows = clients.map(client => ({
        "Customer Type": client.customerType || "Individual",
        "Salutation": client.salutation || "",
        "First Name": client.firstName || "",
        "Last Name": client.lastName || "",
        "Company Name": client.companyName || "",
        "Display Name": client.displayName || "",
        "Email": client.email || "",
        "Phone": client.phone || "",
        "Work Phone": client.workPhone || "",
        "Mobile": client.mobile || "",
        "Address": client.address || "",
        "PAN": client.pan || "",
        "TAN": client.tan || "",
        "GSTIN": client.gst || "",
        "Currency": client.currency || "INR",
        "Payment Terms": client.paymentTerms || "Due on receipt",
        "Custom Term Days": client.customTermDays || 0,
        "TDS Deducting": client.isTdsDeducting ? "TRUE" : "FALSE"
    }));

    // Create Worksheet
    const ws = XLSX.utils.json_to_sheet(rows);

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `customers_export_${timestamp}.csv`;

    // Trigger Download
    XLSX.writeFile(wb, filename, { bookType: 'csv' });
}
