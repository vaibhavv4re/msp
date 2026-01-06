import { useState } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import schema from "@/instant.schema";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getFY } from "@/lib/invoiceUtils";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/device";
import { BusinessForm } from "./forms/BusinessForm";
import { DesktopModalLayout } from "./layout/FormLayout";
import { Business, BankAccount, Client, Invoice, Tax, TermsTemplate } from "@/types";

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
  const [activeTab, setActiveTab] = useState<"businesses" | "taxes" | "terms" | "usage">("businesses");

  return (
    <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm animate-in fade-in duration-500">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">Settings</h1>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Global Configurations</p>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: "businesses", label: "Businesses" },
          { id: "taxes", label: "Taxes" },
          { id: "terms", label: "Terms Templates" },
          { id: "usage", label: "Usage Tracker" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
              ? "bg-gray-900 text-white shadow-xl shadow-gray-200"
              : "text-gray-400 hover:text-gray-900 hover:bg-white"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "businesses" && (
          <BusinessesTab businesses={businesses} userId={userId} />
        )}
        {activeTab === "taxes" && (
          <TaxesTab taxes={taxes} userId={userId} activeBusinessId={activeBusinessId} />
        )}
        {activeTab === "terms" && (
          <TermsTab
            termsTemplates={termsTemplates}
            userId={userId}
            activeBusinessId={activeBusinessId}
          />
        )}
        {activeTab === "usage" && (
          <UsageTrackerTab invoices={invoices} clients={clients} />
        )}
      </div>
    </div>
  );
}

function BusinessesTab({ businesses, userId }: { businesses: Business[]; userId: string }) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  const openModal = (business: Business | null = null) => {
    if (isMobile) {
      if (business) {
        router.push(`/business/new?id=${business.id}`);
      } else {
        router.push("/business/new");
      }
      return;
    }
    setEditingBusiness(business);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBusiness(null);
  };

  const deleteBusiness = async (business: Business) => {
    if (confirm(`Delete "${business.name}"?`)) {
      db.transact([db.tx.businesses[business.id].delete()]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
            Workspace Profiles
          </h3>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">
            Manage your brand identities
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gray-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200"
        >
          Add Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((biz) => (
          <div
            key={biz.id}
            className="group relative bg-white border border-gray-100 rounded-[2.5rem] p-8 hover:shadow-xl hover:shadow-gray-200/50 transition-all"
          >
            <div
              className="absolute top-0 left-0 w-full h-1.5 rounded-t-[2.5rem]"
              style={{ backgroundColor: biz.color || "#374151" }}
            />
            <div className="flex justify-between items-start mb-6">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl"
                style={{ backgroundColor: biz.color || "#374151" }}
              >
                {biz.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(biz)}
                  className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteBusiness(biz)}
                  className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
            <h4 className="font-black text-gray-900 uppercase text-base tracking-tight mb-1">
              {biz.name}
            </h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest underline decoration-gray-100 underline-offset-4">
              {biz.email}
            </p>
          </div>
        ))}
      </div>

      {isModalOpen && !isMobile && (
        <DesktopModalLayout
          title={editingBusiness ? "Edit Workspace" : "New Workspace"}
          onClose={closeModal}
        >
          <BusinessForm
            initialBusiness={editingBusiness}
            userId={userId}
            onSuccess={closeModal}
            onCancel={closeModal}
          />
        </DesktopModalLayout>
      )}
    </div>
  );
}

function SectionHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-[10px] font-black text-white">
        {number}
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">{title}</h3>
    </div>
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
                  <td className="py-2 px-4 font-black uppercase text-xs tracking-tight">{tax.name || "Unnamed Tax"}</td>
                  <td className="py-2 px-4">{tax.taxType || "Tax"}</td>
                  <td className="py-2 px-4 text-right">{tax.rate || 0}%</td>
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
  const [rate, setRate] = useState(tax?.rate?.toString() || "");

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
                  <h4 className="font-semibold text-lg">{terms.title || "Untitled Template"}</h4>
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
                {terms.content || "No content provided."}
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
                    <td className="py-2 px-4 font-medium">{invoice.invoiceNumber || "—"}</td>
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
