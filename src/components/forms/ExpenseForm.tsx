"use client";
import React, { useState } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { Expense, Business } from "@/types";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Camera, CheckCircle2 } from "lucide-react";

const EXPENSE_CATEGORIES = [
    "Travel",
    "Assistants",
    "Studio / Rent",
    "Equipment / Rentals",
    "Miscellaneous"
];

interface ExpenseFormProps {
    userId: string;
    activeBusinessId: string;
    initialExpense?: Expense | null;
    onSuccess: () => void;
    onCancel: () => void;
    isMobile?: boolean;
}

export function ExpenseForm({
    userId,
    activeBusinessId,
    initialExpense,
    onSuccess,
    onCancel,
    isMobile = false
}: ExpenseFormProps) {
    const [formData, setFormData] = useState({
        amount: initialExpense?.amount?.toString() || "",
        category: initialExpense?.category || EXPENSE_CATEGORIES[0],
        vendorName: initialExpense?.vendorName || "",
        date: initialExpense?.date || new Date().toISOString().split('T')[0],
        description: initialExpense?.description || ""
    });

    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [localOcrStatus, setLocalOcrStatus] = useState<'idle' | 'processing' | 'done'>('idle');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setLocalOcrStatus('processing');
        setTimeout(() => setLocalOcrStatus('done'), 1500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount) return;

        setIsUploading(true);
        try {
            let attachmentId = initialExpense?.attachment?.id;

            if (file) {
                const cloudData = await uploadToCloudinary(file, "expenses");
                attachmentId = id();
                db.transact([
                    db.tx.attachments[attachmentId].update({
                        url: cloudData.secure_url,
                        publicId: cloudData.public_id,
                        type: "expense_bill"
                    }),
                ]);
            }

            const expenseId = initialExpense ? initialExpense.id : id();
            const trans = [
                db.tx.expenses[expenseId].update({
                    amount: parseFloat(formData.amount),
                    category: formData.category,
                    vendorName: formData.vendorName,
                    date: formData.date,
                    description: formData.description,
                    status: "confirmed",
                }),
                db.tx.expenses[expenseId].link({ owner: userId })
            ];

            if (attachmentId) trans.push(db.tx.expenses[expenseId].link({ attachment: attachmentId }));

            if (activeBusinessId && activeBusinessId !== "ALL") {
                trans.push(db.tx.expenses[expenseId].link({ business: activeBusinessId }));
            }

            db.transact(trans);
            onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10 pb-24 md:pb-0">
            <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Capture Bill</h3>
                </div>

                <div className="relative group">
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                    />
                    <div className={`p-10 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all ${file ? 'border-green-500 bg-green-50/50' : 'border-gray-100 bg-gray-50/50 group-hover:border-gray-900'}`}>
                        {file ? (
                            <div className="flex flex-col items-center">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                                <p className="text-[10px] font-black uppercase text-green-700 tracking-widest mt-2">{file.name}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Camera className="w-8 h-8 text-gray-400" />
                                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mt-2">Tap to upload bill</p>
                            </div>
                        )}
                    </div>
                </div>

                {localOcrStatus === 'processing' && (
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 animate-pulse">
                        <p className="text-[10px] font-black text-orange-900 uppercase">✨ Reading Bill...</p>
                    </div>
                )}
            </section>

            <section className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-gray-900 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Amount (₹) *</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-6 text-2xl font-black text-gray-900 focus:border-gray-900 outline-none"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest pl-1">Category</label>
                        <select
                            className="w-full h-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none appearance-none"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input
                        type="text"
                        placeholder="Vendor"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                        value={formData.vendorName}
                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    />
                    <input
                        type="date"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:border-gray-900 outline-none"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 md:relative md:bg-transparent md:border-none md:p-0 pt-8">
                <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-6 bg-gray-900 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-gray-200 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                >
                    {isUploading ? "Registering..." : "Confirm & Save Expense"}
                </button>
            </div>
        </form>
    );
}
