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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
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

      {activeTab === "taxes" && <TaxesTab taxes={taxes} userId={userId} />}
      {activeTab === "terms" && <TermsTab termsTemplates={termsTemplates} userId={userId} />}
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Manage your business profiles for invoices
        </p>
        <button
          onClick={() => openModal()}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Add Business
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No businesses found. Add your first business to get started.
          </div>
        ) : (
          businesses.map((business) => (
            <div
              key={business.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow relative overflow-hidden"
              style={{ borderLeft: `4px solid ${business.color || "#374151"}` }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-lg">{business.name}</h4>
                  <p className="text-xs text-gray-500">{business.email || business.contact || "No contact info"}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(business)}
                    className="text-blue-500 hover:underline text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBusiness(business)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="text-xs space-y-1 mt-3">
                {business.address && (
                  <p className="truncate"><span className="font-medium text-gray-500">Add:</span> {business.address}</p>
                )}
                {business.pan && (
                  <p><span className="font-medium text-gray-500">PAN:</span> {business.pan}</p>
                )}
                {business.gst && (
                  <p><span className="font-medium text-gray-500">GST:</span> {business.gst}</p>
                )}
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
      alert("Please enter a business name");
      return;
    }

    const businessId = business?.id || id();
    const isNew = !business;

    if (isNew) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {business ? "Edit Business" : "Add Business"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="border p-2 rounded-md w-full"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., My Photography Studio"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Number</label>
              <input
                type="text"
                className="border p-2 rounded-md w-full"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="border p-2 rounded-md w-full"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="studio@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              className="border p-2 rounded-md w-full"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full business address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">PAN Number</label>
              <input
                type="text"
                className="border p-2 rounded-md w-full"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                placeholder="ABCDE1234F"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">GST Number</label>
              <input
                type="text"
                className="border p-2 rounded-md w-full"
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                placeholder="27ABCDE1234F1Z5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Business Color (Color Code)</label>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c.value ? "border-black scale-110" : "border-transparent"
                    }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
              {business ? "Update" : "Add"} Business
            </button>
          </div>
        </form>
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
              <th className="py-2 px-4 text-left">Name</th>
              <th className="py-2 px-4 text-left">Type</th>
              <th className="py-2 px-4 text-right">Rate (%)</th>
              <th className="py-2 px-4 text-center">Default</th>
              <th className="py-2 px-4 text-center">Actions</th>
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
                  <td className="py-2 px-4 font-medium">{tax.name}</td>
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
              <th className="py-2 px-4 text-left">Customer</th>
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
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-2 px-4">{invoice.usageDuration || <span className="text-gray-400 italic">Not set</span>}</td>
                    <td className="py-2 px-4">{invoice.usageGeography || <span className="text-gray-400 italic">Not set</span>}</td>
                    <td className="py-2 px-4">{invoice.usageExclusivity || <span className="text-gray-400 italic">Not set</span>}</td>
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
