"use client";
import { useParams } from "next/navigation";
import { db } from "@/lib/db";
import React from "react";
import { Estimate, LineItem } from "@/app/page";

export default function PublicEstimateView() {
    const { id: estimateId } = useParams();

    const { isLoading, error, data } = db.useQuery({
        estimates: {
            $: { where: { id: estimateId } },
            client: {},
            business: { bankAccounts: {} },
            lineItems: {}
        }
    } as any);

    if (isLoading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
    );

    const estimate = (data as any)?.estimates?.[0] as Estimate;

    if (!estimate) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-4">404</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimate Not Found or Link Expired</p>
        </div>
    );

    const business = estimate.business;
    const client = estimate.client;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 md:py-24">
            <div className="max-w-4xl mx-auto bg-white rounded-[4rem] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Header Section */}
                <div className="p-12 md:p-20 border-b border-gray-50 flex flex-col md:flex-row justify-between gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: business?.color || '#000' }}></div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">
                                {business?.name}
                            </h2>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Estimate For</p>
                            <p className="text-xl font-bold text-gray-900">{estimate.recipientName || client?.displayName || client?.firstName}</p>
                            {estimate.recipientContact && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{estimate.recipientContact}</p>}
                            <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-xs">{client?.address}</p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col justify-end space-y-2">
                        <div className="inline-block bg-gray-900 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ml-auto w-fit">
                            Estimate #{estimate.id.slice(0, 8).toUpperCase()}
                        </div>
                        <p className="text-xs font-black text-gray-900 uppercase tracking-widest italic pt-2">
                            Issued: {new Date(estimate.date || "").toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        {estimate.validUntil && (
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                                Valid Until: {new Date(estimate.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-12 md:p-20">
                    {/* Items Section */}
                    <div className="space-y-8">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-4">Proposed Scope & Pricing</h3>
                        <div className="space-y-6 divide-y divide-gray-50">
                            {estimate.lineItems && estimate.lineItems.length > 0 ? (
                                estimate.lineItems.map((item: LineItem) => (
                                    <div key={item.id} className="pt-6 first:pt-0 flex justify-between items-start gap-8">
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{item.description}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {item.quantity} × ₹{(item.rate || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <p className="text-sm font-black text-gray-900">₹{((item.quantity || 0) * (item.rate || 0)).toLocaleString('en-IN')}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact us for detailed line items</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div className="mt-16 pt-12 border-t-4 border-gray-900 flex flex-col md:flex-row justify-between gap-12">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Estimated Total</p>
                        <p className="text-6xl font-[1000] text-gray-900 tracking-tighter italic">₹{(estimate.total || 0).toLocaleString('en-IN')}</p>
                    </div>

                    {/* Scope of Work Structured Rendering */}
                    {(() => {
                        try {
                            if (estimate.notes?.startsWith('{')) {
                                const scope = JSON.parse(estimate.notes);
                                const hasStructuredData = scope.deliverables || scope.schedule || scope.usage || scope.exclusions;

                                if (hasStructuredData) {
                                    return (
                                        <div className="mt-12 space-y-8 text-left">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-4">Scope of Work</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {scope.deliverables && (
                                                    <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">📸 Deliverables</p>
                                                        <p className="text-xs font-bold text-gray-900 leading-relaxed">{scope.deliverables}</p>
                                                    </div>
                                                )}
                                                {scope.schedule && (
                                                    <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">🗓 When & Where</p>
                                                        <p className="text-xs font-bold text-gray-900 leading-relaxed">{scope.schedule}</p>
                                                    </div>
                                                )}
                                                {scope.usage && (
                                                    <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">🎨 Usage Rights</p>
                                                        <p className="text-xs font-bold text-gray-900 leading-relaxed">{scope.usage}</p>
                                                    </div>
                                                )}
                                                {scope.exclusions && (
                                                    <div className="bg-red-50/30 p-6 rounded-[2rem] border border-red-100">
                                                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2 italic">🚫 Exclusions</p>
                                                        <p className="text-xs font-bold text-gray-900 leading-relaxed">{scope.exclusions}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {scope.additionalNotes && (
                                                <div className="bg-gray-50/30 p-8 rounded-[2.5rem] border border-gray-100">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-relaxed italic mb-4">Additional Notes</p>
                                                    <p className="text-xs font-bold text-gray-600 leading-relaxed whitespace-pre-line">{scope.additionalNotes}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            }
                        } catch (e) { }

                        return (
                            <div className="mt-12 pt-8 border-t border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-relaxed max-w-sm">
                                    {estimate.notes || "This estimate is a drafting tool for commercial intent and does not constitute a legal tax invoice until converted and formally issued."}
                                </p>
                            </div>
                        );
                    })()}

                    {/* Advance Summary */}
                    {(estimate as any).requiresAdvance && (
                        <div className="mt-12 bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100 animate-in zoom-in duration-500 text-right">
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-1">Confirmation Advance Required</p>
                            <div className="flex justify-end items-baseline gap-2 mb-4">
                                <p className="text-4xl font-[1000] tracking-tighter italic">₹{((estimate.total || 0) * ((estimate as any).advancePercentage || 0) / 100).toLocaleString('en-IN')}</p>
                                <span className="text-[10px] font-black text-white/50 uppercase">({(estimate as any).advancePercentage}%)</span>
                            </div>
                            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-300 animate-pulse"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                                    PAY {(estimate as any).advanceDeadlineDays} DAYS BEFORE SHOOT TO CONFIRM
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="px-12 md:px-20 py-12 bg-gray-50/50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Authorized by</p>
                        <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">{business?.name}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase">{business?.email}</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => window.print()}
                            className="bg-white border border-gray-200 text-gray-900 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all shadow-sm"
                        >
                            Print Reference
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.4em]">Powered by Backdrop Business Suite</p>
            </div>
        </div>
    );
}
