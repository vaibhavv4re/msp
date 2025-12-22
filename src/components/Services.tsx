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
    <div className="bg-[#FAF9F7] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-24 space-y-16">
        {/* Editorial Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border-subtle pb-12">
          <div className="space-y-4">
            <h2 className="text-6xl md:text-8xl font-serif tracking-tighter text-foreground">
              Inventory
            </h2>
            <p className="text-xs md:text-sm font-sans text-muted uppercase tracking-[0.3em] max-w-md leading-relaxed">
              A curated catalogue of creative offerings and professional modalities.
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-4 text-[10px] font-sans font-black uppercase tracking-[0.2em] group border border-foreground px-8 py-4 rounded-full transition-all hover:bg-foreground hover:text-background"
          >
            Register Offering
          </button>
        </header>

        {/* Narrative Filters */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-12">
          <div className="space-y-4">
            <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Locate Offering</label>
            <input
              type="text"
              placeholder="SEARCH BY NAME OR DESCRIPTION..."
              className="w-full text-xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 placeholder:text-muted/30 uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-24">
          {/* Active Offerings */}
          <section className="space-y-12">
            <div className="flex justify-between items-end border-b border-border-subtle pb-4">
              <h3 className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">Active Portfolio</h3>
              <p className="text-[10px] font-sans italic text-muted">{activeServices.length} items listed</p>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-12">
              {activeServices.length === 0 ? (
                <div className="py-24 text-center">
                  <p className="text-xl font-serif italic text-muted">No active offerings detected.</p>
                </div>
              ) : (
                activeServices.map((service) => (
                  <div key={service.id} className="space-y-6 pb-12 border-b border-border-subtle last:border-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="text-3xl font-serif tracking-tighter">{service.name}</h4>
                        <span className="text-[10px] font-serif italic text-muted">₹{service.rate.toLocaleString('en-IN')}</span>
                      </div>
                      {service.sacCode && (
                        <p className="text-[8px] font-sans font-black text-muted uppercase tracking-[0.2em]">SAC: {service.sacCode}</p>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm font-serif text-muted leading-relaxed line-clamp-2 italic">“{service.description}”</p>
                    )}
                    <div className="flex gap-8 items-center pt-4">
                      <button
                        onClick={() => openModal(service)}
                        className="text-[9px] font-sans font-black uppercase tracking-[0.2em] border-b border-foreground pb-1"
                      >
                        Modify
                      </button>
                      <button
                        onClick={() => toggleActive(service)}
                        className="text-[9px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors"
                      >
                        Retire
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left">
                    <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Name & Classification</th>
                    <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Description</th>
                    <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Rate (₹)</th>
                    <th className="pb-8 text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeServices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-24 text-center">
                        <p className="text-2xl font-serif italic text-muted">Catalogue currently devoid of active offerings.</p>
                      </td>
                    </tr>
                  ) : (
                    activeServices.map((service) => (
                      <tr key={service.id} className="group hover:bg-black/[0.02] transition-colors">
                        <td className="py-8 border-b border-border-subtle/50">
                          <div className="text-2xl font-serif tracking-tight">{service.name}</div>
                          {service.sacCode && (
                            <div className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.2em] mt-1">SAC: {service.sacCode}</div>
                          )}
                        </td>
                        <td className="py-8 border-b border-border-subtle/50 max-w-md">
                          <div className="text-sm font-serif text-muted italic line-clamp-2 leading-relaxed">
                            {service.description || "—"}
                          </div>
                        </td>
                        <td className="py-8 border-b border-border-subtle/50">
                          <div className="text-2xl font-serif tracking-tight">
                            {service.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="py-8 border-b border-border-subtle/50">
                          <div className="flex justify-end gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openModal(service)}
                              className="text-muted hover:text-foreground transition-colors"
                              title="Edit Name"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button
                              onClick={() => toggleActive(service)}
                              className="text-muted hover:text-foreground transition-colors"
                              title="Retire from Catalogue"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                            </button>
                            <button
                              onClick={() => deleteService(service)}
                              className="text-muted hover:text-status-overdue transition-colors"
                              title="Purge Record"
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
          </section>

          {/* Retired Offerings */}
          {inactiveServices.length > 0 && (
            <section className="space-y-12 pt-12">
              <div className="flex justify-between items-end border-b border-border-subtle pb-4">
                <h3 className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">Archived Modalities</h3>
                <p className="text-[10px] font-sans italic text-muted">Status: Inactive</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 opacity-60">
                {inactiveServices.map((service) => (
                  <div key={service.id} className="space-y-4 pb-8 border-b border-border-subtle group hover:opacity-100 transition-opacity">
                    <div className="space-y-1">
                      <h4 className="text-xl font-serif text-muted group-hover:text-foreground transition-colors">{service.name}</h4>
                      <p className="text-[8px] font-sans font-black text-muted uppercase tracking-widest">{service.sacCode || "NO SAC"}</p>
                    </div>
                    <div className="flex gap-6 pt-2">
                      <button
                        onClick={() => toggleActive(service)}
                        className="text-[9px] font-sans font-black uppercase tracking-[0.2em] border-b border-muted group-hover:border-foreground transition-colors"
                      >
                        Reinstate
                      </button>
                      <button
                        onClick={() => deleteService(service)}
                        className="text-[9px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-status-overdue transition-colors"
                      >
                        Purge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {isModalOpen && (
          <ServiceModal service={editingService} userId={userId} onClose={closeModal} />
        )}
      </div>
    </div>
  );
}

export function ServiceModal({
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
      alert("Please enter a name for this service");
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
      db.transact([
        db.tx.services[serviceId].update(serviceData),
        db.tx.services[serviceId].link({ owner: userId })
      ]);
    } else {
      db.transact(db.tx.services[serviceId].update(serviceData));
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-[#FAF9F7]/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-12">
      <div className="bg-[#FAF9F7] w-full max-w-4xl max-h-[95vh] border border-border-subtle shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-8 md:p-12 border-b border-border-subtle flex justify-between items-end bg-white/50">
          <div className="space-y-4">
            <h3 className="text-4xl md:text-5xl font-serif tracking-tighter">
              {service ? "Revise Modality" : "Register Offering"}
            </h3>
            <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">
              {service ? "CATALOGUE REF: " + service.id.slice(0, 8).toUpperCase() : "APPENDING TO PORTFOLIO"}
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
          <form id="service-form" onSubmit={handleSubmit} className="space-y-24">
            {/* Primary Details */}
            <section className="space-y-12">
              <div className="space-y-4">
                <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Service Name</label>
                <input
                  type="text"
                  className="w-full text-4xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 tracking-tighter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Offering Name..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Rate (₹)</label>
                  <input
                    type="number"
                    className="w-full text-2xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">SAC Classification</label>
                  <input
                    type="text"
                    className="w-full text-2xl font-serif border-b border-border-subtle bg-transparent focus:border-foreground py-2 tracking-widest"
                    value={sacCode}
                    onChange={(e) => setSacCode(e.target.value)}
                    placeholder="998XXX..."
                  />
                </div>
              </div>

              <div className="space-y-4 pt-12 border-t border-border-subtle">
                <label className="text-[9px] font-sans font-black text-muted uppercase tracking-[0.3em]">Description</label>
                <textarea
                  className="w-full text-lg font-serif italic text-muted border border-border-subtle p-6 bg-transparent min-h-[160px] focus:outline-none focus:border-foreground transition-colors leading-relaxed"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the essence of this offering..."
                />
              </div>
            </section>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-8 md:p-12 border-t border-border-subtle bg-white/50 flex justify-between items-center">
          <p className="text-[10px] font-sans font-black text-muted uppercase tracking-[0.4em]">Fidelity Verification Required</p>
          <div className="flex gap-12">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-muted hover:text-foreground transition-all"
            >
              Discard Change
            </button>
            <button
              type="submit"
              form="service-form"
              className="px-16 py-4 bg-foreground text-background text-[10px] font-sans font-black uppercase tracking-[0.3em] rounded-full hover:bg-black transition-all shadow-xl shadow-black/5"
            >
              {service ? "Update Record" : "Append to Catalogue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
