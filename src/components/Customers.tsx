import { useState } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { Client } from "@/app/page";

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
  userId,
  initiallyOpenModal,
  onModalClose,
}: {
  clients: Client[];
  userId: string;
  initiallyOpenModal?: boolean;
  onModalClose?: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    if (initiallyOpenModal) {
      setIsModalOpen(true);
    }
  }, [initiallyOpenModal]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    <div className="bg-[#FAF9F7] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-24 space-y-16">
        {/* Editorial Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border-subtle pb-12">
          <div className="space-y-4">
            <h2 className="text-6xl md:text-8xl font-serif tracking-tighter text-foreground">
              Clientele
            </h2>
            <p className="text-xs md:text-sm font-sans text-muted uppercase tracking-[0.3em] max-w-md leading-relaxed">
              A directory of your creative partners and clients.
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-4 text-[10px] font-sans font-black uppercase tracking-[0.2em] group border border-foreground px-8 py-4 rounded-full transition-all hover:bg-foreground hover:text-background"
          >
            Register Entity
          </button>
        </header>

        {/* Narrative Filters */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-12">
          <div className="space-y-4">
            <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Find Client</label>
            <input
              type="text"
              placeholder="NAME, EMAIL, OR INSTITUTION..."
              className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 placeholder:text-muted/30 uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile Clientele List */}
        <div className="md:hidden space-y-12">
          {filteredClients.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-xl font-serif italic text-muted">No clients found.</p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div key={client.id} className="space-y-6 pb-12 border-b border-border-subtle last:border-0">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-3xl font-serif tracking-tighter">
                      {client.displayName || client.firstName || "Anonymous"}
                    </h3>
                    <span className="text-[8px] font-sans font-black uppercase tracking-[0.2em] text-muted border border-border-subtle px-2 py-1 rounded">
                      {client.customerType?.toUpperCase() || "INDIVIDUAL"}
                    </span>
                  </div>
                  {client.companyName && (
                    <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.2em]">{client.companyName}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-muted uppercase tracking-widest leading-none">Record</p>
                    <p className="text-xs font-sans text-foreground">{client.email || "No digital record"}</p>
                    {client.phone && <p className="text-xs font-sans text-muted">{client.phone}</p>}
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[8px] font-black text-muted uppercase tracking-widest leading-none">Terms</p>
                    <p className="text-xs font-sans text-foreground uppercase tracking-widest">
                      {PAYMENT_TERMS.find(t => t.value === client.paymentTerms)?.label || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-8 items-center pt-4">
                  <button
                    onClick={() => openModal(client)}
                    className="text-[9px] font-sans font-black uppercase tracking-[0.2em] border-b border-foreground pb-1"
                  >
                    Modify Profile
                  </button>
                  <button
                    onClick={() => deleteClient(client)}
                    className="text-[9px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-status-overdue transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Clientele View */}
        <div className="hidden md:block">
          <table className="w-full border-separate border-spacing-y-4">
            <thead>
              <tr className="text-left">
                <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Identity & Institution</th>
                <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Classification</th>
                <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Communication</th>
                <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Terms</th>
                <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em] text-center">Activity</th>
                <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <p className="text-2xl font-serif italic text-muted">No clients found in the current directory.</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="group hover:bg-black/[0.02] transition-colors">
                    <td className="py-6 border-b border-border-subtle/50">
                      <div className="text-2xl font-serif tracking-tight">{client.displayName || "—"}</div>
                      {client.companyName && (
                        <div className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.2em] mt-1">{client.companyName}</div>
                      )}
                    </td>
                    <td className="py-6 border-b border-border-subtle/50">
                      <span className="text-[10px] font-sans tracking-widest uppercase border border-border-subtle px-3 py-1 rounded-full text-muted group-hover:text-foreground group-hover:border-foreground transition-all">
                        {client.customerType || "Individual"}
                      </span>
                    </td>
                    <td className="py-6 border-b border-border-subtle/50">
                      <div className="text-sm font-sans text-foreground">{client.email || "—"}</div>
                      {client.phone && <div className="text-[10px] font-sans text-muted uppercase mt-1 tracking-widest">{client.phone}</div>}
                    </td>
                    <td className="py-6 border-b border-border-subtle/50">
                      <div className="text-[10px] font-sans font-black uppercase tracking-[0.2em]">
                        {PAYMENT_TERMS.find(t => t.value === client.paymentTerms)?.label || "No Terms"}
                      </div>
                    </td>
                    <td className="py-6 border-b border-border-subtle/50 text-center font-serif text-xl italic text-muted">
                      {client.invoices?.length || 0}
                    </td>
                    <td className="py-6 border-b border-border-subtle/50">
                      <div className="flex justify-end gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(client)}
                          className="text-muted hover:text-foreground transition-colors"
                          title="Modify"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button
                          onClick={() => deleteClient(client)}
                          className="text-muted hover:text-status-overdue transition-colors"
                          title="Archive"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <CustomerModal client={editingClient} userId={userId} onClose={closeModal} />
        )}
      </div>
    </div>
  );
}

