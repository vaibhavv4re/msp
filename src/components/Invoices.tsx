import { useState } from "react";
import React from "react";
import { db } from "@/lib/db";
import { id, InstaQLEntity } from "@instantdb/react";
import schema from "@/instant.schema";
import { Business, BankAccount } from "@/app/page";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CustomerModal } from "./Customers";
import { APP_CONFIG } from "@/config";
import { generateNextInvoiceNumber } from "@/lib/invoiceUtils";
import { RecordPaymentModal } from "./RecordPaymentModal";

export type Client = InstaQLEntity<typeof schema, "clients"> & { invoices?: Invoice[] };
export type Invoice = InstaQLEntity<typeof schema, "invoices"> & {
  client?: Client;
  lineItems: LineItem[];
  business?: Business;
  bankAccount?: BankAccount;
};
export type LineItem = InstaQLEntity<typeof schema, "lineItems">;

type Service = { id: string; name: string; sacCode?: string; rate: number; isActive: boolean };
type Tax = { id: string; name: string; rate: number; isDefault: boolean };
type TermsTemplate = { id: string; title: string; content: string; isDefault: boolean };

const PAYMENT_TERMS = [
  { value: "due_on_receipt", label: "Due on Receipt", days: 0 },
  { value: "net_15", label: "Net 15", days: 15 },
  { value: "net_30", label: "Net 30", days: 30 },
  { value: "net_45", label: "Net 45", days: 45 },
  { value: "net_60", label: "Net 60", days: 60 },
  { value: "custom", label: "Custom", days: 0 },
];

function calculateInvoiceTotal(invoice: Invoice) {
  return (invoice.subtotal || 0) + (invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0);
}

function calculatePendingBalance(invoice: Invoice) {
  const total = calculateInvoiceTotal(invoice);
  const advance = invoice.isAdvanceReceived ? (invoice.advanceAmount || 0) : 0;
  const tds = (invoice as any).tdsAmount || 0;
  return total - advance - tds;
}

