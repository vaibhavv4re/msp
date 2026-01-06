
import React, { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { Invoice } from "@/types";
import { X, CheckCircle, Info } from "lucide-react";

interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    userId: string;
}

const TDS_SECTIONS = [
    { value: "194J", label: "194J - Professional/Technical (10%)", rate: 10 },
    { value: "194C", label: "194C - Contractor/Sub-contractor (1% or 2%)", rate: 2 },
    { value: "194JB", label: "194JB - Professional Services (2%)", rate: 2 },
    { value: "194H", label: "194H - Commission/Brokerage (5%)", rate: 5 },
    { value: "other", label: "Other Section", rate: 0 },
];

export function RecordPaymentModal({ isOpen, onClose, invoice, userId }: RecordPaymentModalProps) {
    const currentCashPaid = invoice.advanceAmount || 0;
    const currentTdsPaid = (invoice as any).tdsAmount || 0;
    const grossTotal = invoice.total || 0;
    const netDue = grossTotal - currentCashPaid - currentTdsPaid;

    const [amountReceived, setAmountReceived] = useState(netDue.toString());
    const [wasTdsDeducted, setWasTdsDeducted] = useState(false);
    const [tdsSection, setTdsSection] = useState("194J");
    const [tdsRate, setTdsRate] = useState("10");
    const [tdsAmount, setTdsAmount] = useState("0");
    const [isSaving, setIsSaving] = useState(false);

    // Initial fill when netDue changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setAmountReceived(netDue.toString());
        }
    }, [isOpen, netDue]);

    // Calculate TDS when section changes or toggle is enabled
    const calculateTds = (rate: string) => {
        const subtotal = invoice.subtotal || 0;
        const r = parseFloat(rate) || 0;
        const calculated = Math.round((subtotal * r) / 100);

        const oldTds = parseFloat(tdsAmount) || 0;
        const currentRec = parseFloat(amountReceived) || 0;

        setTdsAmount(calculated.toString());

        // Sync amountReceived if it was exactly matching the previous (Net Due - TDS)
        if (currentRec === Math.max(0, netDue - oldTds)) {
            setAmountReceived(Math.max(0, netDue - calculated).toString());
        }
    };

    const handleTdsToggle = (enabled: boolean) => {
        setWasTdsDeducted(enabled);
        if (enabled) {
            calculateTds(tdsRate);
        } else {
            setTdsAmount("0");
            // If they toggle OFF, maybe they want to pay the full netDue again?
            const currentRec = parseFloat(amountReceived) || 0;
            const currentTds = parseFloat(tdsAmount) || 0;
            if (currentRec === Math.max(0, netDue - currentTds)) {
                setAmountReceived(netDue.toString());
            }
        }
    };

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const cashVal = parseFloat(amountReceived) || 0;
            const tdsVal = parseFloat(tdsAmount) || 0;

            const newTotalCashPaid = currentCashPaid + cashVal;
            const newTotalTdsPaid = currentTdsPaid + tdsVal;

            let newStatus = invoice.status;
            if (newTotalCashPaid + newTotalTdsPaid >= grossTotal - 1) { // 1 rupee margin for rounding
                newStatus = "Paid";
            } else if (newTotalCashPaid + newTotalTdsPaid > 0) {
                newStatus = "Partially Paid";
            }

            const txs: any[] = [
                db.tx.invoices[invoice.id].update({
                    advanceAmount: newTotalCashPaid,
                    tdsAmount: newTotalTdsPaid,
                    tdsDeducted: newTotalTdsPaid > 0,
                    isAdvanceReceived: true,
                    status: newStatus,
                    paidAt: newStatus === "Paid" ? new Date().toISOString() : undefined,
                })
            ];

            if (tdsVal > 0) {
                const entryId = id();
                const fy = new Date().getMonth() >= 3
                    ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
                    : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

                txs.push(
                    db.tx.tdsEntries[entryId].update({
                        amount: tdsVal,
                        fy,
                        hasCertificate: false,
                        notes: `Auto-recorded from Invoice #${invoice.invoiceNumber}`,
                    }),
                    db.tx.tdsEntries[entryId].link({ owner: userId }),
                    ...(invoice.client?.id ? [db.tx.tdsEntries[entryId].link({ client: invoice.client.id })] : []),
                    ...((invoice as any).business?.id ? [db.tx.tdsEntries[entryId].link({ business: (invoice as any).business.id })] : [])
                );
            }

            await db.transact(txs);
            onClose();
        } catch (error) {
            console.error("Failed to record payment:", error);
            alert("Failed to record payment. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const remainingValue = Math.max(0, netDue - (parseFloat(amountReceived) || 0) - (parseFloat(tdsAmount) || 0));

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 pb-0 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Record Payment</h3>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Settlement for #{invoice.invoiceNumber}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-6">
                    {/* Detailed Balance Breakdown */}
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <span>Gross Invoice Total</span>
                            <span className="text-gray-900">₹{grossTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <span>Already Paid (Cash)</span>
                            <span className="text-gray-900">₹{currentCashPaid.toLocaleString()}</span>
                        </div>
                        {currentTdsPaid > 0 && (
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <span>Already Settled (TDS)</span>
                                <span className="text-gray-900">₹{currentTdsPaid.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900">Net Due Now</span>
                            <span className="text-2xl font-black text-gray-900">₹{netDue.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount Received (Cash/Bank)</label>
                                <button
                                    type="button"
                                    onClick={() => setAmountReceived(netDue.toString())}
                                    className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                >
                                    Settle Full
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">₹</span>
                                <input
                                    type="number"
                                    className="w-full pl-8 text-3xl font-black text-gray-900 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-2 focus:outline-none transition-all"
                                    value={amountReceived}
                                    onChange={(e) => setAmountReceived(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Info className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-900 uppercase tracking-tight">Was TDS Deducted?</p>
                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Marked by client</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleTdsToggle(!wasTdsDeducted)}
                                className={`w-12 h-6 rounded-full p-1 transition-all ${wasTdsDeducted ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-all ${wasTdsDeducted ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {wasTdsDeducted && (
                            <div className="space-y-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-500 uppercase">TDS Section</label>
                                        <select
                                            className="w-full bg-transparent border-b border-gray-200 py-1 text-xs font-bold outline-none focus:border-gray-900"
                                            value={tdsSection}
                                            onChange={(e) => {
                                                setTdsSection(e.target.value);
                                                const section = TDS_SECTIONS.find(s => s.value === e.target.value);
                                                if (section && section.value !== "other") {
                                                    setTdsRate(section.rate.toString());
                                                    calculateTds(section.rate.toString());
                                                }
                                            }}
                                        >
                                            {TDS_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-500 uppercase">TDS Rate (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent border-b border-gray-200 py-1 text-xs font-bold outline-none focus:border-gray-900"
                                            value={tdsRate}
                                            onChange={(e) => {
                                                setTdsRate(e.target.value);
                                                calculateTds(e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase">TDS Amount (Subtotal: ₹{invoice.subtotal?.toLocaleString()})</label>
                                    <div className="relative">
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm font-black text-gray-300">₹</span>
                                        <input
                                            type="number"
                                            className="w-full pl-4 bg-transparent border-b border-gray-200 py-1 text-lg font-black outline-none focus:border-gray-900"
                                            value={tdsAmount}
                                            onChange={(e) => {
                                                const newVal = e.target.value;
                                                const oldTds = parseFloat(tdsAmount) || 0;
                                                const newTds = parseFloat(newVal) || 0;
                                                const currentRec = parseFloat(amountReceived) || 0;

                                                setTdsAmount(newVal);

                                                // Sync amountReceived if it was exactly matching the previous balance
                                                if (currentRec === Math.max(0, netDue - oldTds)) {
                                                    setAmountReceived(Math.max(0, netDue - newTds).toString());
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {remainingValue > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-100 italic">
                                <span className="text-[10px] font-black text-orange-900 uppercase">Remaining:</span>
                                <span className="text-xs font-bold text-orange-600">₹{remainingValue.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-xs font-black uppercase text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-3 py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 px-12"
                        >
                            {isSaving ? "Saving..." : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Confirm Settlement
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