export function CustomerModal({
  client,
  userId,
  onClose,
  onSuccess,
}: {
  client: Client | null;
  userId: string;
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
      gst: gst || undefined,
      currency: currency || undefined,
      paymentTerms: paymentTerms || undefined,
      customTermDays: paymentTerms === "custom" && customTermDays ? parseInt(customTermDays) : undefined,
    };

    const isNew = !client;
    if (isNew) {
      db.transact([
        db.tx.clients[clientId].update(clientData),
        db.tx.clients[clientId].link({ owner: userId })
      ]);
    } else {
      db.transact(db.tx.clients[clientId].update(clientData));
    }
    if (onSuccess) onSuccess(clientId);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-[#FAF9F7]/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-12">
      <div className="bg-[#FAF9F7] w-full max-w-7xl max-h-[95vh] border border-border-subtle shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-8 md:p-12 border-b border-border-subtle flex justify-between items-end bg-white/50">
          <div className="space-y-4">
            <h3 className="text-4xl md:text-5xl font-serif tracking-tighter">
              {client ? "Edit Client" : "Add New Client"}
            </h3>
            <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">
              {client ? "CUSTOMER REF: " + client.id.slice(0, 8).toUpperCase() : "ADDING NEW CUSTOMER"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-4 hover:rotate-90 transition-transform duration-300"
          >
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-8 md:p-12">
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-24">
            {/* Classification Selection */}
            <section className="space-y-8">
              <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Category</label>
              <div className="flex gap-16">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <input
                    type="radio"
                    value="Business"
                    checked={customerType === "Business"}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-4 h-4 accent-foreground"
                  />
                  <span className={`text-sm font-sans uppercase tracking-[0.2em] transition-colors ${customerType === "Business" ? "font-black" : "text-muted group-hover:text-foreground"}`}>Business</span>
                </label>
                <label className="flex items-center gap-4 cursor-pointer group">
                  <input
                    type="radio"
                    value="Individual"
                    checked={customerType === "Individual"}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-4 h-4 accent-foreground"
                  />
                  <span className={`text-sm font-sans uppercase tracking-[0.2em] transition-colors ${customerType === "Individual" ? "font-black" : "text-muted group-hover:text-foreground"}`}>Individual</span>
                </label>
              </div>
            </section>

            {/* Primary Identity */}
            <section className="grid grid-cols-1 md:grid-cols-12 gap-12">
              <div className="md:col-span-8 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Honorific</label>
                    <select
                      className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={salutation}
                      onChange={(e) => setSalutation(e.target.value)}
                    >
                      <option value="">None...</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Dr.">Dr.</option>
                    </select>
                  </div>
                  <div className="md:col-span-1 space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Given Name</label>
                    <input
                      type="text"
                      className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John..."
                    />
                  </div>
                  <div className="md:col-span-1 space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Surname</label>
                    <input
                      type="text"
                      className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe..."
                    />
                  </div>
                </div>

                {customerType === "Business" && (
                  <div className="space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Legal Title</label>
                    <input
                      type="text"
                      className="w-full text-3xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 tracking-tighter"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Organization Name..."
                    />
                  </div>
                )}

                <div className="space-y-4 pt-12 border-t border-border-subtle">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Manifest Display Name</label>
                  <input
                    type="text"
                    className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={generateDisplayName() || "Full name for records..."}
                  />
                  {generateDisplayName() && !displayName && (
                    <p className="text-[10px] font-sans text-muted italic">
                      Automatic Resolution: {generateDisplayName()}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Communication & Location */}
            <section className="space-y-16 pt-12 border-t border-border-subtle">
              <h4 className="text-3xl font-serif tracking-tighter">Communication & Domain</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
                <div className="space-y-12">
                  <div className="space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Electronic Post</label>
                    <input
                      type="email"
                      className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="CLIENT@DOMAIN.COM"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Primary Telephony</label>
                    <input
                      type="tel"
                      className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91..."
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Office Address</label>
                  <textarea
                    className="w-full text-sm font-serif border border-border-subtle p-4 bg-transparent min-h-[120px] focus:outline-none"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Physical locus of operations..."
                  />
                </div>
              </div>
            </section>

            {/* Tax Details */}
            <section className="space-y-16 pt-12 border-t border-border-subtle pb-12">
              <h4 className="text-3xl font-serif tracking-tighter">Tax Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Permanent Account (PAN)</label>
                  <input
                    type="text"
                    className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2 uppercase tracking-widest"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Tax Deduction (TAN)</label>
                  <input
                    type="text"
                    className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2 uppercase tracking-widest"
                    value={tan}
                    onChange={(e) => setTan(e.target.value.toUpperCase())}
                    placeholder="ABCD12345E"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">GST Number</label>
                  <input
                    type="text"
                    className="w-full text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2 uppercase tracking-widest"
                    value={gst}
                    onChange={(e) => setGst(e.target.value.toUpperCase())}
                    placeholder="27AAPFU0939F1ZV"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Monetary Standard</label>
                  <select
                    className="w-full text-sm font-sans tracking-widest uppercase border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="INR">INR — INDIAN RUPEE</option>
                    <option value="USD">USD — US DOLLAR</option>
                    <option value="EUR">EUR — EURO</option>
                    <option value="GBP">GBP — BRITISH POUND</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Terms of Resolution</label>
                  <div className="flex gap-12 items-end">
                    <select
                      className="flex-1 text-sm font-sans tracking-widest uppercase border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                    >
                      {PAYMENT_TERMS.map((term) => (
                        <option key={term.value} value={term.value}>{term.label.toUpperCase()}</option>
                      ))}
                    </select>
                    {paymentTerms === "custom" && (
                      <input
                        type="number"
                        className="w-24 text-sm font-sans border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                        value={customTermDays}
                        onChange={(e) => setCustomTermDays(e.target.value)}
                        placeholder="DAYS"
                        min="1"
                      />
                    )}
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-8 md:p-12 border-t border-border-subtle bg-white/50 flex justify-between items-center">
          <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">Fidelity Verification Pending</p>
          <div className="flex gap-12">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-foreground transition-all"
            >
              Discard Entry
            </button>
            <button
              type="submit"
              form="customer-form"
              className="px-16 py-4 bg-foreground text-background text-[10px] font-sans font-black uppercase tracking-[0.3em] rounded-full hover:bg-black transition-all shadow-xl shadow-black/5"
            >
              {client ? "Update Profile" : "Finalize Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