function calculateDueDate(invoiceDate: string, paymentTerms: string, customDays?: number): string {
  const date = new Date(invoiceDate);
  const term = PAYMENT_TERMS.find(t => t.value === paymentTerms);
  const days = paymentTerms === "custom" && customDays ? customDays : (term?.days || 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function Invoices({
  invoices,
  clients,
  userId,
  services,
  taxes,
  termsTemplates,
  businesses,
  activeBusinessId,
  allInvoices,
  initiallyOpenModal,
  onModalClose,
}: {
  invoices: Invoice[];
  clients: Client[];
  userId: string;
  services?: Service[];
  taxes?: Tax[];
  termsTemplates?: TermsTemplate[];
  businesses: Business[];
  activeBusinessId: string;
  allInvoices?: Invoice[];
  initiallyOpenModal?: boolean | string;
  onModalClose?: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState(invoices.length > 50 ? "90days" : "all");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileLimit, setMobileLimit] = useState(15);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  React.useEffect(() => {
    if (initiallyOpenModal === true || initiallyOpenModal === "create-invoice") {
      setIsModalOpen(true);
      setEditingInvoice(null);
    } else if (typeof initiallyOpenModal === 'string' && initiallyOpenModal.startsWith('edit-invoice:')) {
      const invId = initiallyOpenModal.split(':')[1];
      const inv = invoices.find(i => i.id === invId);
      if (inv) {
        setEditingInvoice(inv);
        setIsModalOpen(true);
      }
    }
  }, [initiallyOpenModal, invoices]);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const filteredInvoices = (invoices as any[]).filter((invoice) => {
    const client = clients.find((c) => c.id === invoice.client?.id);
    const clientName = client?.displayName || client?.firstName || "";
    const invoiceNumber = invoice.invoiceNumber?.toLowerCase() || "";
    const orderNumber = invoice.orderNumber?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();

    if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
    if (businessFilter !== "all" && invoice.business?.id !== businessFilter) return false;

    if (dateRangeFilter === "90days") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const invDate = new Date(invoice.invoiceDate);
      if (invDate < ninetyDaysAgo) return false;
    } else if (dateRangeFilter === "thisMonth") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const invDate = new Date(invoice.invoiceDate);
      if (invDate < firstDay) return false;
    }

    return clientName.toLowerCase().includes(term) ||
      invoiceNumber.includes(term) ||
      orderNumber.includes(term);
  });

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setMobileLimit(15);
  }, [searchTerm, statusFilter, businessFilter, dateRangeFilter]);

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (!sortConfig) return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();

    let aVal: any = a[sortConfig.key as keyof typeof a];
    let bVal: any = b[sortConfig.key as keyof typeof b];

    if (sortConfig.key === 'business') {
      aVal = businesses.find(bus => bus.id === a.business?.id)?.name || "";
      bVal = businesses.find(bus => bus.id === b.business?.id)?.name || "";
    } else if (sortConfig.key === 'client') {
      const clientA = clients.find(c => c.id === a.client?.id);
      const clientB = clients.find(c => c.id === b.client?.id);
      aVal = clientA?.displayName || clientA?.firstName || "";
      bVal = clientB?.displayName || clientB?.firstName || "";
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const itemsPerPage = 25;
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
  const pagedInvoices = sortedInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const mobilePagedInvoices = sortedInvoices.slice(0, mobileLimit);

  function openModal(invoice: Invoice | null = null) {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingInvoice(null);
    if (onModalClose) onModalClose();
  }

  function handleSort(key: string) {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Invoices</h2>
        <div className="flex gap-2">
          <button
            onClick={() => openModal()}
            className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
          >
            Create Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <input
          type="text"
          placeholder="Search items..."
          className="border p-2 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="border p-2 rounded-md"
          value={businessFilter}
          onChange={(e) => setBusinessFilter(e.target.value)}
        >
          <option value="all">All Businesses</option>
          {businesses.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          className="border p-2 rounded-md font-bold"
          value={dateRangeFilter}
          onChange={(e) => setDateRangeFilter(e.target.value)}
        >
          <option value="all">All Dates</option>
          <option value="90days">Last 90 Days</option>
          <option value="thisMonth">This Month</option>
        </select>
        <select
          className="border p-2 rounded-md font-bold"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Sent">Sent</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Overdue">Overdue (Calculated)</option>
        </select>
      </div>

      <InvoiceTable
        invoices={pagedInvoices}
        mobileInvoices={mobilePagedInvoices}
        clients={clients}
        businesses={businesses}
        onEdit={openModal}
        userId={userId}
        onSort={handleSort}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onLoadMore={() => setMobileLimit(prev => prev + 15)}
        hasMore={mobileLimit < sortedInvoices.length}
        totalCount={sortedInvoices.length}
        onRecordPayment={(inv) => {
          setSelectedInvoiceForPayment(inv);
          setIsRecordPaymentModalOpen(true);
        }}
      />

      {isModalOpen && (
        <InvoiceModal
          invoice={editingInvoice as any}
          clients={clients}
          businesses={businesses}
          userId={userId}
          activeBusinessId={activeBusinessId}
          services={services || []}
          taxes={taxes || []}
          termsTemplates={termsTemplates || []}
          onClose={closeModal}
          invoices={allInvoices || invoices}
        />
      )}

      {isRecordPaymentModalOpen && selectedInvoiceForPayment && (
        <RecordPaymentModal
          isOpen={isRecordPaymentModalOpen}
          onClose={() => {
            setIsRecordPaymentModalOpen(false);
            setSelectedInvoiceForPayment(null);
          }}
          invoice={selectedInvoiceForPayment}
          userId={userId}
        />
      )}

    </div>
  );
}


function InvoiceTable({
  invoices,
  mobileInvoices,
  clients,
  businesses,
  onEdit,
  userId,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  onLoadMore,
  hasMore,
  totalCount,
  onRecordPayment,
}: {
  invoices: any[];
  mobileInvoices: any[];
  clients: any[];
  businesses: any[];
  onEdit: (invoice: any) => void;
  userId: string;
  onSort: (key: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  totalCount: number;
  onRecordPayment: (invoice: Invoice) => void;
}) {
  async function deleteInvoice(invoice: Invoice) {
    if (confirm("Are you sure you want to delete this invoice?")) {
      try {
        const txs = [
          ...invoice.lineItems.map((li) => db.tx.lineItems[li.id].delete()),
          db.tx.invoices[invoice.id].delete(),
        ];
        db.transact(txs);
      } catch (error) {
        console.error("Failed to delete invoice or attachment:", error);
        alert("Failed to delete complete invoice records. Check console for details.");
      }
    }
  }

  function markAsSent(invoice: Invoice) {
    db.transact(
      db.tx.invoices[invoice.id].update({
        status: invoice.status === "Unpaid" ? "Sent" : invoice.status,
        sentAt: new Date().toISOString(),
      })
    );
  }

  function recordPayment(invoice: Invoice) {
    onRecordPayment(invoice);
  }

  function downloadPDF(invoice: Invoice) {
    const client = clients.find(c => c.id === invoice.client?.id);
    const business = businesses.find(b => b.id === (invoice as any).business?.id);
    const bankAccount = (invoice as any).bankAccount;

    const brandColor = business?.color || "#000000";
    const rgbColor = hexToRgb(brandColor);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // 1. Header Section
    // Left: INVOICE title
    doc.setFontSize(28);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 20, 30);

    // Right: Business Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const bizName = business?.name || `${APP_CONFIG.NAME} Productions`;
    doc.text(bizName, pageWidth - 20, 25, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    let bizY = 30;

    // Legal Name if different
    if (business?.legalName && business.legalName !== business.name) {
      doc.setFont("helvetica", "bold");
      doc.text(business.legalName, pageWidth - 20, bizY, { align: "right" });
      bizY += 4.5;
      doc.setFont("helvetica", "normal");
    }

    if (business?.address) {
      const fullAddr = [
        business.address,
        business.city,
        business.state,
        business.pin,
        business.country
      ].filter(Boolean).join(", ");

      const splitAddr = doc.splitTextToSize(fullAddr, 80);
      splitAddr.forEach((line: string) => {
        doc.text(line.toUpperCase(), pageWidth - 20, bizY, { align: "right" });
        bizY += 4.5;
      });
    }

    if (business?.gst) {
      doc.text(`GSTN: ${business.gst}`, pageWidth - 20, bizY, { align: "right" });
      bizY += 4.5;
    }
    if (business?.email) {
      doc.text(business.email, pageWidth - 20, bizY, { align: "right" });
      bizY += 4.5;
    }

    // Horizontal Divider with Brand Color
    const headerEnd = Math.max(bizY, 35);
    doc.setDrawColor(rgbColor[0], rgbColor[1], rgbColor[2]);
    doc.setLineWidth(1);
    doc.line(20, headerEnd + 5, pageWidth - 20, headerEnd + 5);

    // 2. Info Row (Bill To & Invoice Details)
    currentY = headerEnd + 15;

    // Left: BILL TO
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", 20, currentY);

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(client?.displayName || "N/A", 20, currentY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    let clientY = currentY + 11;
    if (client?.gst) {
      doc.text(`GST No: ${client.gst}`, 20, clientY);
      clientY += 4.5;
    }
    if (client?.address) {
      const splitClientAddr = doc.splitTextToSize(client.address, 80);
      doc.text(splitClientAddr, 20, clientY);
      clientY += (splitClientAddr.length * 4.5);
    }

    // Right: Invoice Info
    const infoX = pageWidth - 65;
    const infoValX = pageWidth - 20;

    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch (e) { return dateStr; }
    };

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice #:", infoX, currentY + 6, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoiceNumber, infoValX, currentY + 6, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text("Date:", infoX, currentY + 11, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(invoice.invoiceDate), infoValX, currentY + 11, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text("Due Date:", infoX, currentY + 16, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(invoice.dueDate), infoValX, currentY + 16, { align: "right" });

    // Amount Due Highlight Box with Brand Color
    doc.setFillColor(rgbColor[0], rgbColor[1], rgbColor[2]);
    doc.rect(pageWidth - 85, currentY + 22, 65, 12, 'F');
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.text("Amount Due:", pageWidth - 80, currentY + 29.5);
    doc.text(`Rs. ${calculatePendingBalance(invoice).toLocaleString('en-IN')}`, pageWidth - 22, currentY + 29.5, { align: "right" });
    doc.setTextColor(0);

    // 3. Table Section
    const tableData = invoice.lineItems.map(item => [
      item.description,
      item.sacCode || "-",
      item.quantity.toLocaleString(),
      `Rs. ${item.rate.toLocaleString('en-IN')}`,
      `Rs. ${item.amount.toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: Math.max(clientY + 5, currentY + 38),
      head: [['Description', 'SAC Code', 'Qty', 'Rate', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: rgbColor,
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    // 4. Totals and Footer
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals on the right
    const totLabelX = pageWidth - 65;
    const totValX = pageWidth - 20;

    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text("Subtotal:", totLabelX, finalY, { align: "right" });
    doc.text(`Rs. ${invoice.subtotal.toLocaleString('en-IN')}`, totValX, finalY, { align: "right" });

    let ty = finalY + 6;
    if (invoice.cgst) {
      doc.text("CGST:", totLabelX, ty, { align: "right" });
      doc.text(`Rs. ${invoice.cgst.toLocaleString('en-IN')}`, totValX, ty, { align: "right" });
      ty += 6;
    }
    if (invoice.sgst) {
      doc.text("SGST:", totLabelX, ty, { align: "right" });
      doc.text(`Rs. ${invoice.sgst.toLocaleString('en-IN')}`, totValX, ty, { align: "right" });
      ty += 6;
    }
    if (invoice.igst) {
      doc.text("IGST:", totLabelX, ty, { align: "right" });
      doc.text(`Rs. ${invoice.igst.toLocaleString('en-IN')}`, totValX, ty, { align: "right" });
      ty += 6;
    }

    doc.setLineWidth(0.2);
    doc.line(totLabelX - 5, ty, totValX, ty);
    ty += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Grand Total:", totLabelX, ty, { align: "right" });
    doc.text(`Rs. ${invoice.total.toLocaleString('en-IN')}`, totValX, ty, { align: "right" });

    if (invoice.isAdvanceReceived) {
      ty += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Advance Paid:", totLabelX, ty, { align: "right" });
      const advAmt = (invoice as any).advanceAmount || 0;
      doc.text(`- Rs. ${advAmt.toLocaleString('en-IN')}`, totValX, ty, { align: "right" });

      ty += 10;
      doc.setFillColor(rgbColor[0], rgbColor[1], rgbColor[2]);
      doc.rect(totLabelX - 25, ty - 6, totValX - totLabelX + 30, 10, 'F');
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.text("BALANCE DUE:", totLabelX, ty, { align: "right" });
      doc.text(`Rs. ${calculatePendingBalance(invoice).toLocaleString('en-IN')}`, totValX, ty, { align: "right" });
    }

    // 5. Footer (Notes & Terms)
    // Reduce initial gap from 30 to 15
    let footerY = Math.max(ty + 10, (doc as any).lastAutoTable.finalY + 15);

    // Check if we need a new page for footer components
    if (footerY > 250) {
      doc.addPage();
      footerY = 20;
    }

    // Notes
    if (invoice.notes) {
      doc.setTextColor(150);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("NOTES", 20, footerY);
      doc.setTextColor(50);
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(invoice.notes, 100);
      doc.text(splitNotes, 20, footerY + 4);
      footerY += (splitNotes.length * 3.5) + 8;
    }

    // Terms
    if (invoice.termsAndConditions) {
      if (footerY > 260) { doc.addPage(); footerY = 20; }
      doc.setTextColor(150);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS & CONDITIONS", 20, footerY);
      doc.setTextColor(50);
      doc.setFont("helvetica", "normal");
      const splitTerms = doc.splitTextToSize(invoice.termsAndConditions, 170);
      doc.text(splitTerms, 20, footerY + 4);
      footerY += (splitTerms.length * 3.5) + 8;
    }

    // Space Check before Payment & Sign
    if (footerY > 230) {
      doc.addPage();
      footerY = 20;
    }

    // 6. Payment Information (Left Side)
    let paymentEndY = footerY;
    if (bankAccount) {
      doc.setTextColor(rgbColor[0], rgbColor[1], rgbColor[2]);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Details", 20, footerY);
      let py = footerY + 5;

      doc.setFontSize(7.5);
      doc.setTextColor(60);

      const drawLine = (label: string, value: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}: `, 20, py);
        const labelWidth = doc.getTextWidth(`${label}: `);
        doc.setFont("helvetica", "normal");
        doc.text(value, 20 + labelWidth, py);
        py += 4;
      };

      drawLine("Bank", bankAccount.bankName || "N/A");
      drawLine("A/C Name", bankAccount.holderName || "N/A");
      drawLine("A/C No", bankAccount.accountNumber || "N/A");
      drawLine("IFSC", (bankAccount.ifsc || "N/A").toUpperCase());

      if (bankAccount.upiId || bankAccount.chequeName) py += 1;
      if (bankAccount.upiId) drawLine("UPI", bankAccount.upiId);
      if (bankAccount.chequeName) drawLine("Cheque in favor of", bankAccount.chequeName);

      paymentEndY = py;
    }

    // 7. Signature (Right Side)
    if (business?.signatureUrl) {
      try {
        // Place signature on the same vertical level as payment details if possible
        const sigY = Math.max(footerY, paymentEndY - 20);
        doc.addImage(business.signatureUrl, 'PNG', pageWidth - 60, sigY, 40, 15);
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.setFont("helvetica", "bold");
        doc.text("Authorized Signatory", pageWidth - 40, sigY + 18, { align: "center" });

        // Final line for brand
        doc.setDrawColor(rgbColor[0], rgbColor[1], rgbColor[2]);
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 60, sigY + 19, pageWidth - 20, sigY + 19);
      } catch (e) { console.error("Could not add signature to PDF", e); }
    }

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  }


  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [40, 40, 40];
  }

  function duplicateInvoice(invoice: Invoice, userId: string) {
    if (!invoice.client?.id) {
      alert("Cannot duplicate invoice: Customer information is missing");
      return;
    }

    const newInvoiceId = id();
    const newLineItemIds = invoice.lineItems.map(() => id());

    const txs = [
      db.tx.invoices[newInvoiceId].update({
        invoiceNumber: `${invoice.invoiceNumber}-copy`,
        invoiceDate: new Date().toISOString().split('T')[0],
        orderNumber: invoice.orderNumber,
        paymentTerms: invoice.paymentTerms,
        dueDate: invoice.dueDate,
        subject: invoice.subject,
        status: "Unpaid",
        subtotal: invoice.subtotal,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        igst: invoice.igst,
        total: invoice.total,
        notes: invoice.notes,
        termsAndConditions: invoice.termsAndConditions,
        usageType: (invoice as any).usageType,
        usageOther: (invoice as any).usageOther,
        usageDuration: (invoice as any).usageDuration,
        usageGeography: (invoice as any).usageGeography,
        usageExclusivity: (invoice as any).usageExclusivity,
        advanceAmount: (invoice as any).advanceAmount,
        isAdvanceReceived: (invoice as any).isAdvanceReceived,
      }),
      db.tx.invoices[newInvoiceId].link({ client: invoice.client.id }),
      ...invoice.lineItems.map((li, i) =>
        db.tx.lineItems[newLineItemIds[i]].update({
          itemType: li.itemType,
          description: li.description,
          sacCode: li.sacCode,
          quantity: li.quantity,
          rate: li.rate,
          amount: li.amount,
        })
      ),
      db.tx.invoices[newInvoiceId].link({ lineItems: newLineItemIds }),
      db.tx.invoices[newInvoiceId].link({ owner: userId }),
    ];

    if ((invoice as any).business?.id) {
      txs.push(db.tx.invoices[newInvoiceId].link({ business: (invoice as any).business.id }));
    }

    db.transact(txs);
  }

  return (
    <div className="space-y-4">
      {/* Table for Desktop */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="py-4 px-6 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => onSort('business')}>
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Business / Inv #</span>
              </th>
              <th className="py-4 px-6 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => onSort('client')}>
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Customer</span>
              </th>
              <th className="py-4 px-6 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => onSort('dueDate')}>
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Due Date</span>
              </th>
              <th className="py-4 px-6 text-right">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Amount & Bal</span>
              </th>
              <th className="py-4 px-6 text-center">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Status</span>
              </th>
              <th className="py-4 px-6 text-center">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-600 font-bold uppercase text-xs">No invoices found</td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const client = clients.find((c) => c.id === invoice.client?.id);
                const displayName = client?.displayName || client?.firstName || "Unknown";
                const business = businesses.find(b => b.id === (invoice as any).business?.id);
                const total = calculateInvoiceTotal(invoice);
                const balance = calculatePendingBalance(invoice);
                const today = new Date().toISOString().split('T')[0];
                const isOverdue = invoice.status !== "Paid" && invoice.dueDate < today;
                const displayStatus = isOverdue ? "Overdue" : invoice.status;

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-10 rounded-full" style={{ backgroundColor: business?.color || "#e5e7eb" }}></span>
                        <div>
                          <div className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">{invoice.invoiceNumber}</div>
                          <div className="text-[9px] font-black text-gray-600 uppercase tracking-tight">{business?.name || "No Profile"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-gray-700">{displayName}</div>
                      {invoice.sentAt && <div className="text-[8px] font-black text-blue-500 uppercase">Sent {new Date(invoice.sentAt).toLocaleDateString()}</div>}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-xs font-mono ${isOverdue ? "text-red-600 font-bold" : "text-gray-600"}`}>{invoice.dueDate}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex flex-col items-end">
                        <div className="text-sm font-black text-gray-900">₹{total.toLocaleString("en-IN")}</div>
                        {balance > 0 && <div className="text-[9px] font-bold text-red-500 uppercase">Bal: ₹{balance.toLocaleString("en-IN")}</div>}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${displayStatus === "Paid" ? "bg-green-100 text-green-700" :
                        displayStatus === "Overdue" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{displayStatus}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => duplicateInvoice(invoice, userId)} className="text-gray-400 hover:text-blue-500 transition-colors" title="Duplicate">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                        </button>
                        <button onClick={() => onEdit(invoice)} className="text-gray-400 hover:text-gray-900 transition-colors" title="Edit">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onClick={() => downloadPDF(invoice)} className="text-gray-400 hover:text-red-500 transition-colors" title="Download PDF">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </button>
                        <button onClick={() => recordPayment(invoice)} className="text-gray-400 hover:text-green-500 transition-colors" title="Record Payment">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                        <button onClick={() => deleteInvoice(invoice)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Web Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
              Showing {invoices.length} of {totalCount} invoices
            </div>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Prev
                </button>
                <div className="flex items-center px-4 text-[10px] font-black text-gray-900 uppercase">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card List for Mobile */}
      <div className="md:hidden space-y-4">
        {mobileInvoices.length === 0 ? (
          <div className="p-12 text-center text-gray-600 font-bold uppercase text-xs">No invoices found</div>
        ) : (
          <>
            {mobileInvoices.map((invoice) => {
              const client = clients.find((c) => c.id === invoice.client?.id);
              const displayName = client?.displayName || client?.firstName || "Unknown";
              const business = businesses.find(b => b.id === (invoice as any).business?.id);
              const total = calculateInvoiceTotal(invoice);
              const balance = calculatePendingBalance(invoice);
              const today = new Date().toISOString().split('T')[0];
              const isOverdue = invoice.status !== "Paid" && invoice.dueDate < today;
              const displayStatus = isOverdue ? "Overdue" : invoice.status;

              return (
                <div key={invoice.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-6 rounded-full" style={{ backgroundColor: business?.color || "#e5e7eb" }}></span>
                      <span className="text-xs font-black text-gray-900 uppercase tracking-tighter">{invoice.invoiceNumber}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tight ${displayStatus === "Paid" ? "bg-green-100 text-green-700" :
                      displayStatus === "Overdue" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{displayStatus}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-gray-900">{displayName}</h4>
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{business?.name}</p>
                  </div>

                  <div className="flex justify-between items-end pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-[9px] font-black text-gray-900 uppercase mb-0.5">Total & Bal</p>
                      <div className="text-sm font-black text-gray-900">₹{total.toLocaleString("en-IN")}</div>
                      {balance > 0 && <div className="text-[9px] font-bold text-red-500">Bal: ₹{balance.toLocaleString("en-IN")}</div>}
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-900 uppercase mb-0.5">Due On</p>
                      <p className={`text-xs font-mono ${isOverdue ? "text-red-500 font-bold" : "text-gray-900"}`}>{invoice.dueDate}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 mt-3 pt-3">
                    <button onClick={() => downloadPDF(invoice)} className="flex-1 min-w-[30%] py-2 bg-gray-50 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-black text-gray-900 uppercase tracking-tighter hover:bg-gray-100 active:scale-95 transition-all outline-none">
                      PDF
                    </button>
                    <button onClick={() => onEdit(invoice)} className="flex-1 min-w-[30%] py-2 bg-gray-50 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-black text-gray-900 uppercase tracking-tighter hover:bg-gray-100 active:scale-95 transition-all outline-none">
                      Edit
                    </button>
                    <button onClick={() => recordPayment(invoice)} className="flex-1 min-w-[30%] py-2 bg-gray-50 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-black text-gray-900 uppercase tracking-tighter hover:bg-gray-100 active:scale-95 transition-all outline-none">
                      Pay
                    </button>
                    <button onClick={() => duplicateInvoice(invoice, userId)} className="flex-1 min-w-[45%] py-2 border border-gray-100 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-black text-gray-900 uppercase tracking-tighter hover:bg-gray-50 active:scale-95 transition-all">
                      Copy
                    </button>
                    <button onClick={() => deleteInvoice(invoice)} className="flex-1 min-w-[45%] py-2 bg-red-50 text-red-600 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-tighter hover:bg-red-100 active:scale-95 transition-all">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={onLoadMore}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-gray-200 active:scale-95 transition-all"
              >
                Load More ({totalCount - mobileInvoices.length} remaining)
              </button>
            )}

            {!hasMore && totalCount > 0 && (
              <div className="py-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                End of list • {totalCount} total
              </div>
            )}
          </>
        )}
      </div>
    </div >
  );
}

export function InvoiceModal({
  invoice,
  clients,
  businesses,
  userId,
  activeBusinessId,
  services,
  taxes,
  termsTemplates,
  onClose,
  invoices: allInvoices,
}: {
  invoice: Invoice | null;
  clients: Client[];
  businesses: Business[];
  userId: string;
  activeBusinessId: string;
  services: Service[];
  taxes: Tax[];
  termsTemplates: TermsTemplate[];
  onClose: () => void;
  invoices: Invoice[];
}) {
  const activeServices = services.filter(s => s.isActive);
  const defaultTerms = termsTemplates.find(t => t.isDefault);

  const [formData, setFormData] = useState(() => {
    if (invoice) {
      return {
        ...invoice,
        lineItems: invoice.lineItems.map((li) => ({ ...li })),
        client: invoice.client || { id: "" },
        business: (invoice as any).business || { id: "" },
        advanceAmount: (invoice as any).advanceAmount || 0,
        isAdvanceReceived: (invoice as any).isAdvanceReceived || false,
        tdsDeducted: (invoice as any).tdsDeducted || false,
        tdsAmount: (invoice as any).tdsAmount || 0,
      };
    }

    const preSelectedBusinessId = activeBusinessId !== "ALL" ? activeBusinessId : (businesses[0]?.id || "");
    const preSelectedBusiness = businesses.find(b => b.id === preSelectedBusinessId);
    const defaultAccount = preSelectedBusiness?.bankAccounts?.find(a => a.isActive) || preSelectedBusiness?.bankAccounts?.[0];

    return {
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      orderNumber: "",
      paymentTerms: "",
      dueDate: "",
      subject: "",
      status: "Unpaid",
      client: { id: "" },
      business: { id: preSelectedBusinessId },
      bankAccount: { id: defaultAccount?.id || "" },
      lineItems: [{ itemType: "custom", description: "", sacCode: "", quantity: 1, rate: 0, amount: 0 }],
      subtotal: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
      notes: "",
      termsAndConditions: defaultTerms?.content || "",
      usageType: "",
      usageOther: "",
      usageDuration: "",
      usageGeography: "",
      usageExclusivity: "",
      advanceAmount: 0,
      isAdvanceReceived: false,
      tdsDeducted: false,
      tdsAmount: 0,
    };
  });

  const [isUploading, setIsUploading] = useState(false);

  const [modalTab, setModalTab] = useState<"general" | "usage">("general");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [taxType, setTaxType] = useState<"intrastate" | "interstate">(
    invoice && invoice.igst && invoice.igst > 0 ? "interstate" : "intrastate"
  );
  const [cgstRate, setCgstRate] = useState(9);
  const [sgstRate, setSgstRate] = useState(9);
  const [igstRate, setIgstRate] = useState(18);

  // Auto-calculate due date when invoice date or payment terms change
  React.useEffect(() => {
    if (formData.invoiceDate && formData.paymentTerms && formData.client?.id) {
      const selectedClient = clients.find(c => c.id === formData.client?.id);
      const customDays = (selectedClient as any)?.customTermDays;
      const dueDate = calculateDueDate(formData.invoiceDate, formData.paymentTerms, customDays);
      setFormData((prev: any) => ({ ...prev, dueDate }));
    }
  }, [formData.invoiceDate, formData.paymentTerms, formData.client?.id, clients]);

  // Auto-generate invoice number when business changes (for new invoices)
  React.useEffect(() => {
    if (!invoice && formData.business?.id) {
      const selectedBusiness = businesses.find(b => b.id === formData.business.id);
      if (selectedBusiness) {
        const nextNumber = generateNextInvoiceNumber(selectedBusiness as any, allInvoices as any);
        setFormData((prev: any) => ({ ...prev, invoiceNumber: nextNumber }));
      }
    }
  }, [formData.business?.id, invoice, businesses, allInvoices]);

  // Calculate totals
  React.useEffect(() => {
    const subtotal = formData.lineItems.reduce(
      (sum: number, li: any) => sum + (Number(li.quantity) * Number(li.rate)),
      0
    );

    let cgst = 0, sgst = 0, igst = 0;
    if (taxType === "intrastate") {
      cgst = (subtotal * cgstRate) / 100;
      sgst = (subtotal * sgstRate) / 100;
    } else {
      igst = (subtotal * igstRate) / 100;
    }

    const total = subtotal + cgst + sgst + igst;

    setFormData((prev: any) => ({
      ...prev,
      subtotal,
      cgst,
      sgst,
      igst,
      total,
    }));
  }, [formData.lineItems, taxType, cgstRate, sgstRate, igstRate]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev: any) => ({ ...prev, [name]: val }));
  }

  function handleClientChange(clientId: string) {
    if (clientId === "add_new") {
      setIsCustomerModalOpen(true);
      return;
    }
    const client = clients.find(c => c.id === clientId);
    const paymentTerms = client?.paymentTerms || "net_30";

    setFormData((prev: any) => ({
      ...prev,
      client: { id: clientId },
      paymentTerms,
    }));
  }

  function handleLineItemChange(index: number, field: string, value: any) {
    const lineItems = [...formData.lineItems];
    lineItems[index] = { ...lineItems[index], [field]: value };

    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate') {
      const qty = field === 'quantity' ? Number(value) : Number(lineItems[index].quantity);
      const rate = field === 'rate' ? Number(value) : Number(lineItems[index].rate);
      lineItems[index].amount = qty * rate;
    }

    setFormData((prev: any) => ({ ...prev, lineItems }));
  }

  function addServiceLineItem(serviceId: string) {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const newLineItem = {
      itemType: "service",
      description: service.name,
      sacCode: service.sacCode || "",
      quantity: 1,
      rate: service.rate,
      amount: service.rate,
      serviceId,
    };

    setFormData((prev: any) => ({
      ...prev,
      lineItems: [...prev.lineItems, newLineItem],
    }));
  }

  function addCustomLineItem() {
    setFormData((prev: any) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { itemType: "custom", description: "", sacCode: "", quantity: 1, rate: 0, amount: 0 },
      ],
    }));
  }

  function removeLineItem(index: number) {
    if (formData.lineItems.length === 1) {
      alert("Invoice must have at least one line item");
      return;
    }

    const lineItems = [...formData.lineItems];
    lineItems.splice(index, 1);
    setFormData((prev: any) => ({ ...prev, lineItems }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.client?.id) {
      alert("Please select a customer");
      return;
    }

    if (!formData.business?.id) {
      alert("Please select a business profile");
      return;
    }

    if (!formData.invoiceNumber) {
      alert("Please enter an invoice number");
      return;
    }

    setIsUploading(true);
    try {
      const { lineItems, ...invoiceData } = formData;
      const invoiceId = invoice ? invoice.id : id();
      const lineItemIds = (lineItems as any[]).map((li: any) => li.id || id());

      const isNew = !invoice;
      const txs = [
        db.tx.invoices[invoiceId].update({
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: invoiceData.invoiceDate,
          orderNumber: invoiceData.orderNumber || undefined,
          paymentTerms: invoiceData.paymentTerms || undefined,
          dueDate: invoiceData.dueDate,
          subject: invoiceData.subject || undefined,
          status: invoiceData.status,
          subtotal: Number(invoiceData.subtotal),
          cgst: taxType === "intrastate" ? Number(invoiceData.cgst) : undefined,
          sgst: taxType === "intrastate" ? Number(invoiceData.sgst) : undefined,
          igst: taxType === "interstate" ? Number(invoiceData.igst) : undefined,
          total: Number(invoiceData.total),
          notes: invoiceData.notes || undefined,
          termsAndConditions: invoiceData.termsAndConditions || undefined,
          usageType: invoiceData.usageType || undefined,
          usageOther: invoiceData.usageOther || undefined,
          usageDuration: invoiceData.usageDuration || undefined,
          usageGeography: invoiceData.usageGeography || undefined,
          usageExclusivity: invoiceData.usageExclusivity || undefined,
          advanceAmount: Number(invoiceData.advanceAmount),
          isAdvanceReceived: !!invoiceData.isAdvanceReceived,
          tdsDeducted: !!formData.tdsDeducted,
          tdsAmount: Number(formData.tdsAmount),
        }),
        db.tx.invoices[invoiceId].link({ client: formData.client.id }),
        db.tx.invoices[invoiceId].link({ business: formData.business.id }),
        db.tx.clients[formData.client.id].link({ business: formData.business.id }),
        ...(formData.bankAccount?.id ? [db.tx.invoices[invoiceId].link({ bankAccount: formData.bankAccount.id })] : []),
        ...(lineItems as any[]).map((li: any, i: number) =>
          db.tx.lineItems[lineItemIds[i]].update({
            itemType: li.itemType || undefined,
            description: li.description,
            sacCode: li.sacCode || undefined,
            quantity: Number(li.quantity),
            rate: Number(li.rate),
            amount: Number(li.amount),
          })
        ),
        db.tx.invoices[invoiceId].link({ lineItems: lineItemIds }),
      ];

      // Link owner for new invoices
      if (isNew) {
        txs.push(db.tx.invoices[invoiceId].link({ owner: userId }));
      }

      db.transact(txs);
      onClose();
    } catch (error) {
      console.error("Failed to save invoice:", error);
      alert("Failed to save invoice. Please check your connection.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[95vh] flex flex-col">
        <div className="bg-white border-b px-6 pt-6 rounded-t-lg flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {invoice ? "Edit Invoice" : "Create New Invoice"}
            </h2>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <nav className="-mb-px flex space-x-8 min-w-max px-1">
              <button
                onClick={() => setModalTab("general")}
                className={`${modalTab === "general"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                General & Items
              </button>
              <button
                onClick={() => setModalTab("usage")}
                className={`${modalTab === "usage"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                Usage Rights & Licensing
              </button>
            </nav>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6">
            {modalTab === "general" ? (
              <>
                {/* Business & Account Selection */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black mb-2 uppercase text-gray-400 tracking-[0.2em]">
                      Business Profile <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="business"
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-gray-900 transition-all appearance-none"
                      value={formData.business?.id || ""}
                      onChange={(e) => {
                        const bId = e.target.value;
                        const biz = businesses.find(b => b.id === bId);
                        setFormData((prev: any) => ({
                          ...prev,
                          business: { id: bId },
                          bankAccount: { id: biz?.bankAccounts?.find(a => a.isActive)?.id || biz?.bankAccounts?.[0]?.id || "" }
                        }));
                      }}
                      required
                    >
                      <option value="">Select Profile</option>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black mb-2 uppercase text-gray-400 tracking-[0.2em]">
                      Payment Account
                    </label>
                    <select
                      name="bankAccount"
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-gray-900 transition-all appearance-none"
                      value={formData.bankAccount?.id || ""}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, bankAccount: { id: e.target.value } }))}
                    >
                      <option value="">No Account</option>
                      {businesses.find(b => b.id === formData.business?.id)?.bankAccounts?.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.label} - {acc.bankName} (..{acc.accountNumber?.slice(-4)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                        Invoice # <span className="text-red-500">*</span>
                      </label>
                      {!invoice && (
                        <button
                          type="button"
                          onClick={() => {
                            const biz = businesses.find(b => b.id === formData.business?.id);
                            if (biz) {
                              const nextNum = generateNextInvoiceNumber(biz as any, allInvoices as any);
                              setFormData((prev: any) => ({ ...prev, invoiceNumber: nextNum }));
                            }
                          }}
                          className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700"
                        >
                          Auto-Generate
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      name="invoiceNumber"
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-gray-900 outline-none focus:border-gray-900"
                      value={formData.invoiceNumber}
                      onChange={handleChange}
                      placeholder="INV-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black mb-2 uppercase text-gray-400 tracking-[0.2em]">Status</label>
                    <select
                      name="status"
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-gray-900 transition-all appearance-none"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Sent">Sent</option>
                      <option value="Paid">Paid</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>

                  {/* Account Details Preview Banner */}
                  {formData.bankAccount?.id && (
                    <div className="md:col-span-4 bg-white/50 rounded-2xl border border-gray-100 p-4 mt-2 flex flex-wrap gap-x-8 gap-y-4 items-center">
                      {(() => {
                        const acc = businesses.find(b => b.id === formData.business?.id)?.bankAccounts?.find(a => a.id === formData.bankAccount?.id);
                        if (!acc) return null;
                        return (
                          <>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Bank Name</span>
                              <span className="text-[10px] font-black text-gray-900 uppercase">{acc.bankName}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Account Number</span>
                              <span className="text-[10px] font-black text-gray-900">{acc.accountNumber}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">IFSC</span>
                              <span className="text-[10px] font-black text-gray-900 uppercase">{acc.ifsc}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Holder</span>
                              <span className="text-[10px] font-black text-gray-900 uppercase">{acc.holderName}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Order Number</label>
                    <input
                      type="text"
                      name="orderNumber"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                      value={formData.orderNumber}
                      onChange={handleChange}
                      placeholder="PO-001"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Invoice Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="invoiceDate"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                      value={formData.invoiceDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Payment Terms</label>
                    <select
                      name="paymentTerms"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all appearance-none"
                      value={formData.paymentTerms}
                      onChange={handleChange}
                    >
                      <option value="">Select Terms</option>
                      {PAYMENT_TERMS.map((term) => (
                        <option key={term.value} value={term.value}>
                          {term.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                      value={formData.dueDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
                      Customer Profile <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all appearance-none shadow-sm"
                      value={formData.client?.id || ""}
                      onChange={(e) => handleClientChange(e.target.value)}
                      required
                    >
                      <option value="">Select Customer</option>
                      <option value="add_new" className="font-bold text-blue-600">+ Add New Customer</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.displayName || client.firstName || "Unnamed"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Subject / Project Title</label>
                    <input
                      type="text"
                      name="subject"
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all shadow-sm"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="e.g., Photography services for Wedding Shoot"
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50 mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 leading-none">Line Items</h3>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {activeServices.length > 0 && (
                        <select
                          className="w-full sm:w-auto border-2 border-gray-300 p-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white h-11 active:scale-[0.98] transition-all"
                          onChange={(e) => {
                            if (e.target.value) {
                              addServiceLineItem(e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">+ Add Service</option>
                          {activeServices.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} - ₹{service.rate}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={addCustomLineItem}
                        className="w-full sm:w-auto px-4 py-2 border-2 border-gray-900 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 h-11"
                      >
                        + Custom Item
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {formData.lineItems.map((item: any, index: number) => (
                      <div key={index} className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm md:grid md:grid-cols-12 md:items-center md:p-2 md:gap-2">
                        <div className="md:col-span-4">
                          <label className="md:hidden block text-[9px] font-black text-gray-600 uppercase mb-1">Description</label>
                          <input
                            type="text"
                            className="border p-2 rounded-md w-full text-sm md:text-sm"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            placeholder="e.g. Headshot Session"
                            required
                          />
                        </div>
                        <div className="flex gap-2 md:contents">
                          <div className="flex-1 md:col-span-2">
                            <label className="md:hidden block text-[9px] font-black text-gray-600 uppercase mb-1">SAC</label>
                            <input
                              type="text"
                              className="border p-2 rounded-md w-full text-sm"
                              value={item.sacCode || ""}
                              onChange={(e) => handleLineItemChange(index, 'sacCode', e.target.value)}
                              placeholder="998311"
                            />
                          </div>
                          <div className="flex-1 md:col-span-2">
                            <label className="md:hidden block text-[9px] font-black text-gray-600 uppercase mb-1">Qty</label>
                            <input
                              type="number"
                              className="border p-2 rounded-md w-full text-sm text-right"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex items-end gap-2 md:contents">
                          <div className="flex-1 md:col-span-2">
                            <label className="md:hidden block text-[9px] font-black text-gray-600 uppercase mb-1">Rate</label>
                            <input
                              type="number"
                              className="border p-2 rounded-md w-full text-sm text-right font-bold"
                              value={item.rate}
                              onChange={(e) => handleLineItemChange(index, 'rate', e.target.value)}
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          <div className="flex-1 md:col-span-1 text-right md:text-center flex flex-col justify-center">
                            <label className="md:hidden block text-[9px] font-black text-gray-600 uppercase mb-1">Total</label>
                            <div className="text-sm font-black text-gray-900 md:font-bold">
                              ₹{item.amount?.toLocaleString('en-IN') || '0'}
                            </div>
                          </div>
                          <div className="md:col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 md:bg-transparent md:text-red-400 md:p-0 md:hover:text-red-600"
                            >
                              <span className="md:hidden text-[10px] font-black uppercase">Remove</span>
                              <span className="hidden md:inline text-xl">✕</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 uppercase text-gray-600">Tax Configuration</h4>
                      <div className="space-y-2">
                        <select
                          className="border p-2 rounded-md w-full"
                          value={taxType}
                          onChange={(e) => setTaxType(e.target.value as any)}
                        >
                          <option value="intrastate">Intra-State (CGST + SGST)</option>
                          <option value="interstate">Inter-State (IGST)</option>
                        </select>

                        {taxType === "intrastate" ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-600">CGST %</span>
                              <input
                                type="number"
                                className="border p-2 rounded-md w-full text-right"
                                value={cgstRate}
                                onChange={(e) => setCgstRate(Number(e.target.value))}
                                step="0.01"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-600">SGST %</span>
                              <input
                                type="number"
                                className="border p-2 rounded-md w-full text-right"
                                value={sgstRate}
                                onChange={(e) => setSgstRate(Number(e.target.value))}
                                step="0.01"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600">IGST %</span>
                            <input
                              type="number"
                              className="border p-2 rounded-md w-full text-right"
                              value={igstRate}
                              onChange={(e) => setIgstRate(Number(e.target.value))}
                              step="0.01"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-bold mb-2 uppercase text-yellow-800">Recording Advance</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="isAdvanceReceived"
                            name="isAdvanceReceived"
                            checked={formData.isAdvanceReceived}
                            onChange={handleChange}
                            className="w-4 h-4"
                          />
                          <label htmlFor="isAdvanceReceived" className="text-sm font-bold text-yellow-900">Advance Payment Received?</label>
                        </div>
                        {formData.isAdvanceReceived && (
                          <div>
                            <label className="block text-xs font-bold mb-1 text-yellow-700">Advance Amount (INR)</label>
                            <input
                              type="number"
                              name="advanceAmount"
                              value={formData.advanceAmount}
                              onChange={handleChange}
                              className="border-2 border-yellow-300 p-2 rounded-md w-full bg-white font-bold"
                              placeholder="0.00"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-bold mb-2 uppercase text-blue-800 italic">Taxation Note</h4>
                      <p className="text-xs font-bold text-blue-900 leading-relaxed uppercase tabular-nums">
                        TDS may be deducted by client as applicable at the time of payment.
                        This does not reduce your invoice value or income.
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-gray-50 space-y-3">
                    <h4 className="text-sm font-bold mb-2 uppercase text-gray-600">Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 tracking-wide uppercase text-[11px] font-bold">Subtotal</span>
                        <span className="font-mono">₹{formData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {taxType === "intrastate" ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 tracking-wide uppercase text-[11px] font-bold">CGST ({cgstRate}%)</span>
                            <span className="font-mono">₹{formData.cgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 tracking-wide uppercase text-[11px] font-bold">SGST ({sgstRate}%)</span>
                            <span className="font-mono">₹{formData.sgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-gray-600 tracking-wide uppercase text-[11px] font-bold">IGST ({igstRate}%)</span>
                          <span className="font-mono">₹{formData.igst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-black text-xl pt-3 border-t-2 border-gray-200">
                        <span className="uppercase tracking-tighter">Gross Total</span>
                        <span className="text-gray-900">₹{formData.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>

                      {((Number(formData.advanceAmount) > 0) || ((invoice as any)?.tdsAmount > 0)) && (
                        <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                          <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Settlement Details</h5>

                          {Number(formData.advanceAmount) > 0 && (
                            <div className="flex justify-between text-green-800 font-bold">
                              <span className="uppercase text-[11px]">
                                {formData.status === "Paid" ? "Cash Received" : "Advance Received"}
                                {(invoice as any)?.paidAt && (
                                  <span className="text-[9px] text-gray-400 lowercase ml-1 font-normal italic">
                                    (Settled {new Date((invoice as any).paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                                  </span>
                                )}
                              </span>
                              <span className="font-mono">
                                - ₹{Number(formData.advanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {((invoice as any).tdsAmount > 0) && (
                            <div className="flex justify-between text-blue-700 font-bold italic">
                              <span className="uppercase text-[11px]">Tax Withheld (TDS)</span>
                              <span className="font-mono">
                                - ₹{Number((invoice as any).tdsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {(() => {
                            const netBalance = formData.total - Number(formData.advanceAmount) - Number((invoice as any).tdsAmount);
                            if (netBalance > 1) { // ₹1 margin for rounding
                              return (
                                <div className="flex justify-between text-red-600 font-black text-lg pt-3 border-t border-dashed border-gray-200 mt-2">
                                  <span className="uppercase text-[12px] tracking-tight">Net Balance Due</span>
                                  <span className="font-mono">₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                              );
                            } else if (formData.status === "Paid") {
                              return (
                                <div className="flex justify-center items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 mt-2">
                                  <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                  <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Fully Settled</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 uppercase text-gray-600 text-[11px] font-bold">Internal Notes</label>
                  <textarea
                    name="notes"
                    className="border p-2 rounded-md w-full bg-white text-sm"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Visible only to you"
                    rows={2}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium uppercase text-gray-600 text-[11px] font-bold">Terms & Conditions</label>
                    {termsTemplates.length > 0 && (
                      <select
                        className="text-[10px] border p-1 rounded font-bold uppercase"
                        onChange={(e) => {
                          const template = termsTemplates.find(t => t.id === e.target.value);
                          if (template) {
                            setFormData((prev: any) => ({ ...prev, termsAndConditions: template.content }));
                          }
                        }}
                      >
                        <option value="">Load Template</option>
                        {termsTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <textarea
                    name="termsAndConditions"
                    className="border p-2 rounded-md w-full font-mono text-[11px] leading-relaxed"
                    value={formData.termsAndConditions}
                    onChange={handleChange}
                    placeholder="Visible to customer"
                    rows={4}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 uppercase text-gray-600 text-[11px] font-bold">Usage Type</label>
                      <select
                        name="usageType"
                        className="border p-2 rounded-md w-full"
                        value={formData.usageType}
                        onChange={handleChange}
                      >
                        <option value="">Select Type</option>
                        <option value="Editorial">Editorial</option>
                        <option value="Social media">Social media</option>
                        <option value="Website">Website</option>
                        <option value="Print">Print</option>
                        <option value="Commercial / Ads">Commercial / Ads</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {formData.usageType === "Other" && (
                      <div>
                        <label className="block text-sm font-medium mb-1 uppercase text-gray-600 text-[11px] font-bold">Usage Description</label>
                        <input
                          type="text"
                          name="usageOther"
                          className="border p-2 rounded-md w-full"
                          value={formData.usageOther}
                          onChange={handleChange}
                          placeholder="Describe specific usage rights"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1 uppercase text-gray-600 text-[11px] font-bold">Duration</label>
                      <select
                        name="usageDuration"
                        className="border p-2 rounded-md w-full"
                        value={formData.usageDuration}
                        onChange={handleChange}
                      >
                        <option value="">Select Duration</option>
                        <option value="3 months">3 months</option>
                        <option value="1 year">1 year</option>
                        <option value="perpetual">perpetual</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 uppercase text-gray-600 text-[11px] font-bold">Geography</label>
                      <select
                        name="usageGeography"
                        className="border p-2 rounded-md w-full"
                        value={formData.usageGeography}
                        onChange={handleChange}
                      >
                        <option value="">Select Geography</option>
                        <option value="India">India</option>
                        <option value="Global">Global</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 uppercase text-gray-600 text-[11px] font-bold">Exclusivity</label>
                      <select
                        name="usageExclusivity"
                        className="border p-2 rounded-md w-full"
                        value={formData.usageExclusivity}
                        onChange={handleChange}
                      >
                        <option value="">Select Option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                  <h4 className="text-blue-900 font-black mb-3 text-lg uppercase tracking-tight">Understanding Usage Rights</h4>
                  <p className="text-sm text-blue-800 leading-relaxed mb-4">
                    Usage rights define how your client can consume the intellectual property (photographs/videos) you deliver.
                    Misunderstandings here often lead to legal disputes or lost revenue.
                  </p>
                  <ul className="text-sm text-blue-800 space-y-2 font-medium">
                    <li>• <strong className="text-blue-900">Geography:</strong> Restrict usage to specific regions if necessary.</li>
                    <li>• <strong className="text-blue-900">Duration:</strong> Limit how long the assets can be used before license renewal.</li>
                    <li>• <strong className="text-blue-900">Exclusivity:</strong> Decides if you can sell/re-use these images for other clients.</li>
                  </ul>
                </div>
              </div>
            )
            }
          </form >
        </div >

        <div className="bg-gray-100 border-t p-6 rounded-b-lg flex justify-between items-center flex-shrink-0">
          <div className="text-sm font-bold text-gray-600 uppercase tracking-widest italic">
            {formData.invoiceNumber || "Draft Invoice"}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2 border-2 border-gray-300 font-bold uppercase text-xs rounded-md hover:bg-gray-200"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="invoice-form"
              className="px-10 py-2 bg-gray-900 text-white font-bold uppercase text-xs rounded-md hover:bg-black transition-all shadow-lg disabled:opacity-50"
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : (invoice ? "Update" : "Create")} Invoice
            </button>
          </div>
        </div>

        {
          isCustomerModalOpen && (
            <CustomerModal
              client={null}
              userId={userId}
              activeBusinessId={formData.business?.id || activeBusinessId}
              onClose={() => setIsCustomerModalOpen(false)}
              onSuccess={(clientId) => {
                handleClientChange(clientId);
                setIsCustomerModalOpen(false);
              }}
            />
          )
        }
      </div >
    </div >
  );
}
