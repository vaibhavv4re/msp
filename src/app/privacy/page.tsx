import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPolicy() {
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
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] block">Legal & Transparency</span>
                    <h1 className="text-6xl md:text-8xl font-[1000] uppercase tracking-tighter leading-[0.85]">
                        Privacy <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-400">Policy.</span>
                    </h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-8">Last Updated: December 26, 2024</p>
                </div>

                <div className="space-y-16">
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">01</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Introduction</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            Welcome to Backdrop. We are committed to protecting your professional data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our business suite. By using Backdrop, you agree to the collection and use of information in accordance with this policy.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">02</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Data Collection</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                                <Lock className="w-8 h-8 text-blue-500 mb-4" />
                                <h3 className="font-black uppercase text-sm tracking-widest mb-2">Personal Identity</h3>
                                <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase">
                                    We use Google OAuth for authentication. We access your name, email address, and profile picture to create your account and provide a personalized experience.
                                </p>
                            </div>
                            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                                <FileText className="w-8 h-8 text-blue-500 mb-4" />
                                <h3 className="font-black uppercase text-sm tracking-widest mb-2">Business Data</h3>
                                <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase">
                                    Data you input—such as business profiles, client details, invoice contents, and expenses—is stored securely using InstantDB and served to you via our encrypted application interface.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">03</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Third-Party Services</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            Backdrop integrates with several industry-leading providers to deliver its core features:
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
                                <div>
                                    <h4 className="font-black uppercase text-xs tracking-widest text-gray-900">InstantDB</h4>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase mt-1">Our primary database provider. All data is managed through their secure real-time graph database architecture.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
                                <div>
                                    <h4 className="font-black uppercase text-xs tracking-widest text-gray-900">Google Calendar API</h4>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase mt-1">Used to sync your shoots and business events. We only access calendars you explicitly authorize.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
                                <div>
                                    <h4 className="font-black uppercase text-xs tracking-widest text-gray-900">Cloudinary</h4>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase mt-1">Used for secure image and document hosting. Attachments (invoices/expenses) are stored on their globally distributed CDN.</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">04</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Security</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            We take data security seriously. Backdrop utilizes SSL/TLS encryption for all data in transit. While no system is 100% secure, we follow industry best practices and rely on enterprise-grade infrastructure (AWS/Google Cloud) via our service providers to minimize risks.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-[1000] text-gray-100">05</span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Contact Us</h2>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            If you have any questions about this Privacy Policy or your data, please contact us at support@backdrop.app.
                        </p>
                    </section>
                </div>

                <footer className="mt-40 pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">© 2024 Backdrop Business Suite</p>
                    <div className="flex gap-8">
                        <Link href="/terms" className="text-[10px] font-black text-gray-900 uppercase tracking-widest hover:text-blue-500 transition-colors">Terms of Service</Link>
                    </div>
                </footer>
            </main>
        </div>
    );
}
