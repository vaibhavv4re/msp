import { useState } from "react";
import { db } from "@/lib/db";
import { id, InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import schema from "@/instant.schema";
import { Business, BankAccount } from "@/app/page";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getFY } from "@/lib/invoiceUtils";

export type Client = InstaQLEntity<AppSchema, "clients">;
export type Invoice = InstaQLEntity<AppSchema, "invoices"> & {
  client?: Client;
};

type Tax = InstaQLEntity<typeof schema, "taxes">;

type TermsTemplate = InstaQLEntity<typeof schema, "termsTemplates">;

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
  activeBusinessId,
  invoices,
  clients,
  businesses,
}: {
  taxes: Tax[];
  termsTemplates: TermsTemplate[];
  userId: string;
  activeBusinessId: string;
  invoices: Invoice[];
  clients: Client[];
  businesses: Business[];
}) {
  const [activeTab, setActiveTab] = useState<"taxes" | "terms" | "usage" | "businesses">("taxes");

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      <div className="border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
        <nav className="-mb-px flex space-x-8 min-w-max px-1">
          <button
            onClick={() => setActiveTab("taxes")}
            className={`${activeTab === "taxes"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Taxes
          </button>
          <button
            onClick={() => setActiveTab("terms")}
            className={`${activeTab === "terms"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Terms & Conditions
          </button>
          <button
            onClick={() => setActiveTab("usage")}
            className={`${activeTab === "usage"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Usage Rights & Licensing
          </button>
          <button
            onClick={() => setActiveTab("businesses")}
            className={`${activeTab === "businesses"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Businesses
          </button>
        </nav>
      </div>

      {activeTab === "taxes" && <TaxesTab taxes={taxes} userId={userId} activeBusinessId={activeBusinessId} />}
      {activeTab === "terms" && <TermsTab termsTemplates={termsTemplates} userId={userId} activeBusinessId={activeBusinessId} />}
      {activeTab === "usage" && <UsageTrackerTab invoices={invoices} clients={clients} />}
      {activeTab === "businesses" && <BusinessesTab businesses={businesses} userId={userId} />}
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Business Profiles</h3>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">
            Manage your brand identities and statutory information
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200"
        >
          Add Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {businesses.length === 0 ? (
          <div className="col-span-full bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 p-12 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No profiles established</p>
          </div>
        ) : (
          businesses.map((business) => (
            <div
              key={business.id}
              className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 w-1.5 h-full"
                style={{ backgroundColor: business.color || "#374151" }}
              />

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl"
                    style={{ backgroundColor: business.color || "#374151" }}
                  >
                    {business.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 uppercase text-base tracking-tight">{business.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{business.businessType || "Business Entity"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(business)}
                    className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <button
                    onClick={() => deleteBusiness(business)}
                    className="p-2 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">PAN</span>
                  <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{business.pan || "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">GST</span>
                  <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{business.gst || "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Accounts</span>
                  <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{business.bankAccounts?.length || 0} Connected</span>
                </div>
              </div>

              {business.signatureUrl && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Signature</span>
                  <div className="h-8 w-20 bg-gray-50 rounded flex items-center justify-center p-1">
                    <img src={business.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain mix-blend-multiply opacity-70" />
                  </div>
                </div>
              )}
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

function SectionHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-[10px]">{number}</div>
      <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">{title}</h4>
      <div className="flex-1 h-px bg-gray-100"></div>
    </div>
  );
}

export function BusinessModal({
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
    legalName: business?.legalName || "",
    businessType: business?.businessType || "Individual",
    address: business?.address || "",
    city: business?.city || "",
    state: business?.state || "",
    pin: business?.pin || "",
    country: business?.country || "India",
    contact: business?.contact || "",
    email: business?.email || "",
    pan: business?.pan || "",
    gst: business?.gst || "",
    gstType: business?.gstType || "Regular",
    whatsappNumber: (business as any)?.whatsappNumber || "",
    stateCode: business?.stateCode || "",
    isComposition: business?.isComposition || false,
    taxBehavior: business?.taxBehavior || "exclusive",
    color: business?.color || BUSINESS_COLORS[0].value,
    signatureUrl: business?.signatureUrl || "",
    invoicePrefix: (business as any)?.invoicePrefix || "INV",
    invoiceSeparator: (business as any)?.invoiceSeparator || "/",
    invoiceIncludeFY: (business as any)?.invoiceIncludeFY || false,
    invoiceFYFormat: (business as any)?.invoiceFYFormat || "FY25",
    invoiceStartNumber: (business as any)?.invoiceStartNumber || 1,
    invoicePadding: (business as any)?.invoicePadding || 4,
    invoiceTemplate: business?.invoiceTemplate || "classic",
  });

  const [bankAccounts, setBankAccounts] = useState<Partial<BankAccount>[]>(
    business?.bankAccounts?.length ? business.bankAccounts.map(b => ({ ...b })) : []
  );

  const [isUploading, setIsUploading] = useState(false);

  async function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadToCloudinary(file, "signatures");
      setFormData(prev => ({ ...prev, signatureUrl: res.secure_url }));
    } catch (err) {
      console.error("Signature upload failed:", err);
      alert("Failed to upload signature. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function addBankAccount() {
    setBankAccounts([
      ...bankAccounts,
      {
        id: id(),
        label: bankAccounts.length === 0 ? "Primary" : "Secondary",
        bankName: "",
        holderName: "",
        accountNumber: "",
        ifsc: "",
        upiId: "",
        chequeName: "",
        isActive: true,
      },
    ]);
  }

  function updateBankAccount(index: number, field: keyof BankAccount, value: any) {
    const next = [...bankAccounts];
    next[index] = { ...next[index], [field]: value };
    setBankAccounts(next);
  }

  function removeBankAccount(index: number) {
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a Brand Name");
      return;
    }

    const businessId = business?.id || id();
    const isNew = !business;

    const txs: any[] = [];
    if (isNew) {
      txs.push(db.tx.businesses[businessId].update(formData));
      txs.push(db.tx.businesses[businessId].link({ owner: userId }));
    } else {
      txs.push(db.tx.businesses[businessId].update(formData));
    }

    // Sync bank accounts
    // For simplicity, we delete existing bank accounts and re-create them or update them
    // Real implementation should probably match IDs
    const existingIds = business?.bankAccounts?.map(b => b.id) || [];
    const currentIds = bankAccounts.map(b => b.id).filter(Boolean) as string[];

    // Delete removed accounts
    existingIds.forEach(eid => {
      if (!currentIds.includes(eid)) {
        txs.push(db.tx.bankAccounts[eid].delete());
      }
    });

    // Update/Create current accounts
    bankAccounts.forEach(acc => {
      const accId = acc.id || id();
      txs.push(db.tx.bankAccounts[accId].update({
        label: acc.label,
        bankName: acc.bankName,
        holderName: acc.holderName,
        accountNumber: acc.accountNumber,
        ifsc: acc.ifsc,
        upiId: acc.upiId,
        chequeName: acc.chequeName,
        isActive: acc.isActive,
      }));
      txs.push(db.tx.bankAccounts[accId].link({ owner: userId }));
      txs.push(db.tx.bankAccounts[accId].link({ business: businessId }));
    });

    await db.transact(txs);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-10 py-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2 block">Configuration</span>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
              {business ? 'Refine Business Profile' : 'New Business Profile'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all hover:rotate-90"
          >
            ✕
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
          {/* Section 1: Business Identity */}
          <div>
            <SectionHeader number="01" title="Business Identity" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Brand Name (Display Name)</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Vogue Shots"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Legal Name (Optional)</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    placeholder="e.g. Vogue Shots Pvt Ltd"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Business Entity Type</label>
                  <select
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all appearance-none"
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  >
                    <option value="Individual">Individual</option>
                    <option value="Proprietorship">Proprietorship</option>
                    <option value="LLP">LLP</option>
                    <option value="Pvt Ltd">Pvt Ltd</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Brand Accent Color</label>
                  <div className="flex flex-wrap gap-3 p-2 bg-gray-50 rounded-2xl">
                    {BUSINESS_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c.value })}
                        className={`w-10 h-10 rounded-xl transition-all relative ${formData.color === c.value ? "scale-110 shadow-lg ring-2 ring-offset-2 ring-gray-900" : "opacity-40 hover:opacity-100"
                          }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {formData.color === c.value && (
                          <div className="absolute inset-0 flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Authorized Signature</label>
                  <div className="relative group">
                    <label className={`w-full h-32 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.signatureUrl ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>
                      {isUploading ? (
                        <div className="animate-pulse text-[10px] font-black text-gray-400 uppercase tracking-widest">Uploading...</div>
                      ) : formData.signatureUrl ? (
                        <div className="relative h-full w-full p-4 flex items-center justify-center">
                          <img src={formData.signatureUrl} alt="Signature" className="max-h-full object-contain mix-blend-multiply" />
                          <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Replace Signature</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <svg className="w-6 h-6 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Drop PNG/SVG here</span>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Address & Contacts */}
          <div>
            <SectionHeader number="02" title="Address & Contact Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Registered Office Address</label>
                <textarea
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Building, Area"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">City & PIN Code</label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    className="flex-1 bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    className="w-32 bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="PIN"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">State & Country</label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    className="flex-1 bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                  <input
                    type="text"
                    className="flex-1 bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Business Email</label>
                <input
                  type="email"
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="billing@brand.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Business Phone</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">WhatsApp Number (For Reminders)</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all border-2 border-blue-100 focus:border-blue-600"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Statutory & Tax Information */}
          <div>
            <SectionHeader number="03" title="Statutory & Tax Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">PAN Number</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all uppercase"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">GSTIN</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all uppercase"
                  value={formData.gst}
                  onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
                  placeholder="27ABCDE1234F1Z5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">GST Registration Type</label>
                <select
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all appearance-none"
                  value={formData.gstType}
                  onChange={(e) => setFormData({ ...formData, gstType: e.target.value })}
                >
                  <option value="Regular">Regular</option>
                  <option value="Composition">Composition</option>
                  <option value="Exempted">Exempted</option>
                  <option value="Unregistered">Unregistered</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">State Code</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                  value={formData.stateCode}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  placeholder="e.g. 27"
                />
              </div>
              <div className="flex items-center gap-4 pt-8">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isComposition: !formData.isComposition })}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.isComposition ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isComposition ? 'translate-x-6' : ''}`}></div>
                </button>
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Composition Scheme</span>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Default Tax Behavior</label>
                <div className="flex bg-gray-50 p-1 rounded-2xl">
                  {['inclusive', 'exclusive'].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setFormData({ ...formData, taxBehavior: b })}
                      className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.taxBehavior === b ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Invoice Numbering Presets */}
          <div>
            <SectionHeader number="04" title="Invoice Numbering Presets" />
            <div className="bg-gray-50 p-8 rounded-[32px] border border-gray-100 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Prefix</label>
                  <input
                    type="text"
                    className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900 transition-all shadow-sm"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase() })}
                    placeholder="INV, STX"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Separator</label>
                  <div className="relative">
                    <select
                      className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900 appearance-none transition-all shadow-sm"
                      value={formData.invoiceSeparator}
                      onChange={(e) => setFormData({ ...formData, invoiceSeparator: e.target.value })}
                    >
                      <option value="/">Slash (/)</option>
                      <option value="-">Dash (-)</option>
                      <option value=".">Dot (.)</option>
                      <option value="">None</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Start #</label>
                  <input
                    type="number"
                    className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900 transition-all shadow-sm"
                    value={formData.invoiceStartNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceStartNumber: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Padding</label>
                  <div className="relative">
                    <select
                      className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900 appearance-none transition-all shadow-sm"
                      value={formData.invoicePadding}
                      onChange={(e) => setFormData({ ...formData, invoicePadding: parseInt(e.target.value) })}
                    >
                      <option value="1">1 (No padding)</option>
                      <option value="2">01</option>
                      <option value="3">001</option>
                      <option value="4">0001</option>
                      <option value="5">00001</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-white rounded-[24px] border border-gray-100">
                <div className="space-y-4 max-w-md">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, invoiceIncludeFY: !formData.invoiceIncludeFY })}
                        className={`w-12 h-6 rounded-full transition-all relative ${formData.invoiceIncludeFY ? 'bg-black' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${formData.invoiceIncludeFY ? 'translate-x-6' : ''}`}></div>
                      </button>
                      <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Include Financial Year</span>
                    </div>
                  </div>
                  {formData.invoiceIncludeFY && (
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: `FY${getFY()}`, value: "FY25" },
                        { label: getFY(), value: "25" }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, invoiceFYFormat: opt.value })}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.invoiceFYFormat === opt.value ? 'bg-black text-white border-black shadow-lg shadow-gray-200' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.invoiceIncludeFY && (
                    <div className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-gray-900 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-[9px] font-bold text-gray-900 uppercase leading-relaxed tracking-tight">
                        Invoice numbering will automatically reset at the start of each financial year.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Live Preview</span>
                  <div className="px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-sm font-mono font-black text-black tracking-wider">
                      {formData.invoicePrefix}
                      {formData.invoiceSeparator}
                      {formData.invoiceIncludeFY ? `${formData.invoiceFYFormat === '25' ? getFY() : `FY${getFY()}`}${formData.invoiceSeparator}` : ''}
                      {String(formData.invoiceStartNumber).padStart(formData.invoicePadding, '0')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Section 5: PDF Template Selection */}
          <div>
            <SectionHeader number="05" title="Invoice PDF Template" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'classic', name: 'Classic', desc: 'Conservative & CA-Safe', icon: '🏛️' },
                { id: 'compact', name: 'Compact', desc: 'Space-Optimized (1 Page)', icon: '📄' },
                { id: 'creative', name: 'Creative', desc: 'Brand-Forward & Bold', icon: '🎨' }
              ].map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, invoiceTemplate: template.id })}
                  className={`relative flex flex-col items-center p-6 rounded-[32px] border-2 transition-all group ${formData.invoiceTemplate === template.id
                    ? 'border-gray-900 bg-gray-900 text-white shadow-xl scale-[1.02]'
                    : 'border-gray-100 bg-white hover:border-gray-200 text-gray-500 hover:scale-[1.01]'
                    }`}
                >
                  <div className={`text-4xl mb-4 transition-transform group-hover:scale-110 ${formData.invoiceTemplate === template.id ? 'opacity-100' : 'opacity-40'}`}>
                    {template.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest mb-1">{template.name}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-tight ${formData.invoiceTemplate === template.id ? 'text-gray-400' : 'text-gray-300'}`}>
                    {template.desc}
                  </span>

                  {formData.invoiceTemplate === template.id && (
                    <div className="absolute top-4 right-4 text-blue-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="text-[9px] font-bold text-blue-800 uppercase tracking-tight">
                This template will be used for all future exports for this business profile.
              </p>
            </div>
          </div>


          {/* Section 6: Payment Accounts */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <SectionHeader number="06" title="Payment Accounts" />
              <button
                type="button"
                onClick={addBankAccount}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
              >
                + Add Account
              </button>
            </div>

            <div className="space-y-6">
              {bankAccounts.length === 0 ? (
                <div className="bg-gray-50 rounded-3xl p-8 text-center border-2 border-dashed border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">No matching accounts found. Add your bank details for invoices.</p>
                </div>
              ) : (
                bankAccounts.map((acc, index) => (
                  <div key={index} className="bg-gray-50/50 rounded-3xl p-8 border border-gray-100 relative group/acc">
                    <button
                      type="button"
                      onClick={() => removeBankAccount(index)}
                      className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover/acc:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="lg:col-span-1">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Account Label</label>
                        <select
                          className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900"
                          value={acc.label}
                          onChange={(e) => updateBankAccount(index, 'label', e.target.value)}
                        >
                          <option value="Primary">Primary Account</option>
                          <option value="Secondary">Secondary Account</option>
                          <option value="Personal">Personal Account</option>
                        </select>
                      </div>
                      <div className="lg:col-span-1">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Bank Name</label>
                        <input
                          type="text"
                          className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900"
                          value={acc.bankName}
                          onChange={(e) => updateBankAccount(index, 'bankName', e.target.value)}
                          placeholder="HDFC, ICICI, etc."
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Account Holder Name</label>
                        <input
                          type="text"
                          className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900"
                          value={acc.holderName}
                          onChange={(e) => updateBankAccount(index, 'holderName', e.target.value)}
                          placeholder="Exact name as per passbook"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Account Number</label>
                        <input
                          type="text"
                          className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900"
                          value={acc.accountNumber}
                          onChange={(e) => updateBankAccount(index, 'accountNumber', e.target.value)}
                          placeholder="XXXXXXXXXXXX"
                        />
                      </div>
                      <div className="lg:col-span-1">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">IFSC Code</label>
                        <input
                          type="text"
                          className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900 uppercase"
                          value={acc.ifsc}
                          onChange={(e) => updateBankAccount(index, 'ifsc', e.target.value.toUpperCase())}
                          placeholder="HDFC0001234"
                        />
                      </div>
                      <div className="lg:col-span-1">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">UPI ID</label>
                        <input
                          type="text"
                          className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none border border-gray-100 focus:border-gray-900"
                          value={acc.upiId}
                          onChange={(e) => updateBankAccount(index, 'upiId', e.target.value)}
                          placeholder="username@okaxis"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-10 py-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-gray-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200"
          >
            {business ? 'Save Profile Changes' : 'Create Business Profile'}
          </button>
        </div>
      </div >
    </div >
  );
}

function TaxesTab({ taxes, userId, activeBusinessId }: { taxes: Tax[]; userId: string; activeBusinessId: string }) {
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
    // Unset all defaults first
    const txs = taxes
      .filter(t => t.isDefault && t.id !== tax.id)
      .map(t => db.tx.taxes[t.id].update({ isDefault: false }));

    // Set the selected one as default
    txs.push(db.tx.taxes[tax.id].update({ isDefault: true }));

    db.transact(txs);
  }

  function deleteTax(tax: Tax) {
    if (confirm(`Are you sure you want to delete "${tax.name}"?`)) {
      db.transact(db.tx.taxes[tax.id].delete());
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Configure tax rates for your invoices
        </p>
        <button
          onClick={() => openModal()}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Add Tax
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Business</th>
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Name</th>
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Type</th>
              <th className="py-2 px-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Rate (%)</th>
              <th className="py-2 px-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">Default</th>
              <th className="py-2 px-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {taxes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500">
                  No taxes configured. Add your first tax to get started.
                </td>
              </tr>
            ) : (
              taxes.map((tax) => (
                <tr key={tax.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4 font-medium text-xs">
                    {(tax as any).business ? (
                      <span className="flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest" style={{ color: (tax as any).business.color || '#000' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (tax as any).business.color || '#000' }}></div>
                        {(tax as any).business.name}
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Global</span>
                    )}
                  </td>
                  <td className="py-2 px-4 font-black uppercase text-xs tracking-tight">{tax.name}</td>
                  <td className="py-2 px-4">{tax.taxType}</td>
                  <td className="py-2 px-4 text-right">{tax.rate}%</td>
                  <td className="py-2 px-4 text-center">
                    {tax.isDefault ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => setDefault(tax)}
                        className="text-blue-500 hover:underline text-sm"
                      >
                        Set Default
                      </button>
                    )}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <button
                      onClick={() => openModal(tax)}
                      className="text-blue-500 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTax(tax)}
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
      </div>

      {isModalOpen && <TaxModal tax={editingTax} userId={userId} activeBusinessId={activeBusinessId} onClose={closeModal} />}
    </div>
  );
}

function TaxModal({
  tax,
  userId,
  activeBusinessId,
  onClose,
}: {
  tax: Tax | null;
  userId: string;
  activeBusinessId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(tax?.name || "");
  const [taxType, setTaxType] = useState(tax?.taxType || "CGST");
  const [rate, setRate] = useState(tax?.rate.toString() || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter a tax name");
      return;
    }

    if (!rate || parseFloat(rate) < 0) {
      alert("Please enter a valid rate");
      return;
    }

    const taxId = tax?.id || id();
    const taxData = {
      name: name.trim(),
      taxType: taxType,
      rate: parseFloat(rate),
      isDefault: tax?.isDefault ?? false,
    };

    const isNew = !tax;
    if (isNew) {
      // Creating new tax - link owner
      db.transact([
        db.tx.taxes[taxId].update(taxData),
        db.tx.taxes[taxId].link({ owner: userId })
      ]);
      if (activeBusinessId !== "ALL") {
        db.transact(db.tx.taxes[taxId].link({ business: activeBusinessId }));
      }
    } else {
      // Updating existing tax - no need to relink owner
      db.transact(db.tx.taxes[taxId].update(taxData));
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">
          {tax ? "Edit Tax" : "Add Tax"}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tax Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="border p-2 rounded-md w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., CGST 9%"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tax Type <span className="text-red-500">*</span>
              </label>
              <select
                className="border p-2 rounded-md w-full"
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                required
              >
                <option value="CGST">CGST</option>
                <option value="SGST">SGST</option>
                <option value="IGST">IGST</option>
                <option value="GST">GST</option>
                <option value="VAT">VAT</option>
                <option value="Service Tax">Service Tax</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Rate (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="border p-2 rounded-md w-full"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max="100"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              {tax ? "Update" : "Add"} Tax
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TermsTab({ termsTemplates, userId, activeBusinessId }: { termsTemplates: TermsTemplate[]; userId: string; activeBusinessId: string }) {
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
    // Unset all defaults first
    const txs = termsTemplates
      .filter(t => t.isDefault && t.id !== terms.id)
      .map(t => db.tx.termsTemplates[t.id].update({ isDefault: false }));

    // Set the selected one as default
    txs.push(db.tx.termsTemplates[terms.id].update({ isDefault: true }));

    db.transact(txs);
  }

  function deleteTerms(terms: TermsTemplate) {
    if (confirm(`Are you sure you want to delete "${terms.title}"?`)) {
      db.transact(db.tx.termsTemplates[terms.id].delete());
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Create reusable terms and conditions templates
        </p>
        <button
          onClick={() => openModal()}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Add Template
        </button>
      </div>

      <div className="space-y-4">
        {termsTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No templates found. Add your first template to get started.
          </div>
        ) : (
          termsTemplates.map((terms) => (
            <div
              key={terms.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {(terms as any).business ? (
                      <span className="flex items-center gap-1 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded bg-gray-50 border border-gray-100" style={{ color: (terms as any).business.color || '#000' }}>
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: (terms as any).business.color || '#000' }}></div>
                        {(terms as any).business.name}
                      </span>
                    ) : (
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-gray-50 border border-gray-100">Global</span>
                    )}
                  </div>
                  <h4 className="font-semibold text-lg">{terms.title}</h4>
                  {terms.isDefault && (
                    <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!terms.isDefault && (
                    <button
                      onClick={() => setDefault(terms)}
                      className="text-blue-500 hover:underline text-sm"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => openModal(terms)}
                    className="text-blue-500 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTerms(terms)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {terms.content}
              </p>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <TermsModal terms={editingTerms} userId={userId} activeBusinessId={activeBusinessId} onClose={closeModal} />
      )}
    </div>
  );
}

function TermsModal({
  terms,
  userId,
  activeBusinessId,
  onClose,
}: {
  terms: TermsTemplate | null;
  userId: string;
  activeBusinessId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(terms?.title || "");
  const [content, setContent] = useState(terms?.content || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!content.trim()) {
      alert("Please enter content");
      return;
    }

    const termsId = terms?.id || id();
    const termsData = {
      title: title.trim(),
      content: content.trim(),
      isDefault: terms?.isDefault ?? false,
    };

    const isNew = !terms;
    if (isNew) {
      // Creating new terms template - link owner
      db.transact([
        db.tx.termsTemplates[termsId].update(termsData),
        db.tx.termsTemplates[termsId].link({ owner: userId })
      ]);
      if (activeBusinessId !== "ALL") {
        db.transact(db.tx.termsTemplates[termsId].link({ business: activeBusinessId }));
      }
    } else {
      // Updating existing terms template - no need to relink owner
      db.transact(db.tx.termsTemplates[termsId].update(termsData));
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {terms ? "Edit Template" : "Add Template"}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Template Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="border p-2 rounded-md w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Standard Payment Terms"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Terms & Conditions <span className="text-red-500">*</span>
              </label>
              <textarea
                className="border p-2 rounded-md w-full font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your terms and conditions..."
                rows={12}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              {terms ? "Update" : "Add"} Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsageTrackerTab({ invoices, clients }: { invoices: Invoice[]; clients: Client[] }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Track usage rights and licensing for all your shoots
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 text-left">Invoice #</th>
              <th className="py-2 px-4 text-left">Client</th>
              <th className="py-2 px-4 text-left">Usage Type</th>
              <th className="py-2 px-4 text-left">Duration</th>
              <th className="py-2 px-4 text-left">Geography</th>
              <th className="py-2 px-4 text-left">Exclusivity</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500">
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const client = clients.find(c => c.id === invoice.client?.id);
                const clientName = client?.displayName || client?.firstName || "N/A";

                return (
                  <tr key={invoice.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{invoice.invoiceNumber}</td>
                    <td className="py-2 px-4">{clientName}</td>
                    <td className="py-2 px-4">
                      {invoice.usageType === "Other" ? invoice.usageOther : invoice.usageType || (
                        <span className="text-gray-500 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-2 px-4">{invoice.usageDuration || <span className="text-gray-500 italic">Not set</span>}</td>
                    <td className="py-2 px-4">{invoice.usageGeography || <span className="text-gray-500 italic">Not set</span>}</td>
                    <td className="py-2 px-4">{invoice.usageExclusivity || <span className="text-gray-500 italic">Not set</span>}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
