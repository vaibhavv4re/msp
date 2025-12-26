import React from "react";
import Link from "next/link";
import { ArrowLeft, Gavel, Scale, AlertTriangle, CheckSquare } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
            {/* Header */}
            <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to App</span>
                    </Link>
                    <div className="flex items-center gap-1">
                        <span className="text-xl font-[1000]">B</span>
                        <span className="text-xl font-[1000] text-blue-500">.</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-20">
                <div className="space-y-4 mb-20 text-center md:text-left">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] block">License & Usage</span>
                    <h1 className="text-6xl md:text-8xl font-[1000] uppercase tracking-tighter leading-[0.85]">
                        Terms of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-400">Service.</span>
                    </h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-8">Last Updated: December 26, 2024</p>
                </div>

                <div className="space-y-16">
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">01</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Agreement to Terms</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            By accessing or using Backdrop, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service. These terms apply to all visitors, users, and others who access or use the Service.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">02</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">User Accounts</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            You must provide accurate and complete information when creating an account. You are responsible for safeguarding your Google account credentials and for any activities or actions under your account.
                        </p>
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex gap-4">
                            <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
                            <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide leading-relaxed">
                                Backdrop is a business management tool. You are responsible for ensuring that the invoices, tax calculations, and business data you input comply with local regulations and laws.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">03</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Service Usage</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            Our Service allows you to manage clients, project invoices, track expenses, and sync appointments. You agree not to use the Service for any illegal or unauthorized purpose.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <CheckSquare className="w-4 h-4 text-green-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Professional Invoicing</span>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <CheckSquare className="w-4 h-4 text-green-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Financial Tracking</span>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">04</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Limitation of Liability</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            In no event shall Backdrop, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                        </p>
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                            <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wide leading-relaxed">
                                Backdrop provide tax management and financial tools for convenience only. It does not constitute professional tax or accounting advice. Always consult with a certified professional for tax filings and legal compliance.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">05</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Termination</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">06</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Changes</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect.
                        </p>
                    </section>
                </div>

                <footer className="mt-40 pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">© 2024 Backdrop Business Suite</p>
                    <div className="flex gap-8">
                        <Link href="/privacy" className="text-[10px] font-black text-gray-900 uppercase tracking-widest hover:text-blue-500 transition-colors">Privacy Policy</Link>
                    </div>
                </footer>
            </main>
        </div>
    );
}
