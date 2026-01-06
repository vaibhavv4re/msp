"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { Client } from "@/types";

export const PAYMENT_TERMS = [
    { value: "due_on_receipt", label: "Due on Receipt" },
    { value: "net_15", label: "Net 15" },
    { value: "net_30", label: "Net 30" },
    { value: "net_45", label: "Net 45" },
    { value: "net_60", label: "Net 60" },
    { value: "custom", label: "Custom" },
];

const CURRENCIES = [
    { value: "INR", label: "INR - Indian Rupee" },
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
];

interface ClientFormProps {
    initialClient?: Client | null;
    userId: string;
    activeBusinessId: string;
    onSuccess?: (clientId: string) => void;
    onCancel?: () => void;
    onClose?: () => void;
    initialData?: any;
    isMobile?: boolean;
}

export function ClientForm({
    initialClient,
    userId,
    activeBusinessId,
    onSuccess,
    onCancel,
    onClose,
    initialData,
    isMobile = false
}: ClientFormProps) {
    const handleSuccess = (clientId: string) => {
        if (onSuccess) onSuccess(clientId);
        if (onClose) onClose();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        if (onClose) onClose();
    };
    const [formData, setFormData] = useState({
        clientType: initialClient?.clientType || "Individual",
        salutation: initialClient?.salutation || "",
        firstName: initialClient?.firstName || initialData?.firstName || "",
        lastName: initialClient?.lastName || initialData?.lastName || "",
        companyName: initialClient?.companyName || "",
        displayName: initialClient?.displayName || initialData?.displayName || "",
        email: initialClient?.email || initialData?.email || "",
        phone: initialClient?.phone || initialData?.phone || "",
        workPhone: initialClient?.workPhone || "",
        mobile: initialClient?.mobile || "",
        address: initialClient?.address || "",
        gst: initialClient?.gst || "",
        pan: initialClient?.pan || "",
        tan: initialClient?.tan || "",
        currency: initialClient?.currency || "INR",
        paymentTerms: initialClient?.paymentTerms || "net_30",
        customTermDays: initialClient?.customTermDays || 0,
        isTdsDeducting: initialClient?.isTdsDeducting || false,
    });

    useEffect(() => {
        if (!initialClient && !initialData?.displayName) {
            if (formData.clientType === "Business" && formData.companyName) {
                setFormData(prev => ({ ...prev, displayName: formData.companyName }));
            } else if (formData.firstName) {
                const name = `${formData.salutation ? formData.salutation + " " : ""}${formData.firstName} ${formData.lastName}`.trim();
                setFormData(prev => ({ ...prev, displayName: name }));
            }
        }
    }, [formData.firstName, formData.lastName, formData.companyName, formData.salutation, formData.clientType, initialClient, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.displayName) {
            alert("Please provide a Display Name");
            return;
        }

        const clientId = initialClient ? initialClient.id : id();
        const clientData = {
            ...formData,
            customTermDays: Number(formData.customTermDays),
        };

        const txs = [
            db.tx.clients[clientId].update(clientData),
            db.tx.clients[clientId].link({ owner: userId }),
        ];

        if (activeBusinessId !== "ALL") {
            txs.push(db.tx.clients[clientId].link({ business: activeBusinessId }));
        }

        db.transact(txs);
        handleSuccess(clientId);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10 pb-24 md:pb-0">
            {/* Client Identity */}
            <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Identity</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, clientType: "Individual" })}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.clientType === 'Individual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                    >
                        Individual
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, clientType: "Business" })}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.clientType === 'Business' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                    >
                        Business
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {formData.clientType === 'Individual' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Salutation</label>
                            <select
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                                value={formData.salutation}
                                onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                            >
                                <option value="">Select</option>
                                <option value="Mr.">Mr.</option>
                                <option value="Mrs.">Mrs.</option>
                                <option value="Ms.">Ms.</option>
                                <option value="Dr.">Dr.</option>
                            </select>
                        </div>
                    )}
                    <div className={`${formData.clientType === 'Individual' ? 'md:col-span-1' : 'md:col-span-2'} space-y-2`}>
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">{formData.clientType === 'Individual' ? 'First Name' : 'Company Name'} *</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.clientType === 'Individual' ? formData.firstName : formData.companyName}
                            onChange={(e) => setFormData({ ...formData, [formData.clientType === 'Individual' ? 'firstName' : 'companyName']: e.target.value })}
                        />
                    </div>
                    {formData.clientType === 'Individual' && (
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Last Name</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Display Name *</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    />
                </div>
            </section>

            {/* Communication */}
            <section className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-gray-900 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Communication</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Email</label>
                        <input
                            type="email"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Phone</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Work Phone</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.workPhone}
                            onChange={(e) => setFormData({ ...formData, workPhone: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Mobile</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Address</label>
                    <textarea
                        rows={3}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>
            </section>

            {/* Financial & Legal */}
            <section className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Financial & Legal</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">GSTIN</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none uppercase"
                            value={formData.gst}
                            onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">PAN</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none uppercase"
                            value={formData.pan}
                            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">TAN</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none uppercase"
                            value={formData.tan}
                            onChange={(e) => setFormData({ ...formData, tan: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Currency</label>
                        <select
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        >
                            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Payment Terms</label>
                        <select
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.paymentTerms}
                            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                        >
                            {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    {formData.paymentTerms === 'custom' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Custom Terms (Days)</label>
                            <input
                                type="number"
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                                value={formData.customTermDays}
                                onChange={(e) => setFormData({ ...formData, customTermDays: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isTdsDeducting: !formData.isTdsDeducting })}
                        className={`w-12 h-6 rounded-full transition-all relative ${formData.isTdsDeducting ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isTdsDeducting ? 'translate-x-6' : ''}`}></div>
                    </button>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest block">TDS Deduction</span>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tight">Client habitually deducts TDS from payments</p>
                    </div>
                </div>
            </section>

            {/* Primary CTA */}
            <div className={`${isMobile ? 'fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100' : 'pt-8'}`}>
                <div className="flex gap-4">
                    {!isMobile && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-8 py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 transition-all"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        className="flex-1 py-6 bg-gray-900 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-gray-200 hover:bg-black transition-all active:scale-95"
                    >
                        {initialClient ? "Save Client Changes" : "Register Client"}
                    </button>
                </div>
            </div>
        </form>
    );
}
