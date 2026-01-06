"use client";
import { useState, useMemo, useEffect } from "react";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/device";
import { ExpenseForm } from "./forms/ExpenseForm";
import { DesktopModalLayout } from "./layout/FormLayout";
import { Invoice, Client, Expense, TDSEntry } from "@/types";
import { generateAuditPack } from "@/lib/auditPack";

export function TaxZone({
    invoices,
    clients,
    expenses,
    tdsEntries,
    userId,
    activeBusinessId,
    initiallyOpenModal,
    onModalClose
}: {
    invoices: Invoice[];
    clients: Client[];
    expenses: Expense[];
    tdsEntries: TDSEntry[];
    userId: string;
    activeBusinessId: string;
    initiallyOpenModal?: string;
    onModalClose?: () => void;
}) {
    const isMobile = useIsMobile();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isTDSModalOpen, setIsTDSModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"expenses" | "tds" | "audit">("expenses");

    useEffect(() => {
        if (initiallyOpenModal === "create-expense") {
            openModal();
        }
    }, [initiallyOpenModal]);

    const openModal = (expense: Expense | null = null) => {
        if (isMobile) {
            if (expense) {
                router.push(`/expenses/new?id=${expense.id}`);
            } else {
                router.push('/expenses/new');
            }
            return;
        }
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingExpense(null);
        if (onModalClose) onModalClose();
    };

    const deleteExpense = async (exp: Expense) => {
        if (!confirm("Delete this expense?")) return;
        try {
            await db.transact([db.tx.expenses[exp.id].delete()]);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">Tax Zone</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Compliance & Audit Readiness</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => openModal()}
                        className="bg-gray-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
                    >
                        Log Expense
                    </button>
                    <button
                        onClick={() => setIsTDSModalOpen(true)}
                        className="bg-white text-gray-900 border border-gray-100 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-xl shadow-gray-200 active:scale-95"
                    >
                        Log TDS
                    </button>
                </div>
            </div>

            <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar">
                {["expenses", "tds", "audit"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-gray-900 text-white shadow-xl shadow-gray-200" : "text-gray-400 hover:text-gray-900 hover:bg-white"} `}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "expenses" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 italic text-[10px]">
                                    <th className="pb-4 font-black text-gray-400 uppercase tracking-widest pl-4">Date</th>
                                    <th className="pb-4 font-black text-gray-400 uppercase tracking-widest">Vendor / Category</th>
                                    <th className="pb-4 font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                    <th className="pb-4 font-black text-gray-400 uppercase tracking-widest text-right pr-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {expenses.map((exp) => (
                                    <tr key={exp.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="py-6 pl-4 text-xs font-bold">{new Date(exp.date || 0).toLocaleDateString()}</td>
                                        <td className="py-6">
                                            <p className="text-xs font-black uppercase tracking-tighter">{exp.vendorName || "Unknown"}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{exp.category}</p>
                                        </td>
                                        <td className="py-6 text-xs font-black">₹{exp.amount?.toLocaleString()}</td>
                                        <td className="py-6 text-right pr-4">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openModal(exp)} className="text-gray-400 hover:text-gray-900">Edit</button>
                                                <button onClick={() => deleteExpense(exp)} className="text-gray-300 hover:text-red-500">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "tds" && (
                    <div className="py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                        TDS Ledger View Coming Soon
                    </div>
                )}

                {activeTab === "audit" && (
                    <div className="py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                        Audit Pack Generator Coming Soon
                    </div>
                )}
            </div>

            {isModalOpen && !isMobile && (
                <DesktopModalLayout title={editingExpense ? "Edit Expense" : "New Expense"} onClose={closeModal}>
                    <ExpenseForm
                        initialExpense={editingExpense}
                        userId={userId}
                        activeBusinessId={activeBusinessId}
                        onSuccess={closeModal}
                        onCancel={closeModal}
                    />
                </DesktopModalLayout>
            )}

            {isTDSModalOpen && (
                <DesktopModalLayout title="Log TDS Certificate" onClose={() => setIsTDSModalOpen(false)}>
                    <div className="p-8 text-center text-xs font-bold text-gray-400">
                        TDS Form logic temporarily suspended for refactor.
                    </div>
                </DesktopModalLayout>
            )}
        </div>
    );
}
