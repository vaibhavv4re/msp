"use client";

import React, { useState } from "react";
import { BusinessModal } from "./Settings";
import { Building2, Briefcase, Calculator, Palette, ArrowRight, ShieldCheck, X } from "lucide-react";

export function Onboarding({ userId, onComplete }: { userId: string; onComplete: () => void }) {
    const [showModal, setShowModal] = useState(false);
    const [showPoliteMessage, setShowPoliteMessage] = useState(false);

    if (showModal) {
        return (
            <BusinessModal
                business={null}
                userId={userId}
                onClose={() => {
                    setShowModal(false);
                    // We don't call onComplete here because we want to see if the profile was actually created
                    // But Settings.tsx handles the DB transaction. 
                    // page.tsx will re-query and businesses.length will be > 0, hiding onboarding.
                }}
            />
        );
    }

    if (showPoliteMessage) {
        return (
            <div className="fixed inset-0 bg-white z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-10 h-10 text-blue-600" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-[1000] text-gray-900 uppercase tracking-tighter">We understand!</h2>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                            However, setting up a <span className="text-gray-900 underline decoration-blue-500 decoration-2">Business Profile</span> is the heart of Backdrop.
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-3xl p-6 text-left space-y-4 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Why it matters:</p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                <p className="text-[11px] font-bold text-gray-700 uppercase leading-normal">Generate Professional Invoices with your custom branding & GST details.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                <p className="text-[11px] font-bold text-gray-700 uppercase leading-normal">Track Tax Zones (GST/TDS) accurately based on your business location.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                <p className="text-[11px] font-bold text-gray-700 uppercase leading-normal">Link Bank Accounts for seamless payment instructions on every bill.</p>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full bg-black text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-900 transition-all shadow-xl shadow-black/10"
                        >
                            Okay, let's set it up
                        </button>
                        <button
                            onClick={onComplete}
                            className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                        >
                            Skip and explore with empty data
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col md:flex-row animate-in fade-in duration-700 overflow-y-auto">
            {/* Left: Branding & Welcome */}
            <div className="flex-1 bg-black text-white p-8 md:p-12 flex flex-col justify-between min-h-fit md:min-h-screen">
                <div>
                    <div className="flex items-center gap-1 mb-10 md:mb-16">
                        <span className="text-3xl md:text-4xl font-[1000] leading-none">B</span>
                        <span className="text-3xl md:text-4xl font-[1000] text-blue-500 leading-none -ml-1">.</span>
                    </div>
                    <div className="space-y-4 md:space-y-6">
                        <span className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] block">Welcome to the future</span>
                        <h1 className="text-4xl md:text-7xl font-[1000] uppercase tracking-tighter leading-[0.9]">
                            Define Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-500">Business.</span>
                        </h1>
                        <p className="text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest max-w-sm md:max-w-md leading-relaxed">
                            Let's craft your professional identity. Setting up your first business profile takes less than 60 seconds.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-8 py-6 md:py-8 border-t border-white/10 mt-8 md:mt-12">
                    <div className="space-y-2">
                        <Palette className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white">Custom Branding</p>
                    </div>
                    <div className="space-y-2">
                        <Calculator className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white">Tax Compliance</p>
                    </div>
                </div>
            </div>

            {/* Right: Path Selection */}
            <div className="flex-1 bg-gray-50 p-8 md:p-12 flex items-center justify-center">
                <div className="max-w-md w-full space-y-8 md:space-y-12 text-center md:text-left">
                    <div className="space-y-3 md:space-y-4">
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">Choose your start</h2>
                        <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-widest leading-relaxed">
                            Every invoice you send, every expense you track, and every client you manage starts with your business profile.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full group bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-gray-100 flex items-center gap-4 md:gap-6 hover:shadow-2xl hover:border-blue-100 md:hover:-translate-y-1 transition-all"
                        >
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                                <Building2 className="w-6 h-6 md:w-8 md:h-8 text-white" />
                            </div>
                            <div className="text-left flex-1">
                                <p className="text-[9px] md:text-[11px] font-black text-blue-600 uppercase tracking-widest mb-0.5 md:mb-1">Recommended</p>
                                <h4 className="text-base md:text-lg font-[1000] text-gray-900 uppercase tracking-tight">Create First Profile</h4>
                            </div>
                            <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => setShowPoliteMessage(true)}
                            className="w-full group bg-white/50 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 flex items-center gap-4 md:gap-6 hover:bg-white hover:shadow-xl transition-all"
                        >
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-xl flex items-center justify-center shrink-0">
                                <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                            </div>
                            <div className="text-left flex-1">
                                <h4 className="text-xs md:text-sm font-black text-gray-500 group-hover:text-gray-900 uppercase tracking-widest transition-colors">Skip for now</h4>
                            </div>
                        </button>
                    </div>

                    <div className="pt-4 md:pt-8 text-center text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">
                        Trusted by modern creatives & agencies worldwide
                    </div>
                </div>
            </div>
        </div>
    );
}
