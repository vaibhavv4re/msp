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

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 text-left">Display Name</th>
              <th className="py-2 px-4 text-left">Type</th>
              <th className="py-2 px-4 text-left">Contact</th>
              <th className="py-2 px-4 text-left">Payment Terms</th>
              <th className="py-2 px-4 text-center">Invoices</th>
              <th className="py-2 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500">
                  No customers found. Add your first customer to get started.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">
                    <div className="font-medium">{client.displayName || "—"}</div>
                    {client.companyName && (
                      <div className="text-sm text-gray-500">{client.companyName}</div>
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
                  <td className="py-2 px-4">
                    {PAYMENT_TERMS.find(t => t.value === client.paymentTerms)?.label || "—"}
                  </td>
                  <td className="py-2 px-4 text-center">
                    {client.invoices?.length || 0}
                  </td>
                  <td className="py-2 px-4 text-center">
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
      </div>

      {isModalOpen && (
        <CustomerModal client={editingClient} userId={userId} onClose={closeModal} />
      )}
    </div>
  );
}

function CustomerModal({
  client,
  userId,
  onClose,
}: {
  client: Client | null;
  userId: string;
  onClose: () => void;
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
      // Creating new customer - link owner
      db.transact([
        db.tx.clients[clientId].update(clientData),
        db.tx.clients[clientId].link({ owner: userId })
      ]);
    } else {
      // Updating existing customer - no need to relink owner
      db.transact(db.tx.clients[clientId].update(clientData));
    }
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
                <p className="text-xs text-gray-500 mt-1">
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
