"use client";
import React, { useState } from "react";
import { db } from "@/lib/db";
import { id, InstaQLEntity } from "@instantdb/react";
import schema from "@/instant.schema";
import { Business, Client, Invoice, LineItem, Estimate } from "@/app/page";
import { convertToInvoice } from "@/lib/estimateActions";
import { CustomerModal } from "./Customers";

type Service = { id: string; name: string; sacCode?: string; rate: number; isActive: boolean };
type Tax = { id: string; name: string; rate: number; isDefault: boolean };
type TermsTemplate = { id: string; title: string; content: string; isDefault: boolean };

interface EstimatesProps {
    estimates: Estimate[];
    clients: Client[];
    userId: string;
    services?: Service[];
    taxes?: Tax[];
    termsTemplates?: TermsTemplate[];
    businesses: Business[];
    activeBusinessId: string;
    allInvoices?: Invoice[];
    initiallyOpenModal?: boolean | string;
    onModalClose?: () => void;
}

export function Estimates({
    estimates,
    clients,
    userId,
    services,
    taxes,
    termsTemplates,
    businesses,
    activeBusinessId,
    allInvoices,
    initiallyOpenModal,
    onModalClose,
}: EstimatesProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [businessFilter, setBusinessFilter] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
    const [resolvingEstimate, setResolvingEstimate] = useState<Estimate | null>(null);

    React.useEffect(() => {
        if (initiallyOpenModal === true || initiallyOpenModal === "create-estimate") {
            setIsModalOpen(true);
            setEditingEstimate(null);
        } else if (typeof initiallyOpenModal === 'string' && initiallyOpenModal.startsWith('edit-estimate:')) {
            const estId = initiallyOpenModal.split(':')[1];
            const est = estimates.find(e => e.id === estId);
            if (est) {
                setEditingEstimate(est);
                setIsModalOpen(true);
            }
        }
    }, [initiallyOpenModal, estimates]);

    const filteredEstimates = estimates.filter((estimate) => {
        const client = clients.find((c) => c.id === estimate.client?.id);
        const name = estimate.recipientName || client?.displayName || client?.firstName || "";
        const estNumber = estimate.estimateNumber?.toLowerCase() || "";
        const term = searchTerm.toLowerCase();

        if (statusFilter !== "all" && estimate.status !== statusFilter) return false;
        if (businessFilter !== "all" && estimate.business?.id !== businessFilter) return false;

        return name.toLowerCase().includes(term) || estNumber.includes(term);
    });

    const sortedEstimates = [...filteredEstimates].sort((a, b) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );

    function openModal(estimate: Estimate | null = null) {
        setEditingEstimate(estimate);
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setEditingEstimate(null);
        if (onModalClose) onModalClose();
    }

    const deleteEstimate = async (idOfEstimate: string) => {
        if (!confirm("Are you sure you want to delete this estimate? This will remove all associated line items and the public link will no longer work.")) return;

        try {
            console.log("🗑️ Deleting estimate:", idOfEstimate);

            // Try standard cascade delete first (cleanest)
            await db.transact([
                db.tx.estimates[idOfEstimate].delete()
            ]);

            console.log("✅ Deletion finished");
        } catch (e: any) {
            console.warn("⚠️ Standard delete failed, trying manual cleanup:", e.message);
            try {
                // Manual cleanup fallback: find every linked item and delete it explicitly
                const targetEst = estimates.find(e => e.id === idOfEstimate);
                const txs: any[] = (targetEst?.lineItems || []).map(li => db.tx.lineItems[li.id].delete());
                txs.push(db.tx.estimates[idOfEstimate].delete());

                if (txs.length > 0) {
                    await db.transact(txs);
                    console.log("✅ Manual Backup Deletion Success");
                } else {
                    // If truly no items found, just try to delete the estimate object again
                    await db.transact([db.tx.estimates[idOfEstimate].delete()]);
                }
            } catch (innerError: any) {
                console.error("❌ Total delete failure:", innerError);
                alert(`Failed to delete: ${innerError.message}. This might be a database synchronization issue.`);
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">Estimates</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Intent & Pricing Layer</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
                >
                    Create Estimate
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search estimates..."
                        className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all pl-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <select
                    className="bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all appearance-none"
                    value={businessFilter}
                    onChange={(e) => setBusinessFilter(e.target.value)}
                >
                    <option value="all">All Businesses</option>
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select
                    className="bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all appearance-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="shared">Shared</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="converted">Converted</option>
                    <option value="expired">Expired</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest pl-4">Date</th>
                            <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Description / Recipient</th>
                            <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                            <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right pr-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {sortedEstimates.map((est) => {
                            const client = clients.find(c => c.id === est.client?.id);
                            return (
                                <tr key={est.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="py-6 pl-4">
                                        <p className="text-xs font-bold text-gray-900">{new Date(est.date || 0).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </td>
                                    <td className="py-6">
                                        <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">{est.recipientName || client?.displayName || "Unknown Recipient"}</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase truncate max-w-xs">{est.notes || "No notes"}</p>
                                    </td>
                                    <td className="py-6">
                                        <p className="text-xs font-black text-gray-900">₹{est.total?.toLocaleString('en-IN')}</p>
                                    </td>
                                    <td className="py-6">
                                        <StatusBadge status={est.status || 'draft'} />
                                    </td>
                                    <td className="py-6 text-right pr-4">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    const url = `${window.location.origin}/estimates/${est.id}`;
                                                    navigator.clipboard.writeText(url);
                                                    alert("Link copied to clipboard!");
                                                    if (est.status === 'draft') {
                                                        db.transact(db.tx.estimates[est.id].update({ status: 'shared' }));
                                                    }
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                title="Copy Public Link"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 2h8a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2z" /></svg>
                                            </button>
                                            <a
                                                href={`/estimates/${est.id}`}
                                                target="_blank"
                                                className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                                                title="View Public Page"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            </a>
                                            <button
                                                onClick={() => openModal(est)}
                                                className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                                                disabled={est.status === 'converted'}
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            {est.status !== "converted" && (
                                                <button
                                                    onClick={() => setResolvingEstimate(est)}
                                                    className="p-2 text-green-500 hover:text-green-700 transition-colors"
                                                    title="Convert to Invoice"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteEstimate(est.id)}
                                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                title="Delete Estimate"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {sortedEstimates.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No estimates found</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <EstimateModal
                    estimate={editingEstimate}
                    clients={clients}
                    businesses={businesses}
                    userId={userId}
                    activeBusinessId={activeBusinessId}
                    services={services || []}
                    taxes={taxes || []}
                    termsTemplates={termsTemplates || []}
                    onClose={closeModal}
                />
            )}

            {resolvingEstimate && (
                <ConvertResolutionModal
                    estimate={resolvingEstimate}
                    clients={clients}
                    userId={userId}
                    businesses={businesses}
                    allInvoices={allInvoices || []}
                    onClose={() => setResolvingEstimate(null)}
                />
            )}
        </div>
    );
}

function ConvertResolutionModal({ estimate, clients, userId, businesses, allInvoices, onClose }: { estimate: Estimate, clients: Client[], userId: string, businesses: Business[], allInvoices: Invoice[], onClose: () => void }) {
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredClients = clients.filter(c =>
        (c.displayName || c.firstName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleConvert = async (clientId: string) => {
        try {
            const finalEstimate = { ...estimate, client: { id: clientId } } as any;
            const invId = await convertToInvoice(finalEstimate, userId, allInvoices, businesses);
            alert(`Converted successfully! Invoice ID: ${invId}`);
            onClose();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Choose Customer</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Required for legal invoicing</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {!isCreating ? (
                        <>
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Match to existing</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                                    <input
                                        type="text"
                                        placeholder="Search customers..."
                                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-gray-900 mb-2 sticky top-0"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {filteredClients.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => handleConvert(c.id)}
                                            className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-gray-900 hover:bg-gray-50 transition-all flex justify-between items-center group"
                                        >
                                            <span className="text-xs font-bold text-gray-900">{c.displayName || c.firstName}</span>
                                            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    ))}
                                    {filteredClients.length === 0 && <p className="text-center py-4 text-[10px] font-bold text-gray-400 uppercase">No matches</p>}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full py-4 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] hover:underline"
                                >
                                    + Create New Customer
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">New Customer Details</p>
                            <CustomerModal
                                client={null}
                                userId={userId}
                                activeBusinessId={estimate.business?.id || ""}
                                onClose={() => setIsCreating(false)}
                                onSuccess={(clientId) => handleConvert(clientId)}
                                initialData={{
                                    firstName: estimate.recipientName?.split(" ")[0] || "",
                                    lastName: estimate.recipientName?.split(" ").slice(1).join(" ") || "",
                                    displayName: estimate.recipientName,
                                    email: estimate.recipientContact?.includes("@") ? estimate.recipientContact : "",
                                    phone: !estimate.recipientContact?.includes("@") ? estimate.recipientContact : "",
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        draft: "bg-gray-100 text-gray-500 border-gray-200",
        shared: "bg-blue-50 text-blue-600 border-blue-100",
        confirmed: "bg-indigo-50 text-indigo-600 border-indigo-100",
        converted: "bg-green-50 text-green-600 border-green-100",
        expired: "bg-red-50 text-red-600 border-red-100",
    };

    return (
        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border ${styles[status] || styles.draft}`}>
            {status}
        </span>
    );
}

function EstimateModal({
    estimate,
    clients,
    businesses,
    userId,
    activeBusinessId,
    services,
    taxes,
    termsTemplates,
    onClose,
}: {
    estimate: Estimate | null;
    clients: Client[];
    businesses: Business[];
    userId: string;
    activeBusinessId: string;
    services: Service[];
    taxes: Tax[];
    termsTemplates: TermsTemplate[];
    onClose: () => void;
}) {
    const [formData, setFormData] = useState<Partial<Estimate>>({
        status: estimate?.status || "draft",
        date: estimate?.date || new Date().toISOString().split('T')[0],
        validUntil: estimate?.validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total: estimate?.total || 0,
        notes: estimate?.notes || "",
        termsAndConditions: estimate?.termsAndConditions || "",
        advanceIntent: estimate?.advanceIntent || 0,
        requiresAdvance: (estimate as any)?.requiresAdvance ?? false,
        advancePercentage: (estimate as any)?.advancePercentage ?? 25,
        advanceDeadlineDays: (estimate as any)?.advanceDeadlineDays ?? 3,
        recipientName: estimate?.recipientName || "",
        recipientContact: estimate?.recipientContact || "",
    });

    const parseScope = (rawNotes: string) => {
        try {
            if (rawNotes.startsWith('{') && rawNotes.endsWith('}')) {
                const parsed = JSON.parse(rawNotes);
                return {
                    deliverables: parsed.deliverables || "",
                    schedule: parsed.schedule || "",
                    usage: parsed.usage || "",
                    exclusions: parsed.exclusions || "",
                    additionalNotes: parsed.additionalNotes || ""
                };
            }
        } catch (e) { }
        return {
            deliverables: "",
            schedule: "",
            usage: "",
            exclusions: "",
            additionalNotes: rawNotes || ""
        };
    };

    const [scope, setScope] = useState(parseScope(estimate?.notes || ""));

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    const [lineItems, setLineItems] = useState<any[]>(
        estimate?.lineItems ? [...estimate.lineItems] : []
    );

    const [selectedClientId, setSelectedClientId] = useState(estimate?.client?.id || "");
    const [selectedBusinessId, setSelectedBusinessId] = useState(
        estimate?.business?.id || (activeBusinessId !== "ALL" ? activeBusinessId : (businesses[0]?.id || ""))
    );

    // Sync logic: Force sync when estimate data arrives or updates
    const lastSyncId = React.useRef<string | null>(null);
    React.useEffect(() => {
        if (estimate) {
            // Check if we need to sync basic fields (only once per ID)
            if (estimate.id !== lastSyncId.current) {
                console.log("🚀 INITIALIZING MODAL FIELDS:", estimate.id);
                lastSyncId.current = estimate.id;
                setFormData({
                    status: estimate.status,
                    date: estimate.date,
                    validUntil: estimate.validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    total: estimate.total,
                    subtotal: estimate.subtotal || estimate.total,
                    notes: estimate.notes || "",
                    termsAndConditions: estimate.termsAndConditions || "",
                    advanceIntent: estimate.advanceIntent || 0,
                    requiresAdvance: (estimate as any).requiresAdvance ?? false,
                    advancePercentage: (estimate as any).advancePercentage ?? 25,
                    advanceDeadlineDays: (estimate as any).advanceDeadlineDays ?? 3,
                    recipientName: estimate.recipientName || "",
                    recipientContact: estimate.recipientContact || "",
                });
                setScope(parseScope(estimate.notes || ""));
                if (estimate.client?.id) setSelectedClientId(estimate.client.id);
                if (estimate.business?.id) setSelectedBusinessId(estimate.business.id);
            }

            // Sync line items separately so they can populate later if they arrive after the main record
            if (estimate.lineItems && estimate.lineItems.length > 0) {
                // Only overwrite if local state is empty or if we are forced by a new ID
                if (lineItems.length === 0 || lastSyncId.current === estimate.id) {
                    console.log("📦 Syncing", estimate.lineItems.length, "line items into modal");
                    setLineItems(estimate.lineItems.map(item => ({
                        ...item,
                        quantity: Number(item.quantity) || 0,
                        rate: Number(item.rate) || 0,
                        amount: Number(item.amount) || 0
                    })));
                }
            } else {
                console.log("⏳ Waiting for line items to arrive for estimate:", estimate.id);
            }
        }
    }, [estimate?.id, estimate?.lineItems]);

    const calculateTotals = (items: any[]) => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
        setFormData(prev => ({ ...prev, subtotal, total: subtotal }));
    };

    const addLineItem = (serviceId?: string) => {
        let newItem = { id: id(), description: "", quantity: 1, rate: 0, amount: 0 };

        if (serviceId) {
            const service = services.find(s => s.id === serviceId);
            if (service) {
                newItem = { ...newItem, description: service.name, rate: service.rate, amount: service.rate };
            }
        }

        const newItems = [...lineItems, newItem];
        setLineItems(newItems);
        calculateTotals(newItems);
    };

    const handleLineItemChange = (index: number, field: string, value: any) => {
        const newItems = [...lineItems];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'rate') {
            newItems[index].amount = newItems[index].quantity * newItems[index].rate;
        }
        setLineItems(newItems);
        calculateTotals(newItems);
    };

    const handleSubmit = async () => {
        if (!formData.recipientName) return alert("Please specify who this estimate is for");
        if (!selectedBusinessId || selectedBusinessId === "ALL") return alert("Please select a business");

        const estId = estimate?.id || id();
        const txs: any[] = [
            db.tx.estimates[estId].update({
                ...formData,
                notes: JSON.stringify(scope),
                updatedAt: new Date().toISOString(),
                createdAt: estimate?.createdAt || new Date().toISOString(),
            }),
            db.tx.estimates[estId].link({
                owner: userId,
                business: selectedBusinessId
            }),
        ];

        if (selectedClientId) {
            txs.push(db.tx.estimates[estId].link({ client: selectedClientId }));
        }

        // Handle removals
        if (estimate?.lineItems) {
            const currentIds = new Set(lineItems.map(li => li.id));
            estimate.lineItems.forEach(oldItem => {
                if (!currentIds.has(oldItem.id)) {
                    txs.push(db.tx.lineItems[oldItem.id].delete());
                }
            });
        }

        // Handle updates and additions
        lineItems.forEach(item => {
            if (!item.description?.trim()) return;

            const itemId = item.id || id();
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.rate) || 0;
            txs.push(db.tx.lineItems[itemId].update({
                itemType: item.itemType || 'custom',
                description: item.description.trim(),
                quantity: qty,
                rate: rate,
                amount: qty * rate,
            }));
            txs.push(db.tx.lineItems[itemId].link({
                estimate: estId,
                owner: userId || "system"
            }));
        });

        try {
            await db.transact(txs);
            onClose();
        } catch (e: any) {
            console.error("Save failure:", e);
            alert(`Failed to save: ${e.message}`);
        }
    };

    const handleClientChange = (val: string) => {
        if (val === "ADD_NEW") {
            setIsCustomerModalOpen(true);
        } else {
            setSelectedClientId(val);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                            {estimate ? "Edit Estimate" : "New Estimate"}
                        </h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Draft commercial intent</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all active:scale-90">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 space-y-8 no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Soft Identity Section */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Estimate For (Name) *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Dharma Productions"
                                        className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                                        value={formData.recipientName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Recipient Contact</label>
                                    <input
                                        type="text"
                                        placeholder="Email or Phone"
                                        className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                                        value={formData.recipientContact}
                                        onChange={(e) => setFormData(prev => ({ ...prev, recipientContact: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Link to Customer (Optional)</label>
                                <select
                                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all appearance-none"
                                    value={selectedClientId}
                                    onChange={(e) => handleClientChange(e.target.value)}
                                >
                                    <option value="">Choose Existing</option>
                                    <option value="ADD_NEW">+ Create New & Link</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.displayName || c.firstName}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Business Profile *</label>
                                <select
                                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all appearance-none"
                                    value={selectedBusinessId}
                                    onChange={(e) => setSelectedBusinessId(e.target.value)}
                                >
                                    <option value="">Select a business</option>
                                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Date & Validity Section */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Estimate Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                                        value={formData.date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Valid Until</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all border-2 border-transparent focus:border-blue-500/20"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Status</label>
                                <select
                                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all appearance-none"
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="shared">Shared</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="converted">Converted</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Line Items</h3>
                            <div className="flex gap-2 w-full md:w-auto">
                                <select
                                    className="bg-gray-50 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none border border-gray-100 cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            addLineItem(e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                >
                                    <option value="">+ Add Service</option>
                                    {services.filter(s => s.isActive).map(s => (
                                        <option key={s.id} value={s.id}>{s.name} - ₹{s.rate}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => addLineItem()}
                                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                                >
                                    + Custom Item
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {lineItems.map((item, idx) => (
                                <div key={item.id} className="grid grid-cols-12 gap-4 items-start group">
                                    <div className="col-span-6">
                                        <input
                                            placeholder="Description"
                                            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 focus:bg-white transition-all shadow-inner"
                                            value={item.description}
                                            onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 text-center"
                                            value={item.quantity || ""}
                                            onChange={(e) => handleLineItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            placeholder="Rate"
                                            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold text-gray-900"
                                            value={item.rate || ""}
                                            onChange={(e) => handleLineItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center justify-between pl-2">
                                        <span className="text-xs font-black text-gray-900">₹{(item.amount || 0).toLocaleString()}</span>
                                        <button
                                            onClick={() => {
                                                const newItems = lineItems.filter((_, i) => i !== idx);
                                                setLineItems(newItems);
                                                calculateTotals(newItems);
                                            }}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                        <div className="space-y-6">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Scope of Work</label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Deliverables */}
                                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 hover:border-gray-900 transition-all group">
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 group-hover:text-gray-900">What will the client receive?</label>
                                    <textarea
                                        className="w-full bg-transparent text-xs font-bold text-gray-900 h-20 outline-none resize-none no-scrollbar"
                                        value={scope.deliverables}
                                        onChange={(e) => setScope(prev => ({ ...prev, deliverables: e.target.value }))}
                                        placeholder="e.g. 40 edited images, High-resolution JPEGs, Online gallery access"
                                    />
                                    <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black text-gray-300 uppercase italic">📸 Deliverables</span>
                                    </div>
                                </div>

                                {/* When & Where */}
                                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 hover:border-gray-900 transition-all group">
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 group-hover:text-gray-900">When and where is the work happening?</label>
                                    <textarea
                                        className="w-full bg-transparent text-xs font-bold text-gray-900 h-20 outline-none resize-none no-scrollbar"
                                        value={scope.schedule}
                                        onChange={(e) => setScope(prev => ({ ...prev, schedule: e.target.value }))}
                                        placeholder="e.g. 1-day shoot (8 hours), Mumbai studio, Outdoor location provided by client"
                                    />
                                    <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black text-gray-300 uppercase italic">🗓 Schedule</span>
                                    </div>
                                </div>

                                {/* Usage Rights */}
                                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 hover:border-gray-900 transition-all group">
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 group-hover:text-gray-900">How can the images be used?</label>
                                    <textarea
                                        className="w-full bg-transparent text-xs font-bold text-gray-900 h-20 outline-none resize-none no-scrollbar"
                                        value={scope.usage}
                                        onChange={(e) => setScope(prev => ({ ...prev, usage: e.target.value }))}
                                        placeholder="e.g. Social media & website, Editorial use only, 1-year non-exclusive"
                                    />
                                    <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black text-gray-300 uppercase italic">🎨 Usage Rights</span>
                                    </div>
                                </div>

                                {/* Exclusions */}
                                <div className="bg-gray-50 p-6 rounded-[2rem] border border-red-50 hover:border-red-500 transition-all group">
                                    <label className="block text-[9px] font-black text-red-400 uppercase tracking-widest mb-2 group-hover:text-red-600">What is NOT included?</label>
                                    <textarea
                                        className="w-full bg-transparent text-xs font-bold text-gray-900 h-20 outline-none resize-none no-scrollbar"
                                        value={scope.exclusions}
                                        onChange={(e) => setScope(prev => ({ ...prev, exclusions: e.target.value }))}
                                        placeholder="e.g. Raw files, Additional retouching beyond 2 revisions, Travel outside city limits"
                                    />
                                    <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black text-red-200 uppercase italic">🚫 Exclusions</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Additional notes (optional)</label>
                                <textarea
                                    className="w-full bg-gray-50 rounded-[2rem] px-8 py-5 text-xs font-bold text-gray-900 h-24 focus:ring-2 ring-gray-900 transition-all outline-none border border-transparent"
                                    value={scope.additionalNotes}
                                    onChange={(e) => setScope(prev => ({ ...prev, additionalNotes: e.target.value }))}
                                    placeholder="Any other details the client should know..."
                                />
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white flex flex-col justify-center shadow-2xl shadow-gray-400 relative overflow-hidden group">
                            {/* Decorative Background Element */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-[80px] group-hover:bg-blue-600/20 transition-all duration-700"></div>

                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 relative z-10">Total Estimated Amount</span>
                            <span className="text-6xl font-black italic tracking-tighter relative z-10">₹{formData.total?.toLocaleString('en-IN')}</span>

                            <div className={`mt-10 pt-8 border-t border-white/10 space-y-6 relative z-10 p-6 rounded-3xl transition-all duration-500 ${formData.requiresAdvance ? 'bg-white/5 border border-white/10' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest block">Require Advance?</span>
                                        <p className="text-[8px] font-bold text-white/30 uppercase">To confirm shooting dates</p>
                                    </div>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, requiresAdvance: !prev.requiresAdvance }))}
                                        className={`w-14 h-7 rounded-full transition-all relative ${formData.requiresAdvance ? 'bg-blue-600' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all ${formData.requiresAdvance ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                {formData.requiresAdvance && (
                                    <div className="animate-in fade-in slide-in-from-top-4 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-white/70 uppercase tracking-widest">Percentage</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/20 focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                                        value={formData.advancePercentage}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, advancePercentage: parseFloat(e.target.value) || 0 }))}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-white/50 font-black">%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-white/70 uppercase tracking-widest">Deadline (Days)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/20 focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                                        value={formData.advanceDeadlineDays}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, advanceDeadlineDays: parseInt(e.target.value) || 0 }))}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-white/50 font-black">DAYS</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl p-4 text-center">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Estimated Advance</p>
                                            <p className="text-2xl font-black italic tracking-tighter text-white">₹{((formData.total || 0) * (formData.advancePercentage || 0) / 100).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        className="bg-gray-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
                    >
                        Save Estimate
                    </button>
                </div>
            </div>

            {isCustomerModalOpen && (
                <CustomerModal
                    client={null}
                    userId={userId}
                    activeBusinessId={selectedBusinessId}
                    onClose={() => setIsCustomerModalOpen(false)}
                    onSuccess={(clientId) => {
                        setSelectedClientId(clientId);
                        setIsCustomerModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}
