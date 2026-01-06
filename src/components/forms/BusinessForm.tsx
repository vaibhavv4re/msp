"use client";
import React, { useState } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { Business, BankAccount } from "@/types";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Trash2, Plus, Camera } from "lucide-react";

const BUSINESS_COLORS = [
    { name: "Gray", value: "#374151" },
    { name: "Red", value: "#dc2626" },
    { name: "Blue", value: "#2563eb" },
    { name: "Green", value: "#16a34a" },
    { name: "Purple", value: "#7c3aed" },
    { name: "Pink", value: "#db2777" },
    { name: "Orange", value: "#ea580c" },
];

interface BusinessFormProps {
    initialBusiness?: Business | null;
    userId: string;
    onSuccess: () => void;
    onCancel: () => void;
    isMobile?: boolean;
}

export function BusinessForm({
    initialBusiness,
    userId,
    onSuccess,
    onCancel,
    isMobile = false
}: BusinessFormProps) {
    const [formData, setFormData] = useState({
        name: initialBusiness?.name || "",
        email: initialBusiness?.email || "",
        contact: initialBusiness?.contact || "",
        address: initialBusiness?.address || "",
        gst: initialBusiness?.gst || "",
        pan: initialBusiness?.pan || "",
        color: initialBusiness?.color || BUSINESS_COLORS[0].value,
        invoicePrefix: initialBusiness?.invoicePrefix || "INV",
        invoiceSeparator: initialBusiness?.invoiceSeparator || "/",
        invoiceIncludeFY: initialBusiness?.invoiceIncludeFY || false,
        invoiceFYFormat: initialBusiness?.invoiceFYFormat || "25",
        invoiceStartNumber: initialBusiness?.invoiceStartNumber || 1,
        invoicePadding: initialBusiness?.invoicePadding || 4,
        bankAccounts: initialBusiness?.bankAccounts?.map(acc => ({ ...acc })) || [
            { id: id(), bankName: "", holderName: "", accountNumber: "", ifsc: "", label: "Primary", isActive: true }
        ],
        signatureUrl: initialBusiness?.signatureUrl || "",
    });

    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsUploading(true);
        try {
            const businessId = initialBusiness ? initialBusiness.id : id();
            const txs = [
                db.tx.businesses[businessId].update({
                    name: formData.name,
                    email: formData.email,
                    contact: formData.contact,
                    address: formData.address,
                    gst: formData.gst,
                    pan: formData.pan,
                    color: formData.color,
                    invoicePrefix: formData.invoicePrefix,
                    invoiceSeparator: formData.invoiceSeparator,
                    invoiceIncludeFY: formData.invoiceIncludeFY,
                    invoiceFYFormat: formData.invoiceFYFormat,
                    invoiceStartNumber: Number(formData.invoiceStartNumber),
                    invoicePadding: Number(formData.invoicePadding),
                    signatureUrl: formData.signatureUrl,
                }),
                db.tx.businesses[businessId].link({ owner: userId }),
                ...formData.bankAccounts.map((acc: any) =>
                    db.tx.bankAccounts[acc.id].update({
                        bankName: acc.bankName,
                        holderName: acc.holderName,
                        accountNumber: acc.accountNumber,
                        ifsc: acc.ifsc,
                        label: acc.label,
                        isActive: acc.isActive,
                    })
                ),
                db.tx.businesses[businessId].link({ bankAccounts: formData.bankAccounts.map(a => a.id) })
            ];

            if (!initialBusiness) {
                txs.push(db.tx.businesses[businessId].update({ status: "active" }));
            }

            db.transact(txs);
            onSuccess();
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const result = await uploadToCloudinary(file, "signatures");
            setFormData({ ...formData, signatureUrl: result.secure_url });
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-12 pb-24 md:pb-0">
            <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-gray-900 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Basic Information</h3>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Name *</label>
                    <input
                        type="text"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Contact</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.contact}
                            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
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

            <section className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Legal Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">GSTIN</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.gst}
                            onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">PAN</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.pan}
                            onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                        />
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-green-600 rounded-full"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Banking</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const newAcc = { id: id(), bankName: "", holderName: "", accountNumber: "", ifsc: "", label: "Other", isActive: false };
                            setFormData({ ...formData, bankAccounts: [...formData.bankAccounts, newAcc] });
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {formData.bankAccounts.map((acc, index) => (
                        <div key={acc.id} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <input
                                    type="text"
                                    className="bg-transparent border-b border-gray-200 text-xs font-black uppercase tracking-widest outline-none"
                                    value={acc.label}
                                    onChange={(e) => {
                                        const accounts = [...formData.bankAccounts];
                                        accounts[index].label = e.target.value;
                                        setFormData({ ...formData, bankAccounts: accounts });
                                    }}
                                />
                                {formData.bankAccounts.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const accounts = [...formData.bankAccounts];
                                            accounts.splice(index, 1);
                                            setFormData({ ...formData, bankAccounts: accounts });
                                        }}
                                        className="text-red-300 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Bank Name"
                                    className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900"
                                    value={acc.bankName}
                                    onChange={(e) => {
                                        const accounts = [...formData.bankAccounts];
                                        accounts[index].bankName = e.target.value;
                                        setFormData({ ...formData, bankAccounts: accounts });
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Account Number"
                                    className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900"
                                    value={acc.accountNumber}
                                    onChange={(e) => {
                                        const accounts = [...formData.bankAccounts];
                                        accounts[index].accountNumber = e.target.value;
                                        setFormData({ ...formData, bankAccounts: accounts });
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="IFSC"
                                    className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900"
                                    value={acc.ifsc}
                                    onChange={(e) => {
                                        const accounts = [...formData.bankAccounts];
                                        accounts[index].ifsc = e.target.value;
                                        setFormData({ ...formData, bankAccounts: accounts });
                                    }}
                                />
                                <div className="flex items-center gap-2 px-2">
                                    <input
                                        type="checkbox"
                                        checked={acc.isActive}
                                        onChange={(e) => {
                                            const accounts = [...formData.bankAccounts];
                                            accounts.forEach((a, i) => a.isActive = (i === index ? e.target.checked : false));
                                            setFormData({ ...formData, bankAccounts: accounts });
                                        }}
                                    />
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Default Account</label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Signature</h3>
                </div>
                <div className="relative group">
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleSignatureUpload} accept="image/*" />
                    <div className={`p-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-all ${formData.signatureUrl ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 bg-gray-50/50 group-hover:border-gray-900'}`}>
                        {formData.signatureUrl ? (
                            <img src={formData.signatureUrl} alt="Signature" className="h-16 object-contain" />
                        ) : (
                            <>
                                <Camera className="w-6 h-6 text-gray-400" />
                                <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Tap to upload sign</p>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 md:relative md:bg-transparent md:border-none md:p-0 pt-8">
                <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-6 bg-gray-900 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-gray-200 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                >
                    {isUploading ? "Syncing..." : initialBusiness ? "Update Profile" : "Launch Profile"}
                </button>
            </div>
        </form>
    );
}
