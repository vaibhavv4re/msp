"use client";
import { useState, useEffect } from "react";
import React from "react";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";
import {
  Invoice,
  Client,
  Business,
  BankAccount,
  Service,
  Tax,
  TermsTemplate,
  LineItem
} from "@/types";
import { InvoiceForm } from "./forms/InvoiceForm";
import { DesktopModalLayout } from "./layout/FormLayout";
import { RecordPaymentModal } from "./RecordPaymentModal";

export function Invoices({
  invoices,
  clients,
  businesses,
  userId,
  activeBusinessId,
  services,
  taxes,
  termsTemplates,
  isMobile,
  initiallyOpenModal,
  onModalClose,
}: {
  invoices: Invoice[];
  clients: Client[];
  businesses: Business[];
  userId: string;
  activeBusinessId: string;
  services: Service[];
  taxes: Tax[];
  termsTemplates: TermsTemplate[];
  isMobile: boolean;
  initiallyOpenModal?: boolean | string;
  onModalClose?: () => void;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  useEffect(() => {
    if (initiallyOpenModal === true || initiallyOpenModal === "create-invoice") {
      openModal();
    } else if (typeof initiallyOpenModal === 'string' && initiallyOpenModal.startsWith('edit-invoice:')) {
      const invId = initiallyOpenModal.split(':')[1];
      const inv = invoices.find(i => i.id === invId);
      if (inv) {
        openModal(inv);
      }
    }
  }, [initiallyOpenModal, invoices]);

  const openModal = (invoice: Invoice | null = null) => {
    if (isMobile) {
      if (invoice) {
        router.push(`/work/invoices/new?id=${invoice.id}`);
      } else {
        router.push('/work/invoices/new');
      }
      return;
    }
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
    if (onModalClose) onModalClose();
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const client = clients.find((c) => c.id === invoice.client?.id);
    const clientName = client?.displayName || client?.firstName || "";
    const term = searchTerm.toLowerCase();
    if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
    if (businessFilter !== "all" && invoice.business?.id !== businessFilter) return false;
    return clientName.toLowerCase().includes(term) || (invoice.invoiceNumber || "").toLowerCase().includes(term);
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const timeB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
    const timeA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">Invoices</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Revenue & Ledger Tracking</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gray-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
        >
          Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <input
          type="text"
          placeholder="Search items..."
          className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
          value={businessFilter}
          onChange={(e) => setBusinessFilter(e.target.value)}
        >
          <option value="all">All Businesses</option>
          {businesses.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          className="bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Sent">Sent</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 italic text-[10px]">
              <th className="pb-4 font-black text-gray-400 uppercase tracking-widest pl-4">Date</th>
              <th className="pb-4 font-black text-gray-400 uppercase tracking-widest">Client / Number</th>
              <th className="pb-4 font-black text-gray-400 uppercase tracking-widest">Amount</th>
              <th className="pb-4 font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="pb-4 font-black text-gray-400 uppercase tracking-widest text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedInvoices.map((inv) => {
              const client = clients.find(c => c.id === inv.client?.id);
              return (
                <tr key={inv.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 pl-4 text-xs font-bold">{new Date(inv.invoiceDate || 0).toLocaleDateString()}</td>
                  <td className="py-6">
                    <p className="text-xs font-black uppercase tracking-tighter">{client?.displayName || "Unknown"}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">#{inv.invoiceNumber}</p>
                  </td>
                  <td className="py-6 text-xs font-black">₹{inv.total?.toLocaleString()}</td>
                  <td className="py-6">
                    <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${inv.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-6 text-right pr-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openModal(inv)} className="text-gray-400 hover:text-gray-900">Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && !isMobile && (
        <DesktopModalLayout title={editingInvoice ? "Edit Invoice" : "New Invoice"} onClose={closeModal}>
          <InvoiceForm
            initialInvoice={editingInvoice}
            clients={clients}
            businesses={businesses}
            userId={userId}
            activeBusinessId={activeBusinessId}
            services={services}
            taxes={taxes}
            termsTemplates={termsTemplates}
            allInvoices={invoices}
            onClose={closeModal}
          />
        </DesktopModalLayout>
      )}

      {isRecordPaymentModalOpen && selectedInvoiceForPayment && (
        <RecordPaymentModal
          isOpen={isRecordPaymentModalOpen}
          invoice={selectedInvoiceForPayment}
          userId={userId}
          onClose={() => {
            setIsRecordPaymentModalOpen(false);
            setSelectedInvoiceForPayment(null);
          }}
        />
      )}
    </div>
  );
}
