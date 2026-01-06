"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import {
    Invoice,
    Client,
    Business,
    Service,
    Tax,
    TermsTemplate,
    LineItem
} from "@/types";
import {
    calculateInvoiceTotal,
    calculateDueDate,
    generateNextInvoiceNumber,
    PAYMENT_TERMS
} from "@/lib/invoiceUtils";
import { Plus, Trash2 } from "lucide-react";

interface InvoiceFormProps {
    initialInvoice?: Invoice | null;
    clients: Client[];
    businesses: Business[];
    userId: string;
    activeBusinessId: string;
    services: Service[];
    taxes: Tax[];
    termsTemplates: TermsTemplate[];
    onClose: () => void;
    allInvoices: Invoice[];
    isMobile?: boolean;
}

export function InvoiceForm({
    initialInvoice,
    clients,
    businesses,
    userId,
    activeBusinessId,
    services,
    taxes,
    termsTemplates,
    onClose,
    allInvoices,
    isMobile = false
}: InvoiceFormProps) {
    const activeServices = services.filter(s => s.isActive);
    const defaultTerms = termsTemplates.find(t => (t as any).isDefault);

    const [formData, setFormData] = useState(() => {
        if (initialInvoice) {
            return {
                ...initialInvoice,
                lineItems: initialInvoice.lineItems.map((li) => ({ ...li })),
                client: initialInvoice.client || { id: "" },
                business: (initialInvoice as any).business || { id: "" },
                bankAccount: (initialInvoice as any).bankAccount || { id: "" },
                invoiceDate: (initialInvoice as any).invoiceDate || new Date().toISOString().split('T')[0],
                dueDate: (initialInvoice as any).dueDate || "",
                subject: (initialInvoice as any).subject || "",
                orderNumber: (initialInvoice as any).orderNumber || "",
                paymentTerms: (initialInvoice as any).paymentTerms || "",
                notes: (initialInvoice as any).notes || "",
                termsAndConditions: (initialInvoice as any).termsAndConditions || "",
                usageType: (initialInvoice as any).usageType || "",
                usageOther: (initialInvoice as any).usageOther || "",
                usageDuration: (initialInvoice as any).usageDuration || "",
                usageGeography: (initialInvoice as any).usageGeography || "",
                usageExclusivity: (initialInvoice as any).usageExclusivity || "",
                advanceAmount: (initialInvoice as any).advanceAmount || 0,
                isAdvanceReceived: (initialInvoice as any).isAdvanceReceived || false,
                tdsDeducted: (initialInvoice as any).tdsDeducted || false,
                tdsAmount: (initialInvoice as any).tdsAmount || 0,
            };
        }

        const preSelectedBusinessId = activeBusinessId !== "ALL" ? activeBusinessId : (businesses[0]?.id || "");
        const preSelectedBusiness = businesses.find(b => b.id === preSelectedBusinessId);
        const defaultAccount = preSelectedBusiness?.bankAccounts?.find(a => a.isActive) || preSelectedBusiness?.bankAccounts?.[0];

        return {
            invoiceNumber: "",
            invoiceDate: new Date().toISOString().split('T')[0],
            orderNumber: "",
            paymentTerms: "net_30",
            dueDate: "",
            subject: "",
            status: "Unpaid",
            client: { id: "" },
            business: { id: preSelectedBusinessId },
            bankAccount: { id: defaultAccount?.id || "" },
            lineItems: [{ itemType: "custom", description: "", sacCode: "", quantity: 1, rate: 0, amount: 0 }],
            subtotal: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: 0,
            notes: "",
            termsAndConditions: defaultTerms?.content || "",
            usageType: "",
            usageOther: "",
            usageDuration: "",
            usageGeography: "",
            usageExclusivity: "",
            advanceAmount: 0,
            isAdvanceReceived: false,
            tdsDeducted: false,
            tdsAmount: 0,
        };
    });

    const [isUploading, setIsUploading] = useState(false);
    const [tab, setTab] = useState<"general" | "usage">("general");

    const [taxType, setTaxType] = useState<"intrastate" | "interstate">(
        initialInvoice && initialInvoice.igst && initialInvoice.igst > 0 ? "interstate" : "intrastate"
    );
    const [cgstRate] = useState(9);
    const [sgstRate] = useState(9);
    const [igstRate] = useState(18);

    // Auto-calculate totals
    useEffect(() => {
        const subtotal = formData.lineItems.reduce(
            (sum: number, li: any) => sum + (Number(li.quantity) * Number(li.rate)),
            0
        );

        let cgst = 0, sgst = 0, igst = 0;
        if (taxType === "intrastate") {
            cgst = (subtotal * cgstRate) / 100;
            sgst = (subtotal * sgstRate) / 100;
        } else {
            igst = (subtotal * igstRate) / 100;
        }

        const total = subtotal + cgst + sgst + igst;

        setFormData((prev: any) => ({
            ...prev,
            subtotal,
            cgst,
            sgst,
            igst,
            total,
        }));
    }, [formData.lineItems, taxType, cgstRate, sgstRate, igstRate]);

    // Auto-calculate due date
    useEffect(() => {
        if (formData.invoiceDate && formData.paymentTerms && formData.client?.id) {
            const selectedClient = clients.find(c => c.id === formData.client?.id);
            const customDays = (selectedClient as any)?.customTermDays;
            const dueDate = calculateDueDate(formData.invoiceDate, formData.paymentTerms, customDays);
            setFormData((prev: any) => ({ ...prev, dueDate }));
        }
    }, [formData.invoiceDate, formData.paymentTerms, formData.client?.id, clients]);

    // Auto-generate invoice number
    useEffect(() => {
        if (!initialInvoice && formData.business?.id) {
            const selectedBusiness = businesses.find(b => b.id === formData.business.id);
            if (selectedBusiness) {
                const nextNumber = generateNextInvoiceNumber(selectedBusiness as any, allInvoices as any);
                setFormData((prev: any) => ({ ...prev, invoiceNumber: nextNumber }));
            }
        }
    }, [formData.business?.id, initialInvoice, businesses, allInvoices]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.client?.id || !formData.business?.id || !formData.invoiceNumber) {
            alert("Please fill required fields (Client, Business Profile, Invoice Number)");
            return;
        }

        setIsUploading(true);
        try {
            const { lineItems, ...invoiceData } = formData;
            const invoiceId = initialInvoice ? initialInvoice.id : id();
            const lineItemIds = (lineItems as any[]).map((li: any) => li.id || id());

            const isNew = !initialInvoice;
            const txs = [
                db.tx.invoices[invoiceId].update({
                    invoiceNumber: invoiceData.invoiceNumber,
                    invoiceDate: invoiceData.invoiceDate,
                    orderNumber: invoiceData.orderNumber || undefined,
                    paymentTerms: invoiceData.paymentTerms || undefined,
                    dueDate: invoiceData.dueDate,
                    subject: invoiceData.subject || undefined,
                    status: invoiceData.status,
                    subtotal: Number(invoiceData.subtotal) || 0,
                    cgst: taxType === "intrastate" ? (Number(invoiceData.cgst) || 0) : undefined,
                    sgst: taxType === "intrastate" ? (Number(invoiceData.sgst) || 0) : undefined,
                    igst: taxType === "interstate" ? (Number(invoiceData.igst) || 0) : undefined,
                    total: Number(invoiceData.total) || 0,
                    notes: invoiceData.notes || undefined,
                    termsAndConditions: invoiceData.termsAndConditions || undefined,
                    usageType: invoiceData.usageType || undefined,
                    usageOther: invoiceData.usageOther || undefined,
                    usageDuration: invoiceData.usageDuration || undefined,
                    usageGeography: invoiceData.usageGeography || undefined,
                    usageExclusivity: invoiceData.usageExclusivity || undefined,
                    advanceAmount: Number(invoiceData.advanceAmount) || 0,
                    isAdvanceReceived: !!invoiceData.isAdvanceReceived,
                    tdsDeducted: !!formData.tdsDeducted,
                    tdsAmount: Number(formData.tdsAmount) || 0,
                }),
                db.tx.invoices[invoiceId].link({ client: formData.client.id }),
                db.tx.invoices[invoiceId].link({ business: formData.business.id }),
                db.tx.clients[formData.client.id].link({ business: formData.business.id }),
                ...(formData.bankAccount?.id ? [db.tx.invoices[invoiceId].link({ bankAccount: formData.bankAccount.id })] : []),
                ...(lineItems as any[]).map((li: any, i: number) =>
                    db.tx.lineItems[lineItemIds[i]].update({
                        itemType: li.itemType || undefined,
                        description: li.description,
                        sacCode: li.sacCode || undefined,
                        quantity: Number(li.quantity) || 0,
                        rate: Number(li.rate) || 0,
                        amount: Number(li.amount) || 0,
                    })
                ),
                db.tx.invoices[invoiceId].link({ lineItems: lineItemIds }),
            ];

            if (isNew) txs.push(db.tx.invoices[invoiceId].link({ owner: userId }));

            if (initialInvoice) {
                const currentItemIds = new Set(lineItemIds);
                const removedItems = initialInvoice.lineItems.filter(li => !currentItemIds.has(li.id));
                removedItems.forEach(li => txs.push(db.tx.lineItems[li.id].delete()));
            }

            db.transact(txs);
            onClose();
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-12">
            {/* Tabs - only if mobile per user rules? 
                Actually user said: "Invoice form \u2192 Sections (don\u2019t tab forms)"
                So I will use visual sections instead of tabs on mobile.
            */}

            <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Identity & Financials</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Business Profile *</label>
                        <select
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 focus:bg-white transition-all appearance-none"
                            value={formData.business?.id}
                            onChange={(e) => {
                                const b = businesses.find(bz => bz.id === e.target.value);
                                setFormData({ ...formData, business: { id: e.target.value }, bankAccount: { id: b?.bankAccounts?.[0]?.id || "" } });
                            }}
                            required
                        >
                            <option value="">Select Profile</option>
                            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Target Client *</label>
                        <select
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 focus:bg-white transition-all appearance-none"
                            value={formData.client?.id}
                            onChange={(e) => {
                                const c = clients.find(cl => cl.id === e.target.value);
                                setFormData({ ...formData, client: { id: e.target.value }, paymentTerms: (c as any)?.paymentTerms || "net_30" });
                            }}
                            required
                        >
                            <option value="">Select Client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.displayName || (c as any).firstName}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Invoice Number *</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 focus:bg-white transition-all"
                            value={formData.invoiceNumber}
                            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Invoice Date</label>
                        <input
                            type="date"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 focus:bg-white transition-all"
                            value={formData.invoiceDate}
                            onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Payment Terms</label>
                        <select
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 focus:bg-white transition-all appearance-none"
                            value={formData.paymentTerms}
                            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                        >
                            {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Scope of Work</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, lineItems: [...formData.lineItems, { itemType: "custom", description: "", sacCode: "", quantity: 1, rate: 0, amount: 0 }] })}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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
                                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
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
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Qty</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
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
                                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                                        value={item.rate}
                                        onChange={(e) => {
                                            const items = [...formData.lineItems];
                                            items[index].rate = Number(e.target.value);
                                            items[index].amount = items[index].quantity * items[index].rate;
                                            setFormData({ ...formData, lineItems: items });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Amount</label>
                                    <div className="w-full bg-gray-100 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-black text-gray-900">
                                        ₹{item.amount.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-gray-900 rounded-[2rem] p-8 text-white space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subtotal</span>
                    <span className="text-xl font-black">₹{formData.subtotal.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setTaxType("intrastate")}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${taxType === 'intrastate' ? 'bg-white text-gray-900 border-white' : 'border-white/20 text-white/60'}`}
                    >
                        Intrastate (CGST/SGST)
                    </button>
                    <button
                        type="button"
                        onClick={() => setTaxType("interstate")}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${taxType === 'interstate' ? 'bg-white text-gray-900 border-white' : 'border-white/20 text-white/60'}`}
                    >
                        Interstate (IGST)
                    </button>
                </div>

                <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                        <span>Total Tax ({taxType === 'intrastate' ? '18%' : '18%'})</span>
                        <span>₹{(formData.cgst + formData.sgst + formData.igst).toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">Grand Total</span>
                    <span className="text-4xl font-[1000] tracking-tighter shadow-sm">₹{formData.total.toLocaleString()}</span>
                </div>
            </section>
        </form>
    );
}
