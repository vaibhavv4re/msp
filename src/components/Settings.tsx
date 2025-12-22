import { useState } from "react";
import { db } from "@/lib/db";
import { id, InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import { Business } from "@/app/page";

export type Client = InstaQLEntity<AppSchema, "clients">;
export type Invoice = InstaQLEntity<AppSchema, "invoices"> & {
  client?: Client;
};

type Tax = {
  id: string;
  name: string;
  taxType: string;
  rate: number;
  isDefault: boolean;
};

type TermsTemplate = {
  id: string;
  title: string;
  content: string;
  isDefault: boolean;
};

const BUSINESS_COLORS = [
  { name: "Gray", value: "#374151" },
  { name: "Red", value: "#dc2626" },
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#16a34a" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
  { name: "Orange", value: "#ea580c" },
];

export function Settings({
  taxes,
  termsTemplates,
  userId,
  invoices,
  clients,
  businesses,
}: {
  taxes: Tax[];
  termsTemplates: TermsTemplate[];
  userId: string;
  invoices: Invoice[];
  clients: Client[];
  businesses: Business[];
}) {
  const [activeTab, setActiveTab] = useState<"taxes" | "terms" | "usage" | "businesses">("taxes");

  const tabs = [
    { id: "taxes", label: "Taxes" },
    { id: "terms", label: "Terms & Templates" },
    { id: "usage", label: "Usage Tracking" },
    { id: "businesses", label: "Businesses" },
  ];

  return (
    <div className="bg-[#FAF9F7] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-24 space-y-16">
        {/* Editorial Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border-subtle pb-12">
          <div className="space-y-4">
            <h2 className="text-6xl md:text-8xl font-serif tracking-tighter text-foreground">
              Protocol
            </h2>
            <p className="text-xs md:text-sm font-sans text-muted uppercase tracking-[0.3em] max-w-md leading-relaxed">
              Manage your business details, taxes, and terms for your invoices.
            </p>
          </div>
        </header>

        {/* Narrative Tabs */}
        <div className="border-b border-border-subtle">
          <nav className="flex flex-wrap gap-x-12 gap-y-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-[10px] font-sans font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted hover:text-foreground/60"
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 w-full h-[1px] bg-foreground" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-8">
          {activeTab === "taxes" && <TaxesTab taxes={taxes} userId={userId} />}
          {activeTab === "terms" && <TermsTab termsTemplates={termsTemplates} userId={userId} />}
          {activeTab === "usage" && <UsageTrackerTab invoices={invoices} clients={clients} />}
          {activeTab === "businesses" && <BusinessesTab businesses={businesses} userId={userId} />}
        </div>
      </div>
    </div>
  );
}

function BusinessesTab({ businesses, userId }: { businesses: Business[]; userId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  function openModal(business: Business | null = null) {
    setEditingBusiness(business);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingBusiness(null);
  }

  function deleteBusiness(business: Business) {
    if (confirm(`Are you sure you want to delete "${business.name}"?`)) {
      db.transact(db.tx.businesses[business.id].delete());
    }
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end border-b border-border-subtle pb-4">
        <h3 className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">Active Businesses</h3>
        <button
          onClick={() => openModal()}
          className="text-[10px] font-sans font-black uppercase tracking-[0.2em] border-b border-foreground pb-1"
        >
          Add Business
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {businesses.length === 0 ? (
          <div className="col-span-full py-24 text-center">
            <p className="text-xl font-serif italic text-muted">No businesses found in the record.</p>
          </div>
        ) : (
          businesses.map((business) => (
            <div
              key={business.id}
              className="space-y-6 pb-8 border-b border-border-subtle group hover:opacity-100 transition-opacity"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h4 className="text-3xl font-serif tracking-tighter">{business.name}</h4>
                  <div className="flex gap-2 items-center">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: business.color || "#1C1C1C" }} />
                    <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.2em]">{business.email || business.contact || "NO IDENTIFIER"}</p>
                  </div>
                </div>
                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(business)} className="text-muted hover:text-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </button>
                  <button onClick={() => deleteBusiness(business)} className="text-muted hover:text-status-overdue">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
              <div className="text-[10px] font-sans text-muted uppercase tracking-[0.2em] space-y-1">
                {business.address && <p className="line-clamp-1">{business.address}</p>}
                <div className="flex gap-4">
                  {business.pan && <p>PAN: {business.pan}</p>}
                  {business.gst && <p>GST: {business.gst}</p>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <BusinessModal business={editingBusiness} userId={userId} onClose={closeModal} />
      )}
    </div>
  );
}

function BusinessModal({
  business,
  userId,
  onClose,
}: {
  business: Business | null;
  userId: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: business?.name || "",
    address: business?.address || "",
    contact: business?.contact || "",
    email: business?.email || "",
    pan: business?.pan || "",
    gst: business?.gst || "",
    color: business?.color || BUSINESS_COLORS[0].value,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please provide the name of the business");
      return;
    }
    const businessId = business?.id || id();
    if (!business) {
      db.transact([
        db.tx.businesses[businessId].update(formData),
        db.tx.businesses[businessId].link({ owner: userId }),
      ]);
    } else {
      db.transact(db.tx.businesses[businessId].update(formData));
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-[#FAF9F7]/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-12">
      <div className="bg-[#FAF9F7] w-full max-w-4xl max-h-[95vh] border border-border-subtle shadow-2xl flex flex-col overflow-hidden">
        <div className="p-8 md:p-12 border-b border-border-subtle flex justify-between items-end bg-white/50">
          <div className="space-y-4">
            <h3 className="text-4xl md:text-5xl font-serif tracking-tighter">
              {business ? "Edit Business" : "Add Business"}
            </h3>
            <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">
              {business ? "BUSINESS REF: " + business.id.slice(0, 8).toUpperCase() : "ADDING NEW BUSINESS"}
            </p>
          </div>
          <button onClick={onClose} className="p-4 hover:rotate-90 transition-all duration-300">
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-8 md:p-12">
          <form id="business-form" onSubmit={handleSubmit} className="space-y-24">
            <section className="space-y-12">
              <div className="space-y-4">
                <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Business Name</label>
                <input
                  type="text"
                  className="w-full text-4xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 tracking-tighter"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Entity Name..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Phone Number</label>
                  <input
                    type="text"
                    className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="+91..."
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Email Address</label>
                  <input
                    type="email"
                    className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ADMIN@ENTITY.COM"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Business Address</label>
                <textarea
                  className="w-full text-lg font-serif italic text-muted border border-border-subtle p-6 bg-transparent min-h-[120px] focus:outline-none focus:border-foreground transition-all"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Physical headquarters..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">PAN Number</label>
                  <input
                    type="text"
                    className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 uppercase tracking-widest"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">GST Number</label>
                  <input
                    type="text"
                    className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 uppercase tracking-widest"
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
                    placeholder="27ABCDE1234F1Z5"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Signature Archetype (Color)</label>
                <div className="flex flex-wrap gap-4">
                  {BUSINESS_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className="w-8 h-8 rounded-full border border-border-subtle transition-all transition-transform hover:scale-125"
                      style={{
                        backgroundColor: c.value,
                        boxShadow: formData.color === c.value ? `0 0 0 2px #FAF9F7, 0 0 0 4px ${c.value}` : 'none'
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </section>
          </form>
        </div>

        <div className="p-8 md:p-12 border-t border-border-subtle bg-white/50 flex justify-between items-center">
          <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">Fidelity Verification Pending</p>
          <div className="flex gap-12">
            <button onClick={onClose} className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-foreground">Discard</button>
            <button type="submit" form="business-form" className="px-16 py-4 bg-foreground text-background text-[10px] font-sans font-black uppercase tracking-[0.3em] rounded-full hover:bg-black transition-all shadow-xl">
              {business ? "Update Business" : "Save Business"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxesTab({ taxes, userId }: { taxes: Tax[]; userId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  function openModal(tax: Tax | null = null) {
    setEditingTax(tax);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTax(null);
  }

  function setDefault(tax: Tax) {
    const txs = taxes.filter(t => t.isDefault && t.id !== tax.id).map(t => db.tx.taxes[t.id].update({ isDefault: false }));
    txs.push(db.tx.taxes[tax.id].update({ isDefault: true }));
    db.transact(txs);
  }

  function deleteTax(tax: Tax) {
    if (confirm(`Are you sure you want to delete "${tax.name}"?`)) {
      db.transact(db.tx.taxes[tax.id].delete());
    }
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end border-b border-border-subtle pb-4">
        <h3 className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">Tax Settings</h3>
        <button onClick={() => openModal()} className="text-[10px] font-sans font-black uppercase tracking-[0.2em] border-b border-foreground pb-1">Add Tax</button>
      </div>

      <div className="hidden md:block">
        <table className="w-full border-separate border-spacing-y-4">
          <thead>
            <tr className="text-left">
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">NAME</th>
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">TYPE</th>
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">RATE (%)</th>
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em] text-center">STATUS</th>
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em] text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {taxes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center text-xl font-serif italic text-muted">No taxes defined yet.</td>
              </tr>
            ) : (
              taxes.map((tax) => (
                <tr key={tax.id} className="group hover:bg-black/[0.02] transition-all">
                  <td className="py-8 border-b border-border-subtle/50 text-2xl font-serif tracking-tight">{tax.name}</td>
                  <td className="py-8 border-b border-border-subtle/50 text-[10px] font-sans font-black text-muted uppercase tracking-[0.2em]">{tax.taxType}</td>
                  <td className="py-8 border-b border-border-subtle/50 text-2xl font-serif">{tax.rate}%</td>
                  <td className="py-8 border-b border-border-subtle/50 text-center">
                    {tax.isDefault ? (
                      <span className="text-[8px] font-sans font-black text-foreground border border-foreground px-2 py-1 rounded-full uppercase tracking-widest">Primary</span>
                    ) : (
                      <button onClick={() => setDefault(tax)} className="text-[8px] font-sans font-black text-muted hover:text-foreground uppercase tracking-widest">Mark Primary</button>
                    )}
                  </td>
                  <td className="py-8 border-b border-border-subtle/50">
                    <div className="flex justify-end gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(tax)} className="text-muted hover:text-foreground"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                      <button onClick={() => deleteTax(tax)} className="text-muted hover:text-status-overdue"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-12">
        {taxes.map(tax => (
          <div key={tax.id} className="space-y-4 pb-12 border-b border-border-subtle last:border-0 group">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-3xl font-serif tracking-tighter">{tax.name}</h4>
                <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.2em]">{tax.taxType} • {tax.rate}%</p>
              </div>
              {tax.isDefault && <span className="text-[8px] font-sans font-black text-foreground border border-foreground px-2 py-1 rounded-full uppercase tracking-widest">Primary</span>}
            </div>
            <div className="flex gap-8 items-center pt-4">
              <button onClick={() => openModal(tax)} className="text-[9px] font-sans font-black uppercase tracking-[0.2em] border-b border-foreground pb-1">Edit</button>
              {!tax.isDefault && <button onClick={() => setDefault(tax)} className="text-[9px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-foreground">Set Primary</button>}
              <button onClick={() => deleteTax(tax)} className="text-[9px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-status-overdue">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && <TaxModal tax={editingTax} userId={userId} onClose={closeModal} />}
    </div>
  );
}

function TaxModal({
  tax,
  userId,
  onClose,
}: {
  tax: Tax | null;
  userId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(tax?.name || "");
  const [taxType, setTaxType] = useState(tax?.taxType || "CGST");
  const [rate, setRate] = useState(tax?.rate.toString() || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please provide the tax name");
      return;
    }
    const taxId = tax?.id || id();
    const taxData = {
      name: name.trim(),
      taxType: taxType,
      rate: parseFloat(rate),
      isDefault: tax?.isDefault ?? false,
    };
    if (!tax) {
      db.transact([
        db.tx.taxes[taxId].update(taxData),
        db.tx.taxes[taxId].link({ owner: userId })
      ]);
    } else {
      db.transact(db.tx.taxes[taxId].update(taxData));
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-[#FAF9F7]/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-12">
      <div className="bg-[#FAF9F7] w-full max-w-2xl border border-border-subtle shadow-2xl overflow-hidden">
        <div className="p-8 md:p-12 border-b border-border-subtle flex justify-between items-end">
          <div className="space-y-4">
            <h3 className="text-4xl font-serif tracking-tighter">{tax ? "Edit Tax" : "Add Tax"}</h3>
          </div>
          <button onClick={onClose} className="p-4 hover:rotate-90 duration-300 transition-all">
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-12">
          <form id="tax-form" onSubmit={handleSubmit} className="space-y-16">
            <div className="space-y-4">
              <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.4em]">Tax Name</label>
              <input type="text" className="w-full text-3xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 tracking-tighter" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CGST 9%" required />
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.4em]">Classification</label>
                <select className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 uppercase tracking-widest" value={taxType} onChange={(e) => setTaxType(e.target.value)}>
                  <option value="CGST">CGST</option><option value="SGST">SGST</option><option value="IGST">IGST</option><option value="GST">GST</option><option value="VAT">VAT</option><option value="Service Tax">Service Tax</option><option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.4em]">Tax Rate (%)</label>
                <input type="number" className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.00" step="0.01" min="0" max="100" required />
              </div>
            </div>
          </form>
        </div>
        <div className="p-12 border-t border-border-subtle bg-white/50 flex justify-end gap-12 items-center">
          <button type="button" onClick={onClose} className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-foreground">Discard</button>
          <button type="submit" form="tax-form" className="px-12 py-4 bg-foreground text-background text-[10px] font-sans font-black uppercase tracking-[0.3em] rounded-full hover:bg-black transition-all">Save Tax</button>
        </div>
      </div>
    </div>
  );
}

function TermsTab({ termsTemplates, userId }: { termsTemplates: TermsTemplate[]; userId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerms, setEditingTerms] = useState<TermsTemplate | null>(null);

  function openModal(terms: TermsTemplate | null = null) {
    setEditingTerms(terms);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTerms(null);
  }

  function setDefault(terms: TermsTemplate) {
    const txs = termsTemplates.filter(t => t.isDefault && t.id !== terms.id).map(t => db.tx.termsTemplates[t.id].update({ isDefault: false }));
    txs.push(db.tx.termsTemplates[terms.id].update({ isDefault: true }));
    db.transact(txs);
  }

  function deleteTerms(terms: TermsTemplate) {
    if (confirm(`Are you sure you want to delete "${terms.title}"?`)) {
      db.transact(db.tx.termsTemplates[terms.id].delete());
    }
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end border-b border-border-subtle pb-4">
        <h3 className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">Terms & Conditions</h3>
        <button onClick={() => openModal()} className="text-[10px] font-sans font-black uppercase tracking-[0.2em] border-b border-foreground pb-1">Add Terms</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {termsTemplates.length === 0 ? (
          <div className="col-span-full py-24 text-center text-xl font-serif italic text-muted">No terms found.</div>
        ) : (
          termsTemplates.map((terms) => (
            <div key={terms.id} className="space-y-6 pb-12 border-b border-border-subtle group hover:bg-black/[0.01] p-6 -m-6 transition-all">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h4 className="text-3xl font-serif tracking-tighter">{terms.title}</h4>
                  {terms.isDefault && <span className="text-[8px] font-sans font-black text-foreground border border-foreground px-2 py-1 rounded-full uppercase tracking-widest">Master Template</span>}
                </div>
                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!terms.isDefault && <button onClick={() => setDefault(terms)} className="text-[8px] font-sans font-black text-muted hover:text-foreground uppercase tracking-widest">Set Master</button>}
                  <button onClick={() => openModal(terms)} className="text-muted hover:text-foreground"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                  <button onClick={() => deleteTerms(terms)} className="text-muted hover:text-status-overdue"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>
              </div>
              <p className="text-sm font-serif text-muted italic line-clamp-4 leading-relaxed whitespace-pre-wrap">{terms.content}</p>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <TermsModal terms={editingTerms} userId={userId} onClose={closeModal} />
      )}
    </div>
  );
}

function TermsModal({
  terms,
  userId,
  onClose,
}: {
  terms: TermsTemplate | null;
  userId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(terms?.title || "");
  const [content, setContent] = useState(terms?.content || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Please provide the document title and content");
      return;
    }
    const termsId = terms?.id || id();
    const termsData = { title: title.trim(), content: content.trim(), isDefault: terms?.isDefault ?? false };
    if (!terms) {
      db.transact([
        db.tx.termsTemplates[termsId].update(termsData),
        db.tx.termsTemplates[termsId].link({ owner: userId })
      ]);
    } else {
      db.transact(db.tx.termsTemplates[termsId].update(termsData));
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-[#FAF9F7]/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-12">
      <div className="bg-[#FAF9F7] w-full max-w-5xl h-[90vh] border border-border-subtle shadow-2xl flex flex-col overflow-hidden">
        <div className="p-12 border-b border-border-subtle flex justify-between items-end">
          <h3 className="text-4xl font-serif tracking-tighter">{terms ? "Edit Terms" : "Add Terms"}</h3>
          <button onClick={onClose} className="p-4 hover:rotate-90 duration-300 transition-all">
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-12 space-y-16">
          <form id="terms-form" onSubmit={handleSubmit} className="space-y-16">
            <div className="space-y-4">
              <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.4em]">Terms Title</label>
              <input type="text" className="w-full text-3xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 tracking-tighter" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Standard Service Protocols" required />
            </div>
            <div className="space-y-4">
              <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.4em]">Terms Content</label>
              <textarea className="w-full text-lg font-serif italic text-muted border border-border-subtle p-8 bg-transparent min-h-[400px] focus:outline-none focus:border-foreground transition-all leading-relaxed" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Enter terms and conditions..." required />
            </div>
          </form>
        </div>
        <div className="p-12 border-t border-border-subtle bg-white/50 flex justify-end gap-12 items-center">
          <button type="button" onClick={onClose} className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-foreground">Discard</button>
          <button type="submit" form="terms-form" className="px-16 py-4 bg-foreground text-background text-[10px] font-sans font-black uppercase tracking-[0.3em] rounded-full hover:bg-black transition-all">Save Terms</button>
        </div>
      </div>
    </div>
  );
}

function UsageTrackerTab({ invoices, clients }: { invoices: Invoice[]; clients: Client[] }) {
  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end border-b border-border-subtle pb-4">
        <h3 className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">Usage Records</h3>
        <p className="text-[10px] font-sans italic text-muted">Tracking {invoices.length} entries</p>
      </div>

      <div className="hidden md:block">
        <table className="w-full border-separate border-spacing-y-4">
          <thead>
            <tr className="text-left">
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">ID</th>
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">CLIENT</th>
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">USAGE TYPE</th>
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">DURATION</th>
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">REGION</th>
              <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em] text-right">EXCLUSIVITY</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-24 text-center text-xl font-serif italic text-muted">No usage records found.</td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const client = clients.find(c => c.id === invoice.client?.id);
                const clientName = client?.displayName || client?.firstName || "N/A";
                return (
                  <tr key={invoice.id} className="group hover:bg-black/[0.02] transition-all">
                    <td className="py-6 border-b border-border-subtle/50 text-xl font-serif tracking-tighter">#{invoice.invoiceNumber}</td>
                    <td className="py-6 border-b border-border-subtle/50 text-[10px] font-sans font-black text-muted uppercase tracking-[0.2em]">{clientName}</td>
                    <td className="py-6 border-b border-border-subtle/50 text-sm font-serif italic">
                      {invoice.usageType === "Other" ? invoice.usageOther : invoice.usageType || "UNDEF"}
                    </td>
                    <td className="py-6 border-b border-border-subtle/50 text-sm font-serif italic">{invoice.usageDuration || "—"}</td>
                    <td className="py-6 border-b border-border-subtle/50 text-[10px] font-sans font-black text-muted uppercase tracking-[0.2em]">{invoice.usageGeography || "GLOBAL"}</td>
                    <td className="py-6 border-b border-border-subtle/50 text-right text-[10px] font-sans font-black uppercase tracking-[0.2em]">{invoice.usageExclusivity || "STANDARD"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-12">
        {invoices.map((invoice) => {
          const client = clients.find(c => c.id === invoice.client?.id);
          const clientName = client?.displayName || client?.firstName || "N/A";
          return (
            <div key={invoice.id} className="space-y-4 pb-12 border-b border-border-subtle last:border-0 overflow-hidden">
              <div className="flex justify-between items-start">
                <h4 className="text-3xl font-serif tracking-tighter">#{invoice.invoiceNumber}</h4>
                <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.2em]">{clientName}</p>
              </div>
              <div className="grid grid-cols-2 gap-8 text-[10px] font-sans uppercase tracking-[0.2em]">
                <div><p className="text-muted font-black">Type</p><p className="line-clamp-1">{invoice.usageType || "UNDEF"}</p></div>
                <div><p className="text-muted font-black">Region</p><p>{invoice.usageGeography || "GLOBAL"}</p></div>
                <div><p className="text-muted font-black">Duration</p><p>{invoice.usageDuration || "—"}</p></div>
                <div><p className="text-muted font-black">Exclusivity</p><p>{invoice.usageExclusivity || "STANDARD"}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
