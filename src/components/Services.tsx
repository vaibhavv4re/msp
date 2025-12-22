import { useState } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";

type Service = {
  id: string;
  name: string;
  description?: string;
  sacCode?: string;
  rate: number;
  isActive: boolean;
};

export function Services({ services, userId }: { services: Service[]; userId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredServices = services.filter((service) => {
    const name = service.name.toLowerCase();
    const description = service.description?.toLowerCase() || "";
    const sacCode = service.sacCode?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return name.includes(term) || description.includes(term) || sacCode.includes(term);
  });

  const activeServices = filteredServices.filter(s => s.isActive);
  const inactiveServices = filteredServices.filter(s => !s.isActive);

  function openModal(service: Service | null = null) {
    setEditingService(service);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingService(null);
  }

  function toggleActive(service: Service) {
    db.transact(db.tx.services[service.id].update({ isActive: !service.isActive }));
  }

  function deleteService(service: Service) {
    if (confirm(`Are you sure you want to delete "${service.name}"?`)) {
      db.transact(db.tx.services[service.id].delete());
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Services / Items</h2>
        <button
          onClick={() => openModal()}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Add Service
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, description, or SAC code"
          className="border p-2 rounded-md w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {/* Active Services */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 text-gray-400">Active Services</h3>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {activeServices.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No active services</p>
              </div>
            ) : (
              activeServices.map((service) => (
                <div key={service.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-all">
                  <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-900 uppercase tracking-tight truncate leading-tight mb-1">
                        {service.name}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{service.sacCode || "No SAC Code"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900 leading-none">₹{service.rate.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {service.description && (
                    <div className="px-4 py-3 bg-gray-50/50">
                      <p className="text-[11px] font-bold text-gray-600 leading-relaxed">{service.description}</p>
                    </div>
                  )}

                  <div className="p-3 bg-white flex gap-2 border-t border-gray-100">
                    <button
                      onClick={() => openModal(service)}
                      className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(service)}
                      className="flex-1 py-3 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Deactivate
                    </button>
                    <button
                      onClick={() => deleteService(service)}
                      className="px-4 py-3 bg-red-50 text-red-600 rounded-xl active:scale-95 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border rounded-xl overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Name</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Description</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">SAC Code</th>
                  <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Rate (₹)</th>
                  <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeServices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm font-black text-gray-400 uppercase tracking-widest">
                      No active services found
                    </td>
                  </tr>
                ) : (
                  activeServices.map((service) => (
                    <tr key={service.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-gray-900">{service.name}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 leading-relaxed font-bold">{service.description || "—"}</td>
                      <td className="py-4 px-6 text-sm text-gray-500 font-mono">{service.sacCode || "—"}</td>
                      <td className="py-4 px-6 text-right font-black text-gray-900">
                        ₹{service.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center gap-4">
                          <button onClick={() => openModal(service)} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800">Edit</button>
                          <button onClick={() => toggleActive(service)} className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-800">Deactivate</button>
                          <button onClick={() => deleteService(service)} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-800">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inactive Services */}
        {inactiveServices.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 text-gray-400">Inactive Services</h3>

            {/* Mobile View */}
            <div className="md:hidden space-y-4 opacity-70">
              {inactiveServices.map((service) => (
                <div key={service.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grayscale">
                  <div className="p-4 border-b border-gray-50 flex justify-between items-start bg-gray-50">
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-500 uppercase tracking-tight truncate leading-tight mb-1">
                        {service.name}
                      </h3>
                    </div>
                  </div>
                  <div className="p-3 bg-white flex gap-2">
                    <button
                      onClick={() => toggleActive(service)}
                      className="flex-1 py-3 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => deleteService(service)}
                      className="px-4 py-3 bg-red-50 text-red-600 rounded-xl"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto opacity-70">
              <table className="min-w-full bg-white border border-gray-100 rounded-xl overflow-hidden grayscale">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="py-4 px-6 text-left">Name</th>
                    <th className="py-4 px-6 text-left">Description</th>
                    <th className="py-4 px-6 text-left">SAC Code</th>
                    <th className="py-4 px-6 text-right">Rate (₹)</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveServices.map((service) => (
                    <tr key={service.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-gray-400">{service.name}</td>
                      <td className="py-4 px-6 text-sm text-gray-400 font-bold">{service.description || "—"}</td>
                      <td className="py-4 px-6 text-sm text-gray-400 font-mono">{service.sacCode || "—"}</td>
                      <td className="py-4 px-6 text-right font-black text-gray-400">
                        ₹{service.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center gap-4">
                          <button onClick={() => toggleActive(service)} className="text-[10px] font-black uppercase tracking-widest text-green-600 hover:text-green-800">Activate</button>
                          <button onClick={() => deleteService(service)} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-800">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ServiceModal service={editingService} userId={userId} onClose={closeModal} />
      )}
    </div>
  );
}

function ServiceModal({
  service,
  userId,
  onClose,
}: {
  service: Service | null;
  userId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [sacCode, setSacCode] = useState(service?.sacCode || "");
  const [rate, setRate] = useState(service?.rate.toString() || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter a service name");
      return;
    }

    if (!rate || parseFloat(rate) < 0) {
      alert("Please enter a valid rate");
      return;
    }

    const serviceId = service?.id || id();
    const serviceData = {
      name: name.trim(),
      description: description.trim() || undefined,
      sacCode: sacCode.trim() || undefined,
      rate: parseFloat(rate),
      isActive: service?.isActive ?? true,
    };

    const isNew = !service;
    if (isNew) {
      // Creating new service - link owner
      db.transact([
        db.tx.services[serviceId].update(serviceData),
        db.tx.services[serviceId].link({ owner: userId })
      ]);
    } else {
      // Updating existing service - no need to relink owner
      db.transact(db.tx.services[serviceId].update(serviceData));
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-xl font-bold mb-4">
          {service ? "Edit Service" : "Add Service"}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Service Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="border p-2 rounded-md w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Wedding Photography, Portrait Session"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">SAC Code</label>
              <input
                type="text"
                className="border p-2 rounded-md w-full"
                value={sacCode}
                onChange={(e) => setSacCode(e.target.value)}
                placeholder="e.g., 998599"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Rate (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="border p-2 rounded-md w-full"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="border p-2 rounded-md w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of the service"
                rows={3}
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
              {service ? "Update" : "Add"} Service
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
