"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";
import { EstimateForm } from "./forms/EstimateForm";
import { DesktopModalLayout } from "./layout/FormLayout";
import { Estimate, Client, Business, Service, Tax, TermsTemplate, Invoice } from "@/types";
import { convertToInvoice } from "@/lib/estimateActions";

interface EstimatesProps {
    estimates: Estimate[];
    clients: Client[];
    userId: string;
    services: Service[];
    taxes: Tax[];
    termsTemplates: TermsTemplate[];
    businesses: Business[];
    activeBusinessId: string;
    allInvoices?: Invoice[];
    isMobile: boolean;
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
    isMobile,
    initiallyOpenModal,
    onModalClose,
}: EstimatesProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [businessFilter, setBusinessFilter] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
    const [resolvingEstimate, setResolvingEstimate] = useState<Estimate | null>(null);

    useEffect(() => {
        if (initiallyOpenModal === true || initiallyOpenModal === "create-estimate") {
            openModal();
        } else if (typeof initiallyOpenModal === 'string' && initiallyOpenModal.startsWith('edit-estimate:')) {
            const estId = initiallyOpenModal.split(':')[1];
            const est = estimates.find(e => e.id === estId);
            if (est) {
                openModal(est);
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
        if (isMobile) {
            if (estimate) {
                router.push(`/work/estimates/new?id=${estimate.id}`);
            } else {
                router.push('/work/estimates/new');
            }
            return;
        }
        setEditingEstimate(estimate);
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setEditingEstimate(null);
        if (onModalClose) onModalClose();
    }

    const deleteEstimate = async (idOfEstimate: string) => {
        if (!confirm("Are you sure you want to delete this estimate?")) return;
        try {
            await db.transact([db.tx.estimates[idOfEstimate].delete()]);
        } catch (e: any) {
            console.error(e);
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
                <input
                    type="text"
                    placeholder="Search estimates..."
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                    value={businessFilter}
                    onChange={(e) => setBusinessFilter(e.target.value)}
                >
                    <option value="all">All Businesses</option>
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select
                    className="bg-gray-50 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
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
                        <tr className="border-b border-gray-100 italic text-[10px]">
                            <th className="pb-4 font-black text-gray-400 uppercase tracking-widest pl-4">Date</th>
                            <th className="pb-4 font-black text-gray-400 uppercase tracking-widest">Recipient</th>
                            <th className="pb-4 font-black text-gray-400 uppercase tracking-widest">Amount</th>
                            <th className="pb-4 font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="pb-4 font-black text-gray-400 uppercase tracking-widest text-right pr-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {sortedEstimates.map((est) => {
                            const client = clients.find(c => c.id === est.client?.id);
                            return (
                                <tr key={est.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="py-6 pl-4 text-xs font-bold">{new Date(est.date || 0).toLocaleDateString()}</td>
                                    <td className="py-6">
                                        <p className="text-xs font-black uppercase tracking-tighter">{est.recipientName || client?.displayName || "Unknown"}</p>
                                    </td>
                                    <td className="py-6 text-xs font-black">₹{est.total?.toLocaleString()}</td>
                                    <td className="py-6"><StatusBadge status={est.status || 'draft'} /></td>
                                    <td className="py-6 text-right pr-4">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openModal(est)} className="text-gray-400 hover:text-gray-900">Edit</button>
                                            <button onClick={() => setResolvingEstimate(est)} className="text-green-500 hover:text-green-700">Convert</button>
                                            <button onClick={() => deleteEstimate(est.id)} className="text-gray-300 hover:text-red-500">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && !isMobile && (
                <DesktopModalLayout title={editingEstimate ? "Edit Estimate" : "New Estimate"} onClose={closeModal}>
                    <EstimateForm
                        initialEstimate={editingEstimate}
                        clients={clients}
                        businesses={businesses}
                        userId={userId}
                        activeBusinessId={activeBusinessId}
                        services={services}
                        taxes={taxes}
                        termsTemplates={termsTemplates}
                        onClose={closeModal}
                    />
                </DesktopModalLayout>
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
    const handleConvert = async (clientId: string) => {
        try {
            const finalEstimate = { ...estimate, client: { id: clientId } } as any;
            await convertToInvoice(finalEstimate, userId, allInvoices, businesses);
            alert("Converted successfully!");
            onClose();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8">
                <h2 className="text-xl font-black uppercase tracking-tighter mb-4">Choose Client</h2>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {clients.map(c => (
                        <button
                            key={c.id}
                            onClick={() => handleConvert(c.id)}
                            className="w-full text-left p-4 rounded-xl border hover:border-gray-900 transition-all text-sm font-bold"
                        >
                            {c.displayName || c.firstName}
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="mt-6 w-full py-4 text-xs font-black uppercase tracking-widest text-gray-400">Cancel</button>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        draft: "bg-gray-100 text-gray-500",
        shared: "bg-blue-50 text-blue-600",
        confirmed: "bg-indigo-50 text-indigo-600",
        converted: "bg-green-50 text-green-600",
        expired: "bg-red-50 text-red-600",
    };
    return (
        <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${styles[status] || styles.draft}`}>
            {status}
        </span>
    );
}
