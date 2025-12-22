import { useState } from "react";
import React from "react";
import { db } from "@/lib/db";
import { id, InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import { Business } from "@/app/page";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CustomerModal } from "./Customers";

export type Client = InstaQLEntity<AppSchema, "clients"> & { invoices?: Invoice[] };
export type Invoice = InstaQLEntity<AppSchema, "invoices"> & {
  client?: Client;
  lineItems: LineItem[];
  business?: Business;
};
export type LineItem = InstaQLEntity<AppSchema, "lineItems">;

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
  return total - advance;
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
  initiallyOpenModal?: boolean;
  onModalClose?: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    if (initiallyOpenModal) {
      setIsModalOpen(true);
    }
  }, [initiallyOpenModal]);

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

    return clientName.toLowerCase().includes(term) ||
      invoiceNumber.includes(term) ||
      orderNumber.includes(term);
  });

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
    <div className="space-y-16 py-12">
      {/* Editorial Header */}
      <section className="flex flex-col md:flex-row justify-between items-end gap-8 pb-12 border-b border-border-subtle">
        <div className="max-w-2xl">
          <h2 className="text-6xl font-serif text-foreground tracking-tighter mb-4">The Ledger</h2>
          <p className="text-muted text-sm uppercase tracking-[0.2em] leading-relaxed">
            A record of all your invoices, payments, and settlements. <br />
            Refinement in every transaction.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-foreground border border-foreground px-12 py-3 rounded-full hover:bg-foreground hover:text-background transition-all"
        >
          Issue Invoice
        </button>
      </section>

      {/* Narrative Filters */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-4">
          <label className="text-[9px] text-muted font-sans font-black uppercase tracking-[0.3em]">Query Records</label>
          <input
            type="text"
            placeholder="NAME / INVOICE #"
            className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle focus:border-foreground py-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-4">
          <label className="text-[9px] text-muted font-sans font-black uppercase tracking-[0.3em]">Profile Filter</label>
          <select
            className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle focus:border-foreground py-2 bg-transparent"
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
          >
            <option value="all">ALL PROFILES</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="space-y-4">
          <label className="text-[9px] text-muted font-sans font-black uppercase tracking-[0.3em]">Invoice Status</label>
          <select
            className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle focus:border-foreground py-2 bg-transparent"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">ALL STATUTES</option>
            <option value="Paid">SETTLED</option>
            <option value="Unpaid">UNSETTLED</option>
            <option value="Sent">MANIFESTED</option>
            <option value="Partially Paid">PARTIALLY PAID</option>
            <option value="Overdue">PAST MATURITY</option>
          </select>
        </div>
      </section>

      <InvoiceTable
        invoices={sortedInvoices as any}
        clients={clients}
        businesses={businesses}
        onEdit={openModal}
        userId={userId}
        onSort={handleSort}
      />

      {isModalOpen && (
        <InvoiceModal
          invoice={editingInvoice as any}
          clients={clients}
          businesses={businesses}
          userId={userId}
          services={services || []}
          taxes={taxes || []}
          termsTemplates={termsTemplates || []}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function InvoiceTable({
  invoices,
  clients,
  businesses,
  onEdit,
  userId,
  onSort,
}: {
  invoices: Invoice[];
  clients: Client[];
  businesses: Business[];
  onEdit: (invoice: Invoice) => void;
  userId: string;
  onSort: (key: string) => void;
}) {
  function deleteInvoice(invoice: Invoice) {
    if (confirm("Are you sure you want to delete this invoice?")) {
      const txs = [
        ...invoice.lineItems.map((li) => db.tx.lineItems[li.id].delete()),
        db.tx.invoices[invoice.id].delete(),
      ];
      db.transact(txs);
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
    const currentPaid = (invoice as any).advanceAmount || 0;
    const balance = (invoice.total || 0) - currentPaid;
    const amount = prompt(`Enter payment amount received (Balance: ₹${balance.toLocaleString()}):`, balance.toString());

    if (amount !== null) {
      const val = parseFloat(amount);
      if (!isNaN(val)) {
        const newTotalPaid = currentPaid + val;
        let newStatus = invoice.status;

        if (newTotalPaid >= (invoice.total || 0)) {
          newStatus = "Paid";
        } else if (newTotalPaid > 0) {
          newStatus = "Partially Paid";
        }

        db.transact(
          db.tx.invoices[invoice.id].update({
            advanceAmount: newTotalPaid,
            isAdvanceReceived: true,
            status: newStatus,
          })
        );
      }
    }
  }

  function downloadPDF(invoice: Invoice) {
    const client = clients.find(c => c.id === invoice.client?.id);
    const business = businesses.find(b => b.id === (invoice as any).business?.id);

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
    const bizName = business?.name || "MSP Productions";
    doc.text(bizName, pageWidth - 20, 25, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    let bizY = 30;
    if (business?.address) {
      const addrLines = business.address.split(/[,|\n]/).map(l => l.trim().toUpperCase()).filter(l => l);
      addrLines.forEach(line => {
        doc.text(line, pageWidth - 20, bizY, { align: "right" });
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

    // Horizontal Divider
    const headerEnd = Math.max(bizY, 35);
    doc.setDrawColor(230);
    doc.setLineWidth(0.5);
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

    // Amount Due Highlight Box
    doc.setFillColor(245, 247, 249);
    doc.rect(pageWidth - 85, currentY + 22, 65, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("Amount Due:", pageWidth - 80, currentY + 28.5);
    doc.text(`Rs. ${calculatePendingBalance(invoice).toLocaleString('en-IN')}`, pageWidth - 22, currentY + 28.5, { align: "right" });

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
        fillColor: [60, 60, 60],
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
      doc.setFillColor(30, 30, 30);
      doc.rect(totLabelX - 25, ty - 6, totValX - totLabelX + 30, 10, 'F');
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.text("BALANCE DUE:", totLabelX, ty, { align: "right" });
      doc.text(`Rs. ${calculatePendingBalance(invoice).toLocaleString('en-IN')}`, totValX, ty, { align: "right" });
    }

    // 5. Footer (Notes & Terms)
    let footerY = Math.max(ty + 20, (doc as any).lastAutoTable.finalY + 30);
    if (footerY > 240) {
      doc.addPage();
      footerY = 20;
    }

    // Notes
    if (invoice.notes) {
      doc.setTextColor(150);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("NOTES", 20, footerY);
      doc.setTextColor(50);
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(invoice.notes, 100);
      doc.text(splitNotes, 20, footerY + 5);
      footerY += (splitNotes.length * 4) + 12;
    }

    // Terms
    if (invoice.termsAndConditions) {
      doc.setTextColor(150);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS & CONDITIONS", 20, footerY);
      doc.setTextColor(50);
      doc.setFont("helvetica", "normal");
      const splitTerms = doc.splitTextToSize(invoice.termsAndConditions, 170);
      doc.text(splitTerms, 20, footerY + 5);
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
      <div className="hidden md:block overflow-x-auto bg-[#FAF9F7]">
        <table className="min-w-full border-separate border-spacing-y-4">
          <thead>
            <tr className="text-left">
              <th className="pb-6 px-4 cursor-pointer" onClick={() => onSort('business')}>
                <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.3em]">Record</span>
              </th>
              <th className="pb-6 px-4 cursor-pointer" onClick={() => onSort('client')}>
                <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.3em]">Customer</span>
              </th>
              <th className="pb-6 px-4 cursor-pointer" onClick={() => onSort('dueDate')}>
                <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.3em]">Maturity</span>
              </th>
              <th className="pb-6 px-4 text-right">
                <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.3em]">Valuation</span>
              </th>
              <th className="pb-6 px-4 text-center">
                <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.3em]">Status</span>
              </th>
              <th className="pb-6 px-4 text-right">
                <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.3em]">Directives</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-24 text-center text-muted font-serif italic text-xl">No invoices found.</td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const client = clients.find((c) => c.id === invoice.client?.id);
                const business = businesses.find(b => b.id === (invoice as any).business?.id);
                const total = calculateInvoiceTotal(invoice);
                const balance = calculatePendingBalance(invoice);
                const today = new Date().toISOString().split('T')[0];
                const isOverdue = invoice.status !== "Paid" && invoice.dueDate < today;
                const displayStatus = isOverdue ? "Overdue" : invoice.status;

                return (
                  <tr key={invoice.id} className="group transition-all hover:bg-white/50">
                    <td className="py-8 px-4 border-b border-border-subtle">
                      <div className="text-xl font-serif tracking-tighter text-foreground group-hover:text-accent transition-colors">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-[9px] font-sans font-black text-muted uppercase tracking-widest mt-1">
                        {business?.name || "PERSONAL LEDGER"}
                      </div>
                    </td>
                    <td className="py-8 px-4 border-b border-border-subtle">
                      <div className="text-sm font-sans font-black tracking-widest uppercase text-foreground">
                        {client?.displayName || client?.firstName || "ANONYMOUS"}
                      </div>
                      {invoice.sentAt && <div className="text-[8px] font-sans font-black text-accent uppercase mt-1">SENT {new Date(invoice.sentAt).toLocaleDateString()}</div>}
                    </td>
                    <td className="py-8 px-4 border-b border-border-subtle">
                      <span className={`text-xs font-serif ${isOverdue ? "text-status-overdue" : "text-muted"}`}>
                        {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="py-8 px-4 text-right border-b border-border-subtle">
                      <div className="text-2xl font-serif tracking-tighter text-foreground">₹{total.toLocaleString("en-IN")}</div>
                      {balance > 0 && <div className="text-[9px] font-sans font-black text-status-overdue uppercase tracking-widest mt-1">BAL: ₹{balance.toLocaleString("en-IN")}</div>}
                    </td>
                    <td className="py-8 px-4 text-center border-b border-border-subtle">
                      <span className={`text-[9px] font-sans font-black uppercase tracking-[0.2em] ${displayStatus === "Paid" ? "text-status-paid" :
                        displayStatus === "Overdue" ? "text-status-overdue" :
                          "text-status-pending"
                        }`}>{displayStatus}</span>
                    </td>
                    <td className="py-8 px-4 border-b border-border-subtle">
                      <div className="flex justify-end gap-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => downloadPDF(invoice)} className="text-muted hover:text-foreground">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </button>
                        <button onClick={() => onEdit(invoice)} className="text-muted hover:text-foreground">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onClick={() => recordPayment(invoice)} className="text-muted hover:text-foreground">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Card List for Mobile */}
      <div className="md:hidden space-y-12">
        {invoices.length === 0 ? (
          <p className="py-12 text-center text-muted font-serif italic">No invoices found.</p>
        ) : (
          invoices.map((invoice) => {
            const client = clients.find((c) => c.id === invoice.client?.id);
            const business = businesses.find(b => b.id === (invoice as any).business?.id);
            const total = calculateInvoiceTotal(invoice);
            const balance = calculatePendingBalance(invoice);
            const today = new Date().toISOString().split('T')[0];
            const isOverdue = invoice.status !== "Paid" && invoice.dueDate < today;
            const displayStatus = isOverdue ? "Overdue" : invoice.status;

            return (
              <div key={invoice.id} className="space-y-6 pb-12 border-b border-border-subtle last:border-0" onClick={() => onEdit(invoice)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-4xl font-serif tracking-tighter text-foreground mb-1">{invoice.invoiceNumber}</h3>
                    <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.2em]">{business?.name || "MSP"}</p>
                  </div>
                  <span className={`text-[9px] font-sans font-black uppercase tracking-widest ${displayStatus === "Paid" ? "text-status-paid" :
                    displayStatus === "Overdue" ? "text-status-overdue" :
                      "text-status-pending"
                    }`}>{displayStatus}</span>
                </div>

                <div>
                  <p className="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-2">Customer</p>
                  <p className="text-lg font-serif tracking-tight">{client?.displayName || "Anonymous"}</p>
                </div>

                <div className="grid grid-cols-2 gap-12 pt-4">
                  <div>
                    <p className="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-2">Valuation</p>
                    <p className="text-2xl font-serif">₹{total.toLocaleString("en-IN")}</p>
                    {balance > 0 && <p className="text-[8px] font-bold text-status-overdue">BAL: ₹{balance.toLocaleString()}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-2">Maturity</p>
                    <p className={`text-sm font-serif ${isOverdue ? "text-status-overdue" : ""}`}>{new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function InvoiceModal({
  invoice,
  clients,
  businesses,
  userId,
  services,
  taxes,
  termsTemplates,
  onClose,
}: {
  invoice: Invoice | null;
  clients: Client[];
  businesses: Business[];
  userId: string;
  services: Service[];
  taxes: Tax[];
  termsTemplates: TermsTemplate[];
  onClose: () => void;
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
      };
    }

    return {
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      orderNumber: "",
      paymentTerms: "",
      dueDate: "",
      subject: "",
      status: "Unpaid",
      client: { id: "" },
      business: { id: businesses[0]?.id || "" },
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
    };
  });

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

  function handleSubmit(e: React.FormEvent) {
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
      }),
      db.tx.invoices[invoiceId].link({ client: formData.client.id }),
      db.tx.invoices[invoiceId].link({ business: formData.business.id }),
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
  }

  return (
    <div className="fixed inset-0 bg-[#FAF9F7]/95 backdrop-blur-sm flex justify-center items-center z-50 p-4 md:p-12">
      <div className="bg-background w-full max-w-7xl max-h-[95vh] flex flex-col border border-border-subtle shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-8 md:p-12 border-b border-border-subtle flex flex-col md:flex-row justify-between items-start md:items-end gap-8 bg-white/50">
          <div>
            <h2 className="text-5xl font-serif tracking-tighter text-foreground mb-4">
              {invoice ? "Edit Invoice" : "Add New Invoice"}
            </h2>
            <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.3em]">
              {invoice ? `INVOICE ID: ${invoice.invoiceNumber}` : "CREATING NEW INVOICE"}
            </p>
          </div>
          <div className="flex gap-12">
            <button
              onClick={() => setModalTab("general")}
              className={`text-[10px] font-sans font-black uppercase tracking-[0.2em] pb-2 border-b-2 transition-all ${modalTab === "general" ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"
                }`}
            >
              01 — General & Items
            </button>
            <button
              onClick={() => setModalTab("usage")}
              className={`text-[10px] font-sans font-black uppercase tracking-[0.2em] pb-2 border-b-2 transition-all ${modalTab === "usage" ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"
                }`}
            >
              02 — Licensing & Rights
            </button>
            <button onClick={onClose} className="text-muted hover:text-foreground transition-colors ml-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-8 md:p-12">
          <form id="invoice-form" onSubmit={handleSubmit} className="space-y-16">
            {modalTab === "general" ? (
              <>
                {/* Identity Section */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-12">
                  <div className="md:col-span-8 space-y-8">
                    <div className="space-y-4">
                      <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Selection of Profile</label>
                      <select
                        name="business"
                        className="w-full text-2xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                        value={formData.business?.id || ""}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, business: { id: e.target.value } }))}
                        required
                      >
                        <option value="">Choose profile...</option>
                        {businesses.map((b) => (
                          <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Subject of Interest</label>
                      <input
                        type="text"
                        name="subject"
                        className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Project title or thematic focus..."
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-8">
                    <div className="space-y-4">
                      <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Manifest Identifier</label>
                      <input
                        type="text"
                        name="invoiceNumber"
                        className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                        value={formData.invoiceNumber}
                        onChange={handleChange}
                        placeholder="INV-XXXX"
                        required
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Manifest Status</label>
                      <select
                        name="status"
                        className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        <option value="Unpaid">UNSETTLED</option>
                        <option value="Sent">MANIFESTED</option>
                        <option value="Paid">SETTLED</option>
                        <option value="Partially Paid">PARTIALLY PAID</option>
                        <option value="Overdue">PAST MATURITY</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Chronology & Customer Section */}
                <section className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-12 border-t border-border-subtle">
                  <div className="space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">The Client</label>
                    <select
                      className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={formData.client?.id || ""}
                      onChange={(e) => handleClientChange(e.target.value)}
                      required
                    >
                      <option value="">Select individual...</option>
                      <option value="add_new" className="font-bold">+ Register New Entity</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {(client.displayName || client.firstName || "Anonymous").toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Initiation Date</label>
                    <input
                      type="date"
                      name="invoiceDate"
                      className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={formData.invoiceDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Payment Terms</label>
                    <select
                      name="paymentTerms"
                      className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={formData.paymentTerms}
                      onChange={handleChange}
                    >
                      <option value="">Select terms...</option>
                      {PAYMENT_TERMS.map((term) => (
                        <option key={term.value} value={term.value}>{term.label.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Date of Maturity</label>
                    <input
                      type="date"
                      name="dueDate"
                      className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={formData.dueDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </section>

                {/* Line Items Section */}
                <section className="space-y-8 pt-12 border-t border-border-subtle">
                  <div className="flex justify-between items-end">
                    <h3 className="text-3xl font-serif tracking-tighter">Inventory of Services</h3>
                    <div className="flex gap-8">
                      {activeServices.length > 0 && (
                        <select
                          className="text-[9px] font-sans font-black uppercase tracking-[0.2em] border-b border-foreground focus:outline-none bg-transparent transition-colors pb-1"
                          onChange={(e) => {
                            if (e.target.value) {
                              addServiceLineItem(e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">+ Append Service</option>
                          {activeServices.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name.toUpperCase()} (₹{service.rate})
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={addCustomLineItem}
                        className="text-[9px] font-sans font-black uppercase tracking-[0.2em] border-b border-foreground pb-1"
                      >
                        + Append Line
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Table Headers (Desktop) */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 pb-2 border-b border-border-subtle">
                      <div className="col-span-6 text-[8px] font-sans font-black text-muted uppercase tracking-[0.3em]">Description of Delivery</div>
                      <div className="col-span-2 text-[8px] font-sans font-black text-muted uppercase tracking-[0.3em]">SAC Code</div>
                      <div className="col-span-1 text-[8px] font-sans font-black text-muted uppercase tracking-[0.3em] text-center">Qty</div>
                      <div className="col-span-2 text-[8px] font-sans font-black text-muted uppercase tracking-[0.3em] text-right">Unit Rate</div>
                      <div className="col-span-1 text-right"></div>
                    </div>

                    <div className="space-y-12 md:space-y-4">
                      {formData.lineItems.map((item: any, index: number) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:items-center py-4 border-b border-border-subtle/50 group">
                          <div className="md:col-span-6 space-y-2">
                            <label className="md:hidden text-[8px] font-black text-muted uppercase tracking-widest">Description</label>
                            <input
                              type="text"
                              className="w-full text-lg font-serif border-b md:border-0 border-border-subtle bg-transparent focus:outline-none"
                              value={item.description}
                              onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                              placeholder="Describe the contribution..."
                              required
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="md:hidden text-[8px] font-black text-muted uppercase tracking-widest">SAC Code</label>
                            <input
                              type="text"
                              className="w-full text-sm font-sans border-b md:border-0 border-border-subtle bg-transparent focus:outline-none"
                              value={item.sacCode || ""}
                              onChange={(e) => handleLineItemChange(index, 'sacCode', e.target.value)}
                              placeholder="998311"
                            />
                          </div>
                          <div className="md:col-span-1 space-y-2 text-center">
                            <label className="md:hidden text-[8px] font-black text-muted uppercase tracking-widest text-center">Quantity</label>
                            <input
                              type="number"
                              className="w-full text-sm font-sans border-b md:border-0 border-border-subtle bg-transparent focus:outline-none text-center"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2 text-right">
                            <label className="md:hidden text-[8px] font-black text-muted uppercase tracking-widest text-right">Unit Rate</label>
                            <input
                              type="number"
                              className="w-full text-xl font-serif border-b md:border-0 border-border-subtle bg-transparent focus:outline-none text-right tracking-tighter"
                              value={item.rate}
                              onChange={(e) => handleLineItemChange(index, 'rate', e.target.value)}
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          <div className="md:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-muted hover:text-status-overdue transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Tax Summary Section */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-24 pt-12 border-t border-border-subtle">
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Taxation Architecture</label>
                      <select
                        className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                        value={taxType}
                        onChange={(e) => setTaxType(e.target.value as any)}
                      >
                        <option value="intrastate">INTRA-STATE REVENUE (CGST + SGST)</option>
                        <option value="interstate">INTER-STATE REVENUE (IGST)</option>
                      </select>

                      {taxType === "intrastate" ? (
                        <div className="grid grid-cols-2 gap-12">
                          <div className="space-y-2">
                            <span className="text-[8px] font-black text-muted uppercase">CGST Allocation (%)</span>
                            <input
                              type="number"
                              className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                              value={cgstRate}
                              onChange={(e) => setCgstRate(Number(e.target.value))}
                              step="0.01"
                            />
                          </div>
                          <div className="space-y-2">
                            <span className="text-[8px] font-black text-muted uppercase">SGST Allocation (%)</span>
                            <input
                              type="number"
                              className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                              value={sgstRate}
                              onChange={(e) => setSgstRate(Number(e.target.value))}
                              step="0.01"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="text-[8px] font-black text-muted uppercase">IGST Allocation (%)</span>
                          <input
                            type="number"
                            className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                            value={igstRate}
                            onChange={(e) => setIgstRate(Number(e.target.value))}
                            step="0.01"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-6 p-8 bg-black/5 border border-border-subtle">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          id="isAdvanceReceived"
                          name="isAdvanceReceived"
                          checked={formData.isAdvanceReceived}
                          onChange={handleChange}
                          className="w-4 h-4 accent-foreground"
                        />
                        <label htmlFor="isAdvanceReceived" className="text-[9px] font-sans font-black uppercase tracking-widest">Record Advance Payment</label>
                      </div>
                      {formData.isAdvanceReceived && (
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-muted uppercase">Contribution amount (INR)</label>
                          <input
                            type="number"
                            name="advanceAmount"
                            value={formData.advanceAmount}
                            onChange={handleChange}
                            className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Tax Details</label>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.1em]">Net Contribution</span>
                        <span className="text-xl font-serif">₹{formData.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      {taxType === "intrastate" ? (
                        <>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.1em]">CGST ({cgstRate}%)</span>
                            <span className="text-sm font-serif">₹{formData.cgst?.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.1em]">SGST ({sgstRate}%)</span>
                            <span className="text-sm font-serif">₹{formData.sgst?.toLocaleString('en-IN')}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.1em]">IGST ({igstRate}%)</span>
                          <span className="text-sm font-serif">₹{formData.igst?.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-end pt-8 border-t border-foreground mt-8">
                        <span className="text-[12px] font-sans font-black uppercase tracking-[0.2em]">Aggregate Total</span>
                        <span className="text-5xl font-serif tracking-tighter">₹{formData.total.toLocaleString('en-IN')}</span>
                      </div>

                      {formData.isAdvanceReceived && (
                        <div className="space-y-4 pt-8 bg-accent/5 p-6 mt-8">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-accent uppercase underline underline-offset-4 tracking-[0.1em]">Advance Retained</span>
                            <span className="text-sm font-serif text-accent">— ₹{Number(formData.advanceAmount).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-end pt-2 border-t border-accent/20">
                            <span className="text-[10px] font-black text-status-overdue uppercase tracking-[0.1em]">Remaining Resolution</span>
                            <span className="text-xl font-serif text-status-overdue">₹{(formData.total - Number(formData.advanceAmount)).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Annotation Section */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-border-subtle">
                  <div className="space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Internal Documentation</label>
                    <textarea
                      name="notes"
                      className="w-full text-sm font-serif border border-border-subtle border-dashed p-4 bg-transparent min-h-[120px] focus:outline-none"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Add private observations or records..."
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Terms & Conditions</label>
                      {termsTemplates.length > 0 && (
                        <select
                          className="text-[8px] font-sans font-black uppercase tracking-[0.2em] border-b border-foreground focus:outline-none bg-transparent"
                          onChange={(e) => {
                            const template = termsTemplates.find(t => t.id === e.target.value);
                            if (template) {
                              setFormData((prev: any) => ({ ...prev, termsAndConditions: template.content }));
                            }
                          }}
                        >
                          <option value="">Select Terms</option>
                          {termsTemplates.map((template) => (
                            <option key={template.id} value={template.id}>{template.title.toUpperCase()}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <textarea
                      name="termsAndConditions"
                      className="w-full text-[10px] font-sans tracking-wider leading-relaxed border border-border-subtle p-4 bg-[#FAF9F7] min-h-[120px] focus:outline-none"
                      value={formData.termsAndConditions}
                      onChange={handleChange}
                      placeholder="Formalize the terms of engagement..."
                    />
                  </div>
                </section>
              </>
            ) : (
              /* Usage Rights Tab */
              <div className="max-w-4xl space-y-24 py-12">
                <section className="space-y-16">
                  <h3 className="text-3xl font-serif tracking-tighter border-b border-border-subtle pb-8">Intellectual Property & Dissemination</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
                    <div className="space-y-12">
                      <div className="space-y-4">
                        <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Mode of Utilization</label>
                        <select
                          name="usageType"
                          className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                          value={formData.usageType}
                          onChange={handleChange}
                        >
                          <option value="">Specify modality...</option>
                          <option value="Editorial">EDITORIAL USE</option>
                          <option value="Social media">SOCIAL CHANNEL DISSEMINATION</option>
                          <option value="Website">DIGITAL ARCHITECTURE</option>
                          <option value="Print">PHYSICAL REPRODUCTION</option>
                          <option value="Commercial / Ads">COMMERCIAL EXPLOITATION</option>
                          <option value="Other">OTHER MODALITY</option>
                        </select>
                      </div>

                      {formData.usageType === "Other" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                          <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Detailed Modality</label>
                          <input
                            type="text"
                            name="usageOther"
                            className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2 uppercase tracking-widest"
                            value={formData.usageOther}
                            onChange={handleChange}
                            placeholder="SPECIFY UNIQUE RIGHTS..."
                          />
                        </div>
                      )}

                      <div className="space-y-4">
                        <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Spatial Scope</label>
                        <select
                          name="usageGeography"
                          className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                          value={formData.usageGeography}
                          onChange={handleChange}
                        >
                          <option value="">Select scope...</option>
                          <option value="India">TERRITORY OF INDIA</option>
                          <option value="Global">GLOBAL USE</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div className="space-y-4">
                        <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Temporal Duration</label>
                        <select
                          name="usageDuration"
                          className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                          value={formData.usageDuration}
                          onChange={handleChange}
                        >
                          <option value="">Select term...</option>
                          <option value="3 months">QUARTERLY (90 DAYS)</option>
                          <option value="1 year">ANNUAL (365 DAYS)</option>
                          <option value="perpetual">PERPETUAL ENDURANCE</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Exclusivity Protocol</label>
                        <select
                          name="usageExclusivity"
                          className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                          value={formData.usageExclusivity}
                          onChange={handleChange}
                        >
                          <option value="">Select degree...</option>
                          <option value="Exclusive">EXCLUSIVE DOMINION</option>
                          <option value="Non-exclusive">NON-EXCLUSIVE UTILIZATION</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-8 md:p-12 border-t border-border-subtle bg-white/50 flex justify-between items-center">
          <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">{formData.invoiceNumber || "Draft Manifest"}</p>
          <div className="flex gap-12">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-foreground transition-all"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              form="invoice-form"
              className="px-16 py-4 bg-foreground text-background text-[10px] font-sans font-black uppercase tracking-[0.3em] rounded-full hover:bg-black transition-all shadow-xl shadow-black/5"
            >
              {invoice ? "Update Record" : "Finalize Manifest"}
            </button>
          </div>
        </div>
      </div>

      {isCustomerModalOpen && (
        <CustomerModal
          client={null}
          userId={userId}
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccess={(clientId) => {
            handleClientChange(clientId);
            setIsCustomerModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
