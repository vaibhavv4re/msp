import { useState } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { Client, Invoice, Business } from "@/app/page";
import { CustomerSummary } from "./CustomerSummary";

const PAYMENT_TERMS = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_45", label: "Net 45" },
  { value: "net_60", label: "Net 60" },
  { value: "custom", label: "Custom" },
];

import React from "react";

export function Customers({
  clients,
  invoices,
  businesses,
  userId,
  activeBusinessId,
  initiallyOpenModal,
  onModalClose,
  onNavigate,
}: {
  clients: Client[];
  invoices: Invoice[];
  businesses: Business[];
  userId: string;
  activeBusinessId: string;
  initiallyOpenModal?: boolean;
  onModalClose?: () => void;
  onNavigate?: (view: any, modal?: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "summary">("list");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
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

  const selectedClientForSummary = clients.find(c => c.id === selectedCustomerId);

  if (view === "summary" && selectedClientForSummary) {
    return (
      <CustomerSummary
        client={selectedClientForSummary}
        invoices={invoices}
        businesses={businesses}
        userId={userId}
        activeBusinessId={activeBusinessId}
        onBack={() => setView("list")}
        onEdit={(client) => openModal(client)}
        onCreateInvoice={(clientId) => {
          if (onNavigate) onNavigate("invoices", "create-invoice");
        }}
        onViewInvoice={(invoiceId) => {
          if (onNavigate) onNavigate("invoices", `edit-invoice:${invoiceId}`);
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
    setEditingClient(client);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingClient(null);
    if (onModalClose) onModalClose();
  }

  function deleteClient(client: Client) {
    const displayName = client.displayName || client.firstName || "this customer";
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
        <h2 className="text-xl font-bold">Customers</h2>
        <button
          onClick={() => openModal()}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Add Customer
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search customers..."
          className="border p-2 rounded-md w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {mobilePagedClients.length === 0 ? (
          <div className="py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-sm font-black text-gray-600 uppercase tracking-widest">No customers found</p>
          </div>
        ) : (
          <>
            {mobilePagedClients.map((client) => (
              <div key={client.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-all">
                <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${client.customerType === "Business" ? "bg-blue-500" : "bg-green-500"}`}></span>
                      <h3 className="font-black text-gray-900 uppercase tracking-tight truncate">
                        {client.displayName || client.firstName || "Unnamed"}
                      </h3>
                    </div>
                    {client.companyName && (
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-4">{client.companyName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${client.customerType === "Business" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                      }`}>
                      {client.customerType || "Individual"}
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
                    onClick={() => { setSelectedCustomerId(client.id); setView("summary"); }}
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
              <th className="py-3 px-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Customer</th>
              <th className="py-3 px-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Status / Type</th>
              <th className="py-3 px-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Email / Phone</th>
              <th className="py-3 px-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pagedClients.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-600 font-bold uppercase text-xs">No customers found</td>
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
                    <span className={`px-2 py-1 rounded-full text-xs ${client.customerType === "Business"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                      }`}>
                      {client.customerType || "Individual"}
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
                      onClick={() => { setSelectedCustomerId(client.id); setView("summary"); }}
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
              Showing {pagedClients.length} of {filteredClients.length} customers
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
        <CustomerModal client={editingClient} userId={userId} activeBusinessId={activeBusinessId} onClose={closeModal} />
      )}
    </div>
  );
}

export function CustomerModal({
  client,
  userId,
  activeBusinessId,
  onClose,
  onSuccess,
}: {
  client: Client | null;
  userId: string;
  activeBusinessId: string;
  onClose: () => void;
  onSuccess?: (clientId: string) => void;
}) {
  const [customerType, setCustomerType] = useState(client?.customerType || "Individual");
  const [salutation, setSalutation] = useState(client?.salutation || "");
  const [firstName, setFirstName] = useState(client?.firstName || "");
  const [lastName, setLastName] = useState(client?.lastName || "");
  const [companyName, setCompanyName] = useState(client?.companyName || "");
  const [displayName, setDisplayName] = useState(client?.displayName || "");
  const [email, setEmail] = useState(client?.email || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [workPhone, setWorkPhone] = useState(client?.workPhone || "");
  const [mobile, setMobile] = useState(client?.mobile || "");
  const [address, setAddress] = useState(client?.address || "");
  const [pan, setPan] = useState(client?.pan || "");
  const [tan, setTan] = useState(client?.tan || "");
  const [gst, setGst] = useState(client?.gst || "");
  const [currency, setCurrency] = useState(client?.currency || "INR");
  const [paymentTerms, setPaymentTerms] = useState(client?.paymentTerms || "net_30");
  const [customTermDays, setCustomTermDays] = useState(client?.customTermDays?.toString() || "");
  const [isTdsDeducting, setIsTdsDeducting] = useState((client as any)?.isTdsDeducting || false);

  // Auto-generate display name
  function generateDisplayName() {
    if (customerType === "Business" && companyName) {
      return companyName;
    } else if (firstName) {
      return `${salutation ? salutation + " " : ""}${firstName}${lastName ? " " + lastName : ""}`.trim();
    }
    return "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const finalDisplayName = displayName || generateDisplayName();

    if (!finalDisplayName) {
      alert("Please provide enough information to generate a display name");
      return;
    }

    const clientId = client?.id || id();
    const clientData = {
      customerType,
      salutation: salutation || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      companyName: companyName || undefined,
      displayName: finalDisplayName,
      email: email || undefined,
      phone: phone || undefined,
      workPhone: workPhone || undefined,
      mobile: mobile || undefined,
      address: address || undefined,
      pan: pan || undefined,
      tan: tan || undefined,
      currency: currency || undefined,
      paymentTerms: paymentTerms || undefined,
      customTermDays: paymentTerms === "custom" && customTermDays ? parseInt(customTermDays) : undefined,
    };

    const isNew = !client;
    if (isNew) {
      // Creating new customer - link owner
      db.transact([
        db.tx.clients[clientId].update(clientData),
        db.tx.clients[clientId].link({ owner: userId })
      ]);
      if (activeBusinessId !== "ALL") {
        db.transact(db.tx.clients[clientId].link({ business: activeBusinessId }));
      }
    } else {
      // Updating existing customer - no need to relink owner
      db.transact(db.tx.clients[clientId].update(clientData));
    }
    if (onSuccess) onSuccess(clientId);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {client ? "Edit Customer" : "Add Customer"}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Customer Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Customer Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="Business"
                  checked={customerType === "Business"}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="mr-2"
                />
                Business
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="Individual"
                  checked={customerType === "Individual"}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="mr-2"
                />
                Individual
              </label>
            </div>
          </div>

          {/* TDS Marking */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-bold mb-2 uppercase text-blue-800">Tax Settings</h4>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isTdsDeducting}
                onChange={(e) => setIsTdsDeducting(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-bold text-blue-900 uppercase tracking-wide">Client always deducts TDS?</span>
            </label>
            <p className="text-[10px] text-blue-600 mt-1 ml-7 uppercase font-bold tabular-nums">Mark this if the client habitually deducts TDS from payments</p>
          </div>

          {/* Primary Contact */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Primary Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Salutation</label>
                <select
                  className="border p-2 rounded-md w-full"
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  className="border p-2 rounded-md w-full"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  className="border p-2 rounded-md w-full"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            {customerType === "Business" && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  className="border p-2 rounded-md w-full"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                />
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="border p-2 rounded-md w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={generateDisplayName() || "Display name for invoices"}
              />
              {generateDisplayName() && !displayName && (
                <p className="text-xs text-gray-600 mt-1">
                  Will use: {generateDisplayName()}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="border p-2 rounded-md w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  className="border p-2 rounded-md w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Work Phone</label>
                <input
                  type="tel"
                  className="border p-2 rounded-md w-full"
                  value={workPhone}
                  onChange={(e) => setWorkPhone(e.target.value)}
                  placeholder="Work phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mobile</label>
                <input
                  type="tel"
                  className="border p-2 rounded-md w-full"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Mobile number"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                className="border p-2 rounded-md w-full"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                rows={3}
              />
            </div>
          </div>

          {/* Additional Fields */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Additional Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">PAN</label>
                <input
                  type="text"
                  className="border p-2 rounded-md w-full uppercase"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">TAN</label>
                <input
                  type="text"
                  className="border p-2 rounded-md w-full uppercase"
                  value={tan}
                  onChange={(e) => setTan(e.target.value.toUpperCase())}
                  placeholder="ABCD12345E"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GST Number</label>
                <input
                  type="text"
                  className="border p-2 rounded-md w-full uppercase"
                  value={gst}
                  onChange={(e) => setGst(e.target.value.toUpperCase())}
                  placeholder="27AAPFU0939F1ZV"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  className="border p-2 rounded-md w-full"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Terms</label>
                <select
                  className="border p-2 rounded-md w-full"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                >
                  {PAYMENT_TERMS.map((term) => (
                    <option key={term.value} value={term.value}>
                      {term.label}
                    </option>
                  ))}
                </select>
              </div>

              {paymentTerms === "custom" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Custom Days</label>
                  <input
                    type="number"
                    className="border p-2 rounded-md w-full"
                    value={customTermDays}
                    onChange={(e) => setCustomTermDays(e.target.value)}
                    placeholder="Number of days"
                    min="1"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              {client ? "Update" : "Add"} Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
