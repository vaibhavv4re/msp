"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import {
    Estimate,
    Client,
    Business,
    Service,
    Tax,
    TermsTemplate,
    LineItem
} from "@/types";
import { Plus, Trash2, Info } from "lucide-react";

interface EstimateFormProps {
    initialEstimate?: Estimate | null;
    clients: Client[];
    businesses: Business[];
    userId: string;
    activeBusinessId: string;
    services: Service[];
    taxes: Tax[];
    termsTemplates: TermsTemplate[];
    onClose: () => void;
    isMobile?: boolean;
}

export function EstimateForm({
    initialEstimate,
    clients,
    businesses,
    userId,
    activeBusinessId,
    services,
    taxes,
    termsTemplates,
    onClose,
    isMobile = false
}: EstimateFormProps) {
    const defaultTerms = termsTemplates.find(t => (t as any).isDefault);

    const [formData, setFormData] = useState(() => {
        if (initialEstimate) {
            const rawNotes = initialEstimate.notes || "";
            let parsedScope = { deliverables: "", schedule: "", usage: "", exclusions: "", notes: "" };
            try {
                if (rawNotes.startsWith('{')) {
                    const json = JSON.parse(rawNotes);
                    parsedScope = { ...parsedScope, ...json };
                } else {
                    parsedScope.notes = rawNotes;
                }
            } catch (e) {
                parsedScope.notes = rawNotes;
            }

            return {
                ...initialEstimate,
                lineItems: initialEstimate.lineItems.map((li) => ({ ...li })),
                client: initialEstimate.client || { id: "" },
                business: (initialEstimate as any).business || { id: "" },
                date: initialEstimate.date || new Date().toISOString().split('T')[0],
                validUntil: initialEstimate.validUntil || "",
                scope: parsedScope,
            };
        }

        const preSelectedBusinessId = activeBusinessId !== "ALL" ? activeBusinessId : (businesses[0]?.id || "");

        return {
            estimateNumber: "",
            date: new Date().toISOString().split('T')[0],
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "draft",
            client: { id: "" },
            business: { id: preSelectedBusinessId },
            lineItems: [{ itemType: "custom", description: "", sacCode: "", quantity: 1, rate: 0, amount: 0 }],
            subtotal: 0,
            total: 0,
            termsAndConditions: defaultTerms?.content || "",
            scope: { deliverables: "", schedule: "", usage: "", exclusions: "", notes: "" },
            recipientName: "",
            recipientContact: "",
        };
    });

    const [isUploading, setIsUploading] = useState(false);

    // Totals calculation
    useEffect(() => {
        const subtotal = formData.lineItems.reduce(
            (sum: number, li: any) => sum + (Number(li.quantity) * Number(li.rate)),
            0
        );
        setFormData(prev => ({ ...prev, subtotal, total: subtotal }));
    }, [formData.lineItems]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.client?.id || !formData.business?.id) {
            alert("Please fill required fields (Client, Business Profile)");
            return;
        }

        setIsUploading(true);
        try {
            const estimateId = initialEstimate ? initialEstimate.id : id();
            const lineItemIds = (formData.lineItems as any[]).map((li: any) => li.id || id());

            const notesString = JSON.stringify(formData.scope);

            const txs = [
                db.tx.estimates[estimateId].update({
                    estimateNumber: formData.estimateNumber || `EST-${Date.now().toString().slice(-4)}`,
                    date: formData.date,
                    validUntil: formData.validUntil,
                    status: formData.status,
                    subtotal: formData.subtotal,
                    total: formData.total,
                    notes: notesString,
                    termsAndConditions: formData.termsAndConditions,
                    recipientName: formData.recipientName,
                    recipientContact: formData.recipientContact,
                    updatedAt: new Date().toISOString(),
                }),
                db.tx.estimates[estimateId].link({ client: formData.client.id }),
                db.tx.estimates[estimateId].link({ business: formData.business.id }),
                ...(formData.lineItems as any[]).map((li: any, i: number) =>
                    db.tx.lineItems[lineItemIds[i]].update({
                        itemType: li.itemType || "custom",
                        description: li.description,
                        sacCode: li.sacCode || "",
                        quantity: Number(li.quantity) || 0,
                        rate: Number(li.rate) || 0,
                        amount: Number(li.amount) || 0,
                    })
                ),
                db.tx.estimates[estimateId].link({ lineItems: lineItemIds }),
            ];

            if (!initialEstimate) {
                txs.push(db.tx.estimates[estimateId].update({ createdAt: new Date().toISOString() }));
                txs.push(db.tx.estimates[estimateId].link({ owner: userId }));
            }

            if (initialEstimate) {
                const currentItemIds = new Set(lineItemIds);
                const removedItems = initialEstimate.lineItems.filter(li => !currentItemIds.has(li.id));
                removedItems.forEach(li => txs.push(db.tx.lineItems[li.id].delete()));
            }

            db.transact(txs);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-12 pb-24">
            <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-purple-600 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Context & Identity</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Business Profile *</label>
                        <select
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:border-purple-600 focus:bg-white transition-all appearance-none"
                            value={formData.business?.id}
                            onChange={(e) => setFormData({ ...formData, business: { id: e.target.value } })}
                            required
                        >
                            <option value="">Select Profile</option>
                            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Target Client *</label>
                        <select
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:border-purple-600 focus:bg-white transition-all appearance-none"
                            value={formData.client?.id}
                            onChange={(e) => setFormData({ ...formData, client: { id: e.target.value } })}
                            required
                        >
                            <option value="">Select Client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.displayName || (c as any).firstName}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Contact Person (Recipient Name)</label>
                        <input
                            type="text"
                            placeholder="e.g. Jane Doe"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:border-purple-600 focus:bg-white transition-all"
                            value={formData.recipientName}
                            onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Contact Email / Phone</label>
                        <input
                            type="text"
                            placeholder="e.g. jane@client.com"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:border-purple-600 focus:bg-white transition-all"
                            value={formData.recipientContact}
                            onChange={(e) => setFormData({ ...formData, recipientContact: e.target.value })}
                        />
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Offerings & Deliverables</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, lineItems: [...formData.lineItems, { itemType: "custom", description: "", sacCode: "", quantity: 1, rate: 0, amount: 0 }] })}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {formData.lineItems.map((item, index) => (
                        <div key={index} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Description</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-purple-600 outline-none"
                                        value={item.description}
                                        onChange={(e) => {
                                            const items = [...formData.lineItems];
                                            items[index].description = e.target.value;
                                            setFormData({ ...formData, lineItems: items });
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const items = [...formData.lineItems];
                                        items.splice(index, 1);
                                        setFormData({ ...formData, lineItems: items });
                                    }}
                                    className="pt-6 text-red-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Quantity</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-purple-600 outline-none"
                                        value={item.quantity}
                                        onChange={(e) => {
                                            const items = [...formData.lineItems];
                                            items[index].quantity = Number(e.target.value);
                                            items[index].amount = items[index].quantity * items[index].rate;
                                            setFormData({ ...formData, lineItems: items });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Rate</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-purple-600 outline-none"
                                        value={item.rate}
                                        onChange={(e) => {
                                            const items = [...formData.lineItems];
                                            items[index].rate = Number(e.target.value);
                                            items[index].amount = items[index].quantity * items[index].rate;
                                            setFormData({ ...formData, lineItems: items });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Detailed Scope of Work</h3>
                </div>

                <div className="space-y-4">
                    {[
                        { key: 'deliverables', label: 'Deliverables', placeholder: 'What will be provided? (e.g. 5 retouched images)', icon: '📦' },
                        { key: 'schedule', label: 'When & Where', placeholder: 'Timeline and location details', icon: '📍' },
                        { key: 'usage', label: 'Usage Rights', placeholder: 'How can the client use this? (e.g. Social Media only)', icon: '🔒' },
                        { key: 'exclusions', label: 'Exclusions', placeholder: 'What is NOT included?', icon: '🚫' },
                        { key: 'notes', label: 'Additional Notes', placeholder: 'Any other details...', icon: '📝' }
                    ].map((field) => (
                        <div key={field.key} className="space-y-2 bg-gray-50/30 p-4 rounded-2xl border border-gray-100/50">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">
                                <span>{field.icon}</span> {field.label}
                            </label>
                            <textarea
                                rows={3}
                                className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-purple-600 outline-none transition-all placeholder:opacity-50"
                                placeholder={field.placeholder}
                                value={(formData.scope as any)[field.key]}
                                onChange={(e) => setFormData({ ...formData, scope: { ...formData.scope, [field.key]: e.target.value } })}
                            />
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-gray-900 rounded-[2.5rem] p-10 text-white space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Estimated Value</span>
                    <span className="text-4xl font-[1000] tracking-tighter">₹{formData.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl">
                    <Info className="w-4 h-4 text-blue-400" />
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-relaxed">
                        Valid until {new Date(formData.validUntil).toLocaleDateString()}
                    </p>
                </div>
            </section>
        </form>
    );
}
