import React, { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { Client, Invoice, Business } from "@/types";
import { ClientSummary } from "./ClientSummary";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/device";
import { ClientForm, PAYMENT_TERMS } from "./forms/ClientForm";
import { DesktopModalLayout } from "./layout/FormLayout";

export function Clients({
  clients,
  invoices,
  businesses,
  userId,
  activeBusinessId,
  initiallyOpenModal,
  onModalClose,
  onNavigate,
  isMobile: _isMobile,
}: {
  clients: Client[];
  invoices: Invoice[];
  businesses: Business[];
  userId: string;
  activeBusinessId: string;
  initiallyOpenModal?: boolean;
  onModalClose?: () => void;
  onNavigate?: (view: any, modal?: string) => void;
  isMobile?: boolean;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "summary">("list");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileLimit, setMobileLimit] = useState(15);

  // Reset pagination when search changes
  React.useEffect(() => {
    setCurrentPage(1);
    setMobileLimit(15);
  }, [searchTerm]);

  React.useEffect(() => {
    if (initiallyOpenModal) {
      setIsModalOpen(true);
    }
  }, [initiallyOpenModal]);

  const selectedClientForSummary = clients.find(c => c.id === selectedClientId);

  if (view === "summary" && selectedClientForSummary) {
    return (
      <ClientSummary
        client={selectedClientForSummary}
        invoices={invoices}
        businesses={businesses}
        userId={userId}
        activeBusinessId={activeBusinessId}
        onBack={() => setView("list")}
        onEdit={(client) => openModal(client)}
        onCreateInvoice={(clientId) => {
          if (onNavigate) onNavigate("work", "create-invoice");
        }}
        onViewInvoice={(invoiceId) => {
          if (onNavigate) onNavigate("work", `edit-invoice:${invoiceId}`);
        }}
      />
    );
  }

  const filteredClients = clients.filter((client) => {
    const displayName = client.displayName?.toLowerCase() || "";
    const firstName = client.firstName?.toLowerCase() || "";
    const lastName = client.lastName?.toLowerCase() || "";
    const companyName = client.companyName?.toLowerCase() || "";
    const email = client.email?.toLowerCase() || "";
    const phone = client.phone?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return (
      displayName.includes(term) ||
      firstName.includes(term) ||
      lastName.includes(term) ||
      companyName.includes(term) ||
      email.includes(term) ||
      phone.includes(term)
    );
  });

  const itemsPerPage = 25;
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const pagedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const mobilePagedClients = filteredClients.slice(0, mobileLimit);

  function openModal(client: Client | null = null) {
    if (isMobile) {
      if (client) {
        router.push(`/work/clients/new?id=${client.id}`);
      } else {
        router.push('/work/clients/new');
      }
      return;
    }
    setEditingClient(client);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingClient(null);
    if (onModalClose) onModalClose();
  }

  function deleteClient(client: Client) {
    const displayName = client.displayName || client.firstName || "this client";
    if (
      confirm(
        `Are you sure you want to delete ${displayName}? This will also delete all their invoices.`
      )
    ) {
      db.transact(db.tx.clients[client.id].delete());
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Clients</h2>
        <button
          onClick={() => openModal()}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Add Client
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search clients..."
          className="border p-2 rounded-md w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {mobilePagedClients.length === 0 ? (
          <div className="py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-sm font-black text-gray-600 uppercase tracking-widest">No clients found</p>
          </div>
        ) : (
          <>
            {mobilePagedClients.map((client) => (
              <div key={client.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-all">
                <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${client.clientType === "Business" ? "bg-blue-500" : "bg-green-500"}`}></span>
                      <h3 className="font-black text-gray-900 uppercase tracking-tight truncate">
                        {client.displayName || client.firstName || "Unnamed"}
                      </h3>
                    </div>
                    {client.companyName && (
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-4">{client.companyName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${client.clientType === "Business" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                      }`}>
                      {client.clientType || "Individual"}
                    </span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-2 gap-4 bg-gray-50/30">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest leading-none">Contact</p>
                    <p className="text-[11px] font-bold text-gray-700 truncate">{client.email || "No Email"}</p>
                    {client.phone && <p className="text-[11px] font-bold text-gray-600">{client.phone}</p>}
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest leading-none">Terms</p>
                    <p className="text-[11px] font-bold text-gray-700">
                      {PAYMENT_TERMS.find(t => t.value === client.paymentTerms)?.label || "—"}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white flex gap-2 border-t border-gray-100">
                  <button
                    onClick={() => { setSelectedClientId(client.id); setView("summary"); }}
                    className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    View Summary
                  </button>
                  <button
                    onClick={() => deleteClient(client)}
                    className="px-4 py-3 bg-red-50 text-red-600 rounded-xl active:scale-95 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}

            {mobileLimit < filteredClients.length && (
              <button
                onClick={() => setMobileLimit(prev => prev + 15)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-gray-200 active:scale-95 transition-all outline-none"
              >
                Load More ({filteredClients.length - mobilePagedClients.length} remaining)
              </button>
            )}

            {mobileLimit >= filteredClients.length && filteredClients.length > 0 && (
              <div className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-4">
                End of list • {filteredClients.length} total
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="py-3 px-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Client</th>
              <th className="py-3 px-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Status / Type</th>
              <th className="py-3 px-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Email / Phone</th>
              <th className="py-3 px-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pagedClients.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-600 font-bold uppercase text-xs">No clients found</td>
              </tr>
            ) : (
              pagedClients.map((client) => (
                <tr key={client.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">
                    <div className="font-medium">{client.displayName || "—"}</div>
                    {client.companyName && (
                      <div className="text-sm text-gray-600">{client.companyName}</div>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${client.clientType === "Business"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                      }`}>
                      {client.clientType || "Individual"}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <div className="text-sm">
                      {client.email && <div>{client.email}</div>}
                      {client.phone && <div className="text-gray-600">{client.phone}</div>}
                    </div>
                  </td>
                  <td className="py-2 px-4 text-center">
                    <button
                      onClick={() => { setSelectedClientId(client.id); setView("summary"); }}
                      className="text-gray-900 font-bold hover:underline mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openModal(client)}
                      className="text-blue-500 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteClient(client)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {filteredClients.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100 mt-4 rounded-b-lg">
            <div className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
              Showing {pagedClients.length} of {filteredClients.length} clients
            </div>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  Prev
                </button>
                <div className="flex items-center px-4 text-[10px] font-black text-gray-900 uppercase">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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

      {isModalOpen && (
        <DesktopModalLayout
          title={editingClient ? "Edit Client" : "Register New Client"}
          onClose={closeModal}
        >
          <ClientForm
            initialClient={editingClient}
            userId={userId}
            activeBusinessId={activeBusinessId}
            onSuccess={closeModal}
            onCancel={closeModal}
          />
        </DesktopModalLayout>
      )}
    </div>
  );
}

