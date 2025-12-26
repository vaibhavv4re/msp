"use client";
import { useState } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";

interface AdminPortalProps {
    userId: string;
}

export function AdminPortal({ userId }: AdminPortalProps) {
    const { isLoading, error, data } = db.useQuery({
        $users: {
            businesses: {},
        },
        businesses: {
            $: { where: { status: "pending_claim" } }
        }
    } as any);

    const [activeTab, setActiveTab] = useState<"users" | "pending" | "provision">("users");
    const [provisionForm, setProvisionForm] = useState({
        businessName: "",
        email: "",
        clientName: "",
        totalAmount: "",
        subject: ""
    });

    const handleProvision = async () => {
        if (!provisionForm.businessName || !provisionForm.email) {
            alert("Business Name and Email are required.");
            return;
        }

        const bId = id();
        const cId = id();
        const iId = id();

        const txs: any[] = [
            db.tx.businesses[bId].update({
                name: provisionForm.businessName,
                email: provisionForm.email,
                status: "pending_claim",
                createdBy: "admin",
                color: "#" + Math.floor(Math.random() * 16777215).toString(16)
            })
        ];

        if (provisionForm.clientName) {
            txs.push(db.tx.clients[cId].update({
                displayName: provisionForm.clientName,
                source: "concierge"
            }));
            txs.push(db.tx.clients[cId].link({ business: bId }));

            if (provisionForm.totalAmount) {
                txs.push(db.tx.invoices[iId].update({
                    invoiceNumber: "1",
                    invoiceDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date().toISOString().split('T')[0],
                    subtotal: parseFloat(provisionForm.totalAmount),
                    total: parseFloat(provisionForm.totalAmount),
                    status: "draft",
                    subject: provisionForm.subject || "Historical Record",
                    source: "concierge"
                }));
                txs.push(db.tx.invoices[iId].link({ business: bId, client: cId }));
            }
        }

        await db.transact(txs as any[]);
        alert("Profile pre-provisioned successfully!");
        setProvisionForm({ businessName: "", email: "", clientName: "", totalAmount: "", subject: "" });
        setActiveTab("pending");
    };

    const handleDeleteUser = async (uId: string, bIds: string[]) => {
        if (!confirm("Are you sure? This will delete the user and ALL their business data permanently.")) return;

        const txs: any[] = [db.tx.$users[uId].delete()];
        bIds.forEach(bId => {
            txs.push(db.tx.businesses[bId].delete());
        });
        // InstantDB handles some cascades, but we are being explicit about businesses.
        // clients/invoices/etc usually belong to users via 'owner' links which we'd need to clear too if they weren't linked to businesses.

        await db.transact(txs as any[]);
        alert("User and associated profiles deleted.");
    };

    const handleToggleRole = async (uId: string, currentRole?: string) => {
        if (uId === userId) {
            alert("You cannot change your own role.");
            return;
        }
        const newRole = currentRole === "admin" ? "user" : "admin";
        await db.transact([
            db.tx.$users[uId].update({ role: newRole })
        ]);
    };

    if (isLoading) return <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Admin Data...</div>;

    const users = (data as any)?.$users || [];
    const pending = (data as any)?.businesses || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">Admin Portal</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Concierge & User Management</p>
                </div>
            </div>

            <div className="flex gap-2 p-1 bg-gray-200 rounded-2xl w-fit">
                {(["users", "pending", "provision"] as const).map((tab: "users" | "pending" | "provision") => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === "users" && (
                <div className="grid grid-cols-1 gap-4">
                    {users.map((u: any) => (
                        <div key={u.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-gray-900 transition-all">
                            <div>
                                <div className="flex items-center gap-3">
                                    <p className="text-sm font-black text-gray-900">{u.email}</p>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${u.role === "admin" ? "bg-red-100 text-red-600 border border-red-200" : "bg-gray-100 text-gray-500"}`}>
                                        {u.role || "user"}
                                    </span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    {u.businesses?.map((b: any) => (
                                        <span key={b.id} className="text-[8px] font-black bg-gray-100 px-2 py-1 rounded-full uppercase tracking-tighter">{b.name}</span>
                                    ))}
                                    {u.businesses?.length === 0 && <span className="text-[8px] font-black text-red-400 uppercase">No Profiles</span>}
                                </div>
                            </div>
                            <div className="flex gap-4 items-center">
                                <button
                                    onClick={() => handleToggleRole(u.id, u.role)}
                                    disabled={u.id === userId}
                                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${u.id === userId ? "text-gray-300 cursor-not-allowed" : "text-blue-500 hover:text-blue-700"}`}
                                >
                                    {u.role === "admin" ? "Demote" : "Promote"}
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(u.id, u.businesses?.map((b: any) => b.id) || [])}
                                    className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                                >
                                    Hard Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "pending" && (
                <div className="grid grid-cols-1 gap-4">
                    {pending.length === 0 && (
                        <div className="py-20 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No pending claims</p>
                        </div>
                    )}
                    {pending.map((b: any) => (
                        <div key={b.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-gray-900 transition-all">
                            <div>
                                <p className="text-sm font-black text-gray-900">{b.name}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Claimable by: {b.email}</p>
                            </div>
                            <button
                                onClick={() => db.transact(db.tx.businesses[b.id].delete())}
                                className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-400 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "provision" && (
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm max-w-2xl mx-auto w-full">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-8 text-center underline decoration-red-500 decoration-4 underline-offset-8">Pre-provision Profile</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Business Name *</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                                value={provisionForm.businessName}
                                onChange={e => setProvisionForm({ ...provisionForm, businessName: e.target.value })}
                                placeholder="e.g. Backdrop Studio"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Claimant Google Email *</label>
                            <input
                                type="email"
                                className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 ring-gray-900 transition-all"
                                value={provisionForm.email}
                                onChange={e => setProvisionForm({ ...provisionForm, email: e.target.value })}
                                placeholder="user@gmail.com"
                            />
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-6 text-center">Optional: Seed with first record</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Client Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold text-gray-900"
                                        value={provisionForm.clientName}
                                        onChange={e => setProvisionForm({ ...provisionForm, clientName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Invoice Amount</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold text-gray-900"
                                        value={provisionForm.totalAmount}
                                        onChange={e => setProvisionForm({ ...provisionForm, totalAmount: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Invoice Subject</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold text-gray-900"
                                    value={provisionForm.subject}
                                    onChange={e => setProvisionForm({ ...provisionForm, subject: e.target.value })}
                                    placeholder="e.g. Imported Invoice"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleProvision}
                            className="w-full bg-gray-900 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 mt-4 active:scale-95"
                        >
                            Create Workspace
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
