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
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Active Services</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left">Name</th>
                  <th className="py-2 px-4 text-left">Description</th>
                  <th className="py-2 px-4 text-left">SAC Code</th>
                  <th className="py-2 px-4 text-right">Rate (₹)</th>
                  <th className="py-2 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeServices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">
                      No active services found
                    </td>
                  </tr>
                ) : (
                  activeServices.map((service) => (
                    <tr key={service.id} className="border-t hover:bg-gray-50">
                      <td className="py-2 px-4 font-medium">{service.name}</td>
                      <td className="py-2 px-4 text-gray-600">{service.description || "—"}</td>
                      <td className="py-2 px-4">{service.sacCode || "—"}</td>
                      <td className="py-2 px-4 text-right font-medium">
                        ₹{service.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() => openModal(service)}
                          className="text-blue-500 hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(service)}
                          className="text-orange-500 hover:underline mr-3"
                        >
                          Deactivate
                        </button>
                        <button
                          onClick={() => deleteService(service)}
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
        </div>

        {/* Inactive Services */}
        {inactiveServices.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Inactive Services</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border opacity-60">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 text-left">Name</th>
                    <th className="py-2 px-4 text-left">Description</th>
                    <th className="py-2 px-4 text-left">SAC Code</th>
                    <th className="py-2 px-4 text-right">Rate (₹)</th>
                    <th className="py-2 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveServices.map((service) => (
                    <tr key={service.id} className="border-t hover:bg-gray-50">
                      <td className="py-2 px-4">{service.name}</td>
                      <td className="py-2 px-4">{service.description || "—"}</td>
                      <td className="py-2 px-4">{service.sacCode || "—"}</td>
                      <td className="py-2 px-4 text-right">
                        ₹{service.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() => toggleActive(service)}
                          className="text-green-500 hover:underline mr-3"
                        >
                          Activate
                        </button>
                        <button
                          onClick={() => deleteService(service)}
                          className="text-red-500 hover:underline"
                        >
                          Delete
                        </button>
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
