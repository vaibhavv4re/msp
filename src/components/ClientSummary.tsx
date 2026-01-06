import React from "react";
import { Invoice, Client, Business } from "@/app/page";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Plus,
    Edit,
    User,
    Briefcase,
    Camera,
    Clock,
    AlertCircle,
    Receipt,
    StickyNote,
    ChevronRight,
} from "lucide-react";

interface ClientSummaryProps {
    client: Client;
    invoices: Invoice[];
    businesses: Business[];
    userId: string;
    activeBusinessId: string;
    onBack: () => void;
    onEdit: (client: Client) => void;
    onCreateInvoice: (clientId: string) => void;
    onViewInvoice: (invoiceId: string) => void;
}

export function ClientSummary({
    client,
    invoices: allInvoices,
    businesses,
    userId,
    activeBusinessId,
    onBack,
    onEdit,
    onCreateInvoice,
    onViewInvoice
}: ClientSummaryProps) {
    // Filter invoices for this client
    const invoices = allInvoices.filter(inv => inv.client?.id === client.id);

    // 1. Calculations
    const lifetimeInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalReceived = invoices.reduce((sum, inv) => sum + (inv.advanceAmount || 0), 0);
    const outstandingBalance = invoices.reduce((sum, inv) => {
        if (inv.status === "Paid") return sum;
        const tds = (inv as any).tdsAmount || 0;
        return sum + (inv.total || 0) - (inv.advanceAmount || 0) - tds;
    }, 0);
    const totalInvoicesCount = invoices.length;

    // Payment behavior logic
    const paidInvoices = invoices.filter(inv => inv.status === "Paid" && inv.sentAt && inv.paidAt);
    const avgPaymentDays = paidInvoices.length > 0
        ? Math.round(paidInvoices.reduce((sum, inv) => {
            const sent = new Date(inv.sentAt!);
            const paid = new Date(inv.paidAt!);
            return sum + (paid.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / paidInvoices.length)
        : null;

    const latePaymentsCount = invoices.filter(inv => {
        const today = new Date().toISOString().split('T')[0];
        return inv.status !== "Paid" && (inv.dueDate || "") < today;
    }).length;

    const reliability = latePaymentsCount === 0 ? "Reliable" : latePaymentsCount < 3 ? "Sometimes late" : "Frequently late";
    const reliabilityColor = latePaymentsCount === 0 ? "text-green-600 bg-green-50" : latePaymentsCount < 3 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50";

    // Financial Context
    const paidInvoicesForTax = invoices.filter(inv => inv.status === "Paid" || (inv as any).tdsAmount > 0);
    const totalGstCollected = paidInvoicesForTax.reduce((sum, inv) => sum + (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0), 0);
    const totalTdsDeducted = invoices.reduce((sum, inv) => sum + ((inv as any).tdsAmount || 0), 0);

    // Usage Context
    const currentYear = new Date().getFullYear().toString();
    const yearlyShootFrequency = invoices.filter(inv => (inv.invoiceDate || "").startsWith(currentYear)).length;
    const invoiceValues = invoices.map(inv => inv.total || 0);
    const minValue = invoiceValues.length > 0 ? Math.min(...invoiceValues) : 0;
    const maxValue = invoiceValues.length > 0 ? Math.max(...invoiceValues) : 0;

    // Per Business Breakdown (only for "All Businesses" mode)
    const businessMetrics = businesses.map(biz => {
        const bizInvoices = invoices.filter(inv => inv.business?.id === biz.id);
        const bizTotal = bizInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const bizOutstanding = bizInvoices.reduce((sum, inv) => {
            if (inv.status === "Paid") return sum;
            const allowance = (inv as any).isAdvanceReceived ? ((inv as any).advanceAmount || 0) : 0;
            const tds = (inv as any).tdsAmount || 0;
            return sum + (inv.total || 0) - allowance - tds;
        }, 0);
        return {
            ...biz,
            totalBilled: bizTotal,
            outstanding: bizOutstanding,
            count: bizInvoices.length
        };
    }).filter(m => m.count > 0);

    // Invoice History Filters
    const [filter, setFilter] = React.useState<"All" | "Paid" | "Unpaid" | "Overdue">("All");
    const filteredInvoices = invoices.filter(inv => {
        if (filter === "All") return true;
        if (filter === "Overdue") {
            const today = new Date().toISOString().split('T')[0];
            return inv.status !== "Paid" && (inv.dueDate || "") < today;
        }
        return inv.status === filter;
    }).sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || ""));

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* 1. Header Section */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-900" />
                            </button>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {client.clientType === "Business" ? <Briefcase className="w-4 h-4 text-blue-500" /> : <User className="w-4 h-4 text-green-500" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{client.clientType || "Individual"}</span>
                                </div>
                                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                                    {client.displayName || client.companyName || "Unnamed client"}
                                </h1>
                                <div className="flex items-center gap-3 mt-3">
                                    {client.gst && <span className="text-[11px] font-bold text-gray-900 px-2 py-0.5 bg-gray-100 rounded tracking-wider uppercase">GSTIN: {client.gst}</span>}
                                    {client.pan && <span className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">PAN: {client.pan}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 md:self-end">
                            <button
                                onClick={() => onCreateInvoice(client.id)}
                                className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> Create Invoice
                            </button>
                            <button
                                onClick={() => onEdit(client)}
                                className="flex-1 md:flex-initial flex items-center justify-center gap-2 border-2 border-gray-100 bg-white text-gray-900 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                            >
                                <Edit className="w-4 h-4" /> Edit Client
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 pt-6 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-gray-900">
                            <Mail className="w-4 h-4" />
                            <span className="text-sm font-bold truncate max-w-[200px]">{client.email || "No email listed"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-900">
                            <Phone className="w-4 h-4" />
                            <span className="text-sm font-bold tracking-wider">{client.phone || "No phone listed"}</span>
                        </div>
                        <div className="flex items-start gap-2 text-gray-900 group cursor-pointer">
                            <MapPin className="w-4 h-4 mt-0.5" />
                            <span className="text-sm font-bold line-clamp-1 group-hover:line-clamp-none transition-all">{client.address || "No address listed"}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                    {/* Main Content Area */}
                    <div className="md:col-span-8 space-y-8">

                        {/* 2. Relationship Snapshot */}
                        <section>
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-4">Relationship Snapshot</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "Lifetime Invoiced", value: `₹${lifetimeInvoiced.toLocaleString()}`, color: "text-gray-900" },
                                    { label: "Total Received", value: `₹${totalReceived.toLocaleString()}`, color: "text-green-600" },
                                    { label: "Outstanding", value: `₹${outstandingBalance.toLocaleString()}`, color: outstandingBalance > 0 ? "text-red-500" : "text-gray-900" },
                                    { label: "Invoices", value: totalInvoicesCount, color: "text-blue-600" }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:translate-y-[-2px]">
                                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2">{stat.label}</p>
                                        <p className={`text-xl font-black ${stat.color} tracking-tight`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 4. Invoice History */}
                        <section>
                            <div className="flex justify-between items-end mb-4">
                                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Invoice History</h3>
                                <div className="flex bg-white rounded-lg border border-gray-100 p-0.5">
                                    {["All", "Paid", "Unpaid", "Overdue"].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setFilter(t as any)}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tight transition-all ${filter === t ? "bg-gray-900 text-white" : "text-gray-900 hover:bg-gray-50"}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {/* Desktop Table */}
                                <div className="hidden md:block">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-900 uppercase tracking-widest">Number</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-900 uppercase tracking-widest">Issued</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-900 uppercase tracking-widest">Amount</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-900 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                            {filteredInvoices.map((inv) => (
                                                <tr
                                                    key={inv.id}
                                                    onClick={() => onViewInvoice(inv.id)}
                                                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                                >
                                                    <td className="px-6 py-4 text-gray-900 font-black">₹{inv.total?.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-gray-900 font-bold">{new Date(inv.invoiceDate || "").toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                    <td className="px-6 py-4 text-gray-900 font-black">₹{inv.total?.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${inv.status === "Paid" ? "bg-green-50 text-green-600" :
                                                            inv.status === "Unpaid" ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"
                                                            }`}>
                                                            {inv.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="p-2 group-hover:bg-gray-100 rounded-full transition-colors">
                                                            <ChevronRight className="w-4 h-4 text-gray-900" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile List */}
                                <div className="md:hidden divide-y divide-gray-50">
                                    {filteredInvoices.map((inv) => (
                                        <div
                                            key={inv.id}
                                            onClick={() => onViewInvoice(inv.id)}
                                            className="p-5 flex justify-between items-center group active:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-gray-900 tracking-tight uppercase">{inv.invoiceNumber}</span>
                                                    <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${inv.status === "Paid" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"
                                                        }`}>{inv.status}</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">{new Date(inv.invoiceDate || "").toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-gray-900 tracking-tight">₹{inv.total?.toLocaleString()}</p>
                                                <ChevronRight className="w-4 h-4 text-gray-900 ml-auto mt-1" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {filteredInvoices.length === 0 && (
                                    <div className="p-20 text-center">
                                        <p className="text-xs font-black text-gray-900 uppercase tracking-widest">No matching invoices</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar / Secondary Sections */}
                    <div className="md:col-span-4 space-y-8">

                        {/* 3. Payment Behaviour */}
                        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Payment Behaviour</h3>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${reliabilityColor}`}>
                                    {reliability}
                                </span>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-900">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-0.5">Average Payment Time</p>
                                        <p className="text-lg font-black text-gray-900 tracking-tight">
                                            {avgPaymentDays ? `Pays in ~${avgPaymentDays} days` : "Data Pending"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-0.5">Late Payments</p>
                                        <p className="text-lg font-black text-gray-900 tracking-tight">
                                            {latePaymentsCount} {latePaymentsCount === 1 ? 'instance' : 'instances'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-0.5">Advance Policy</p>
                                        <p className="text-lg font-black text-gray-900 tracking-tight">
                                            {invoices.some(i => i.isAdvanceReceived) ? "Usually taken" : "None recorded"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <p className="mt-8 text-[9px] font-bold text-gray-900 uppercase leading-relaxed text-center px-4">
                                Behavior analytics based on {paidInvoices.length} settled transactions
                            </p>
                        </section>

                        {/* 5. Financial Summary */}
                        <section className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6">Financial Awareness</h3>
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">GST Collected</p>
                                    <p className="text-xl font-black tracking-tighter">₹{totalGstCollected.toLocaleString()}</p>
                                </div>
                                {totalTdsDeducted > 0 && (
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">TDS Deducted</p>
                                        <p className="text-xl font-black tracking-tighter text-yellow-400">₹{totalTdsDeducted.toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                            <p className="mt-6 text-[9px] font-bold text-white/30 uppercase leading-relaxed italic">
                                “Actual tax treatment decided at filing time.”
                            </p>
                        </section>

                        {/* 6. Usage Context */}
                        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
                            <div className="relative z-10">
                                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">Usage & Work context</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-900 uppercase tracking-tight mb-1">Yearly Frequency</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-gray-900">{yearlyShootFrequency}</span>
                                            <span className="text-[10px] font-bold text-gray-900 uppercase">shoots</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-900 uppercase tracking-tight mb-1">Val. Range</p>
                                        <div className="text-xs font-black text-gray-900 tracking-tight">
                                            ₹{minValue / 1000}k — ₹{maxValue / 1000}k
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Camera className="absolute -bottom-4 -right-4 w-24 h-24 text-gray-50/50" />
                        </section>

                        {/* 7. Notes */}
                        <section className="bg-white rounded-3xl border-2 border-dashed border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <StickyNote className="w-4 h-4 text-yellow-500" />
                                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Notes / Memory</h3>
                            </div>
                            <textarea
                                className="w-full bg-transparent text-sm font-bold text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none"
                                rows={4}
                                placeholder="Add context about this client (e.g. 'Prefers dark backgrounds', 'Always pays by credit card')..."
                            />
                        </section>

                    </div>
                </div>
            </div>
        </div>
    );
}
