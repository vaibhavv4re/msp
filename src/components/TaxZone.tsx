
import { useState, useMemo, useEffect } from "react";
import { Plus, Download, Edit2, ChevronRight, Calendar } from "lucide-react";
import { Invoice, Client } from "@/app/page";
import { db } from "@/lib/db";
import { id, InstaQLEntity } from "@instantdb/react";
import schema from "@/instant.schema";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

import { generateAuditPack } from "@/lib/auditPack";

type Expense = InstaQLEntity<typeof schema, "expenses">;
type TDSEntry = InstaQLEntity<typeof schema, "tdsEntries">;

const EXPENSE_CATEGORIES = [
    "Travel",
    "Assistants",
    "Studio / Rent",
    "Equipment / Rentals",
    "Miscellaneous"
];

function parseOCRText(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const amountRegex = /(\d{1,3}(,\d{3})*(\.\d{2})?)/g;
    let maxAmount = 0;
    lines.forEach(line => {
        if (line.includes('%')) return;
        const matches = line.match(amountRegex);
        if (matches) {
            matches.forEach(m => {
                const val = parseFloat(m.replace(/,/g, ''));
                if (!isNaN(val) && val > maxAmount) maxAmount = val;
            });
        }
    });
    const dateRegex = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(\d{1,2} [A-Za-z]{3,9} \d{2,4})/g;
    let detectedDate = "";
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('date')) {
            const matches = lines[i].match(dateRegex);
            if (matches) { detectedDate = matches[0]; break; }
            if (i + 1 < lines.length) {
                const nextMatches = lines[i + 1].match(dateRegex);
                if (nextMatches) { detectedDate = nextMatches[0]; break; }
            }
        }
    }
    if (!detectedDate) {
        for (const line of lines) {
            const matches = line.match(dateRegex);
            if (matches) { detectedDate = matches[0]; break; }
        }
    }
    return {
        amount: maxAmount || undefined,
        date: detectedDate || undefined,
        vendorName: lines.length > 0 ? lines[0].substring(0, 50) : undefined,
        gstCharged: text.toLowerCase().includes("gst") || text.toLowerCase().includes("tax")
    };
}

export function TaxZone({
    invoices,
    clients,
    expenses,
    tdsEntries,
    userId,
    activeBusinessId,
    initiallyOpenModal,
    onModalClose
}: {
    invoices: Invoice[];
    clients: Client[];
    expenses: Expense[];
    tdsEntries: TDSEntry[];
    userId: string;
    activeBusinessId: string;
    initiallyOpenModal?: string;
    onModalClose?: () => void;
}) {
    const [activeTab, setActiveTab] = useState<"gst" | "income" | "expenses" | "tds" | "export">("gst");
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [gstFY, setGstFY] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        return now.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    });
    const [selectedFY, setSelectedFY] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        return now.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    });
    const [incomeMonth, setIncomeMonth] = useState(new Date().toISOString().slice(0, 7));

    // Export States
    const [exportScope, setExportScope] = useState<"fy" | "period" | "custom">("fy");
    const [exportFY, setExportFY] = useState(selectedFY);
    const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
    const [exportQuarter, setExportQuarter] = useState("Q1");
    const [exportCustomStart, setExportCustomStart] = useState("");
    const [exportCustomEnd, setExportCustomEnd] = useState("");
    const [isCustomExpanded, setIsCustomExpanded] = useState(false);

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [showTDSModal, setShowTDSModal] = useState(false);
    const [expensePage, setExpensePage] = useState(1);
    const [expenseLimit, setExpenseLimit] = useState(15);
    const [expenseDateFilter, setExpenseDateFilter] = useState(expenses.length > 50 ? "90days" : "all");

    // External Trigger Handling
    useEffect(() => {
        if (initiallyOpenModal === "capture-expense") {
            setShowExpenseModal(true);
            setActiveTab("expenses");
            onModalClose?.();
        }
    }, [initiallyOpenModal, onModalClose]);

    // GST Calculations (Monthly)
    const gstMetrics = useMemo(() => {
        const monthFiltered = invoices.filter(inv =>
            (inv.invoiceDate || "").startsWith(selectedMonth) && inv.status === "Paid"
        );

        const totals = monthFiltered.reduce((acc, inv) => {
            acc.billed += inv.total || 0;
            acc.cgst += inv.cgst || 0;
            acc.sgst += inv.sgst || 0;
            acc.igst += inv.igst || 0;
            return acc;
        }, { billed: 0, cgst: 0, sgst: 0, igst: 0 });

        return { ...totals, count: monthFiltered.length };
    }, [invoices, selectedMonth]);

    const gstFYMetrics = useMemo(() => {
        const [startYearStr, endYearStr] = gstFY.split("-");
        const startYear = parseInt(startYearStr);
        const endYear = parseInt(endYearStr);

        const fyFiltered = invoices.filter(inv => {
            const d = new Date(inv.invoiceDate || "");
            const m = d.getMonth();
            const y = d.getFullYear();

            const isAfterAprilStart = (y === startYear && m >= 3) || y > startYear;
            const isBeforeMarchEnd = (y === endYear && m <= 2) || y < endYear;

            return isAfterAprilStart && isBeforeMarchEnd && inv.status === "Paid";
        });

        const billed = fyFiltered.reduce((acc, inv) => acc + (inv.total || 0), 0);
        const gst = fyFiltered.reduce((acc, inv) => acc + (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0), 0);

        return { billed, gst };
    }, [invoices, gstFY]);

    // Annual Income Calculations
    const annualMetrics = useMemo(() => {
        const [startYearStr, endYearStr] = selectedFY.split("-");
        const startYear = parseInt(startYearStr);
        const endYear = parseInt(endYearStr);

        const fyFiltered = invoices.filter(inv => {
            const d = new Date(inv.invoiceDate || "");
            const m = d.getMonth();
            const y = d.getFullYear();

            const isAfterAprilStart = (y === startYear && m >= 3) || y > startYear;
            const isBeforeMarchEnd = (y === endYear && m <= 2) || y < endYear;

            return isAfterAprilStart && isBeforeMarchEnd && inv.status === "Paid";
        });

        const income = fyFiltered.reduce((acc, inv) => acc + (inv.total || 0), 0);
        const gst = fyFiltered.reduce((acc, inv) => acc + (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0), 0);

        return { gross: income, net: income - gst, gst };
    }, [invoices, selectedFY]);

    const monthlyIncomeMetrics = useMemo(() => {
        const monthFiltered = invoices.filter(inv =>
            (inv.invoiceDate || "").startsWith(incomeMonth) && inv.status === "Paid"
        );

        const gross = monthFiltered.reduce((acc, inv) => acc + (inv.total || 0), 0);
        const gst = monthFiltered.reduce((acc, inv) => acc + (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0), 0);

        return { gross, net: gross - gst, gst, count: monthFiltered.length };
    }, [invoices, incomeMonth]);

    // Expense Calculations
    const categoryTotals = useMemo(() => {
        return EXPENSE_CATEGORIES.reduce((acc, cat) => {
            acc[cat] = expenses
                .filter(e => e.category === cat && (e as any).status === "confirmed")
                .reduce((sum, e) => sum + (e.amount || 0), 0);
            return acc;
        }, {} as Record<string, number>);
    }, [expenses]);

    const totalTDS = useMemo(() => {
        // We auto-create tdsEntries when recording payments now, 
        // so tdsEntries should be the primary source.
        return tdsEntries
            .filter(t => t.fy === selectedFY)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
    }, [tdsEntries, selectedFY]);

    const [isExporting, setIsExporting] = useState(false);

    const filteredExpenses = useMemo(() => {
        let list = [...expenses].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

        if (expenseDateFilter === "90days") {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            list = list.filter(e => new Date(e.date || "") >= ninetyDaysAgo);
        } else if (expenseDateFilter === "thisMonth") {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            list = list.filter(e => new Date(e.date || "") >= firstDay);
        }

        return list;
    }, [expenses, expenseDateFilter]);

    const itemsPerPage = 25;
    const totalExpensePages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const pagedExpenses = filteredExpenses.slice((expensePage - 1) * itemsPerPage, expensePage * itemsPerPage);
    const mobilePagedExpenses = filteredExpenses.slice(0, expenseLimit);

    // Reset pagination when filter changes
    useEffect(() => {
        setExpensePage(1);
        setExpenseLimit(15);
    }, [expenseDateFilter]);

    const handleDownloadAuditPack = async () => {
        setIsExporting(true);
        try {
            let startDate: Date;
            let endDate: Date;
            let label: string;

            if (exportScope === "fy") {
                const [startYearStr, endYearStr] = exportFY.split("-");
                const startYear = parseInt(startYearStr);
                const endYear = parseInt(endYearStr);
                startDate = new Date(startYear, 3, 1); // April 1st
                endDate = new Date(endYear, 2, 31, 23, 59, 59); // March 31st
                label = `FY-${exportFY}`;
            } else if (exportScope === "period") {
                const [year, month] = exportMonth.split("-").map(Number);
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0, 23, 59, 59);
                label = startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '-');
            } else {
                startDate = new Date(exportCustomStart);
                endDate = new Date(exportCustomEnd);
                endDate.setHours(23, 59, 59);
                label = `${exportCustomStart}_to_${exportCustomEnd}`;
            }

            const filterByRange = (dateStr: string) => {
                const d = new Date(dateStr);
                return d >= startDate && d <= endDate;
            };

            const filteredInvoices = invoices.filter(inv =>
                filterByRange(inv.invoiceDate || "") && inv.status === "Paid"
            );

            const filteredExpenses = expenses.filter(exp =>
                filterByRange(exp.date || "") && (exp as any).status === "confirmed"
            );

            await generateAuditPack({
                fy: exportFY,
                expenses: filteredExpenses,
                invoices: filteredInvoices,
                label
            });
        } catch (error) {
            console.error("Audit Pack Generation failed:", error);
            alert("Failed to generate audit pack. Please check your dates.");
        } finally {
            setIsExporting(false);
        }
    };

    const deleteExpense = async (exp: Expense) => {
        if (confirm("Are you sure you want to delete this expense?")) {
            try {
                if ((exp as any).attachment?.publicId) {
                    await deleteFromCloudinary((exp as any).attachment.publicId);
                }
                db.transact(db.tx.expenses[exp.id].delete());
            } catch (error) {
                console.error("Failed to delete expense or attachment:", error);
                alert("Failed to delete complete expense records. Check console for details.");
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Tax Zone</h2>
                    <p className="text-sm text-gray-500 font-medium">Ready reports for your CA.</p>
                </div>

                <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    <div className="inline-flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 min-w-max">
                        {[
                            { id: "gst", label: "GST Summary" },
                            { id: "income", label: "Income" },
                            { id: "expenses", label: "Expenses" },
                            { id: "tds", label: "TDS" },
                            { id: "export", label: "Export" }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-gray-900 text-white shadow-md"
                                    : "text-gray-500 hover:text-gray-900"}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Calm disclaimer */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-4 shadow-sm">
                <span className="text-xl">🛡️</span>
                <p className="text-xs text-blue-800 leading-relaxed font-medium">
                    This section helps organise your financial data for your CA. <span className="font-black uppercase tracking-tight opacity-70">Final filing should be done by a professional.</span>
                </p>
            </div>

            <main className="min-h-[50vh]">
                {activeTab === "gst" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">Financial Year</label>
                                <select
                                    className="text-2xl font-black text-gray-900 bg-transparent focus:outline-none cursor-pointer appearance-none"
                                    value={gstFY}
                                    onChange={(e) => setGstFY(e.target.value)}
                                >
                                    <option value="2023-2024">FY 2023-24</option>
                                    <option value="2024-2025">FY 2024-25</option>
                                    <option value="2025-2026">FY 2025-26</option>
                                </select>
                                <div className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                    FY Total: ₹{gstFYMetrics.billed.toLocaleString()}
                                </div>
                            </div>
                            <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">Select Month</label>
                                <input
                                    type="month"
                                    className="text-2xl font-black text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-blue-600 hover:shadow-md transition-shadow">
                                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Total Invoiced (Paid)</h2>
                                <p className="text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 truncate tracking-tighter">₹{gstMetrics.billed.toLocaleString("en-IN")}</p>
                                <p className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded uppercase">{gstMetrics.count} manifests recognized</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-red-500 hover:shadow-md transition-shadow">
                                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">GST Collected</h2>
                                <p className="text-3xl lg:text-4xl xl:text-5xl font-black text-red-600 truncate tracking-tighter">₹{(gstMetrics.cgst + gstMetrics.sgst + gstMetrics.igst).toLocaleString("en-IN")}</p>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <div className="bg-gray-50 px-2 py-1 rounded text-[9px] font-black text-gray-500 uppercase">CGST: ₹{gstMetrics.cgst.toLocaleString()}</div>
                                    <div className="bg-gray-50 px-2 py-1 rounded text-[9px] font-black text-gray-500 uppercase">SGST: ₹{gstMetrics.sgst.toLocaleString()}</div>
                                    <div className="bg-gray-50 px-2 py-1 rounded text-[9px] font-black text-gray-500 uppercase">IGST: ₹{gstMetrics.igst.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-center">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Internal Advisory</h4>
                                <p className="text-sm font-medium text-gray-600 leading-relaxed italic">
                                    "This portion represents tax collected on behalf of the government. Keep this aside for filing."
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "income" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">Financial Year</label>
                                <select
                                    className="text-2xl font-black text-gray-900 bg-transparent focus:outline-none cursor-pointer appearance-none"
                                    value={selectedFY}
                                    onChange={(e) => setSelectedFY(e.target.value)}
                                >
                                    <option value="2023-2024">FY 2023-24</option>
                                    <option value="2024-2025">FY 2024-25</option>
                                    <option value="2025-2026">FY 2025-26</option>
                                </select>
                            </div>
                            <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">Month Wise</label>
                                <input
                                    type="month"
                                    className="text-2xl font-black text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                                    value={incomeMonth}
                                    onChange={(e) => setIncomeMonth(e.target.value)}
                                />
                                <div className="mt-2 text-[10px] font-black text-green-600 uppercase tracking-widest">
                                    Month Total: ₹{monthlyIncomeMetrics.gross.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Gross Professional Income</h4>
                                    <p className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter">₹{annualMetrics.gross.toLocaleString("en-IN")}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">GST Portion</h4>
                                        <p className="text-2xl xl:text-3xl font-black text-gray-500 truncate">₹{annualMetrics.gst.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Net Earnings</h4>
                                        <p className="text-2xl xl:text-3xl font-black text-green-600 truncate">₹{annualMetrics.net.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-900 p-8 rounded-3xl shadow-xl flex flex-col justify-center space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">CA Quick Summary</h4>
                                <p className="text-xl font-medium text-white leading-relaxed">
                                    Total professional receipts for FY {selectedFY} are <span className="text-green-400 font-black">₹{annualMetrics.gross.toLocaleString()}</span>, with a collected GST liability of <span className="text-red-400 font-black">₹{annualMetrics.gst.toLocaleString()}</span>.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "expenses" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Outgoings & Overheads</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleDownloadAuditPack}
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                >
                                    <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                                    <span className="text-[11px] font-black uppercase tracking-wider">
                                        {isExporting ? "Generating Pack..." : "Download CA Audit Pack"}
                                    </span>
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedExpense(null);
                                        setShowExpenseModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-bold text-sm shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Expense
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <select
                                className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-gray-900 shadow-sm"
                                value={expenseDateFilter}
                                onChange={(e) => setExpenseDateFilter(e.target.value)}
                            >
                                <option value="all">All Dates</option>
                                <option value="90days">Last 90 Days</option>
                                <option value="thisMonth">This Month</option>
                            </select>
                            <div className="flex-1"></div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                Showing {filteredExpenses.length} total
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {EXPENSE_CATEGORIES.map(cat => (
                                <div key={cat} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-gray-900 transition-all">
                                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.1em] mb-1 truncate">{cat}</h4>
                                    <p className="text-xl font-black text-gray-900">₹{(categoryTotals[cat] || 0).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pagedExpenses.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-xs font-bold text-gray-500 uppercase">No expenses recorded</td></tr>
                                    ) : (
                                        pagedExpenses.map(exp => (
                                            <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{new Date(exp.date || "").toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none mb-1 flex items-center gap-2">
                                                            {exp.category}
                                                            {(exp as any).status === "draft" && (
                                                                <span className="bg-orange-100 text-orange-700 text-[8px] px-2 py-0.5 rounded-full font-black tracking-tighter shadow-sm animate-pulse border border-orange-200">DRAFT</span>
                                                            )}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-500 font-mono">
                                                            {(exp as any).displayId || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-medium">{exp.description || "—"}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-black text-gray-900">₹{(exp.amount || 0).toLocaleString()}</span>
                                                            {(exp as any).attachment && (
                                                                <a
                                                                    href={(exp as any).attachment.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[9px] font-black uppercase text-blue-600 hover:underline mt-1"
                                                                >
                                                                    View Bill
                                                                </a>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedExpense(exp);
                                                                setShowExpenseModal(true);
                                                            }}
                                                            className="text-gray-300 hover:text-blue-600 transition-colors p-1"
                                                            title="Edit Expense"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteExpense(exp)}
                                                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                            title="Delete Expense"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination for Web */}
                            {filteredExpenses.length > 0 && totalExpensePages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                                    <div className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                                        Showing {pagedExpenses.length} of {filteredExpenses.length} expenses
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setExpensePage(Math.max(1, expensePage - 1))}
                                            disabled={expensePage === 1}
                                            className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                        >
                                            Prev
                                        </button>
                                        <div className="flex items-center px-4 text-[10px] font-black text-gray-900 uppercase">
                                            Page {expensePage} of {totalExpensePages}
                                        </div>
                                        <button
                                            onClick={() => setExpensePage(Math.min(totalExpensePages, expensePage + 1))}
                                            disabled={expensePage === totalExpensePages}
                                            className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Mobile Load More */}
                            <div className="md:hidden p-4 bg-gray-50 border-t border-gray-100 space-y-4">
                                {expenseLimit < filteredExpenses.length && (
                                    <button
                                        onClick={() => setExpenseLimit(prev => prev + 15)}
                                        className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-gray-200 active:scale-95 transition-all outline-none"
                                    >
                                        Load More ({filteredExpenses.length - mobilePagedExpenses.length} remaining)
                                    </button>
                                )}
                                {expenseLimit >= filteredExpenses.length && filteredExpenses.length > 0 && (
                                    <div className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-4">
                                        End of list • {filteredExpenses.length} total
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "tds" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">TDS Tracking</h3>
                            <button
                                onClick={() => setShowTDSModal(true)}
                                className="px-6 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                            >
                                Record TDS
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6 items-start">
                            <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center h-fit">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Total Deductions (FY {selectedFY})</h4>
                                <p className="text-5xl font-black text-orange-600 tracking-tighter">₹{totalTDS.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-4">For CA reconciliation</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {tdsEntries.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-3xl">
                                        <p className="font-bold text-gray-500 uppercase text-xs">No records found</p>
                                    </div>
                                ) : (
                                    tdsEntries.filter(t => t.fy === selectedFY).map(tds => {
                                        const client = (tds as any).client || clients.find(c => c.id === (tds as any).client?.id);
                                        return (
                                            <div key={tds.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center shadow-sm hover:border-gray-900 transition-all">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-tight mb-1">
                                                        {client?.displayName || client?.firstName || "Unknown Client"}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-lg font-black text-gray-900">₹{(tds.amount || 0).toLocaleString()}</p>
                                                        {tds.hasCertificate && (
                                                            <span className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Verified ✔</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "export" && (
                    <div className="max-w-2xl mx-auto py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 rounded-full bg-gray-900 mx-auto flex items-center justify-center shadow-2xl mb-6">
                                <Download className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Download CA Pack</h3>
                            <p className="text-gray-500 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                                Select the period for your export. We'll organize all invoices, bills, and summaries for your accountant.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => setExportScope("fy")}
                                className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center justify-between group ${exportScope === "fy" ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-200"}`}
                            >
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Financial Year</h4>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={exportFY}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setExportFY(e.target.value);
                                                setExportScope("fy");
                                            }}
                                            className="bg-transparent text-xl font-black text-gray-900 focus:outline-none cursor-pointer"
                                        >
                                            <option value="2024-2025">FY 2024-25</option>
                                            <option value="2023-2024">FY 2023-24</option>
                                        </select>
                                        {exportFY === "2024-2025" && (
                                            <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Current</span>
                                        )}
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${exportScope === "fy" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200"}`}>
                                    {exportScope === "fy" && <div className="w-2 h-2 rounded-full bg-white transition-all scale-110" />}
                                </div>
                            </button>

                            <button
                                onClick={() => setExportScope("period")}
                                className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center justify-between group ${exportScope === "period" ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-200"}`}
                            >
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">GST Period (Month)</h4>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="month"
                                            value={exportMonth}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setExportMonth(e.target.value);
                                                setExportScope("period");
                                            }}
                                            className="bg-transparent text-lg font-black text-gray-900 focus:outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${exportScope === "period" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200"}`}>
                                    {exportScope === "period" && <div className="w-2 h-2 rounded-full bg-white transition-all scale-110" />}
                                </div>
                            </button>

                            <div className={`rounded-3xl border-2 transition-all overflow-hidden ${exportScope === "custom" ? "border-gray-900 shadow-sm" : "border-gray-100"}`}>
                                <button
                                    onClick={() => {
                                        setExportScope("custom");
                                        setIsCustomExpanded(!isCustomExpanded);
                                    }}
                                    className="w-full p-6 flex items-center justify-between group text-left"
                                >
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Custom Range</h4>
                                        <p className="text-lg font-black text-gray-900">
                                            {exportCustomStart && exportCustomEnd ? `${exportCustomStart} to ${exportCustomEnd}` : "Select specific dates"}
                                        </p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${exportScope === "custom" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200"}`}>
                                        {exportScope === "custom" && <div className="w-2 h-2 rounded-full bg-white transition-all scale-110" />}
                                    </div>
                                </button>

                                {(isCustomExpanded || exportScope === 'custom') && (
                                    <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">From</label>
                                            <input
                                                type="date"
                                                value={exportCustomStart}
                                                onChange={(e) => setExportCustomStart(e.target.value)}
                                                className="w-full bg-white border-b-2 border-gray-100 p-2 text-sm font-bold focus:border-gray-900 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">To</label>
                                            <input
                                                type="date"
                                                value={exportCustomEnd}
                                                onChange={(e) => setExportCustomEnd(e.target.value)}
                                                className="w-full bg-white border-b-2 border-gray-100 p-2 text-sm font-bold focus:border-gray-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-8">
                            <button
                                onClick={handleDownloadAuditPack}
                                disabled={isExporting || (exportScope === 'custom' && (!exportCustomStart || !exportCustomEnd))}
                                className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-4 text-sm"
                            >
                                {isExporting ? (
                                    <>
                                        <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                        Generating Pack...
                                    </>
                                ) : (
                                    <>
                                        Download CA Pack
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                            <p className="text-center text-[10px] font-black text-gray-500 uppercase tracking-widest mt-6"> organizing summaries & attached bills automatically </p>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            {showExpenseModal && (
                <ExpenseModal
                    onClose={() => {
                        setShowExpenseModal(false);
                        setSelectedExpense(null);
                    }}
                    userId={userId}
                    expenses={expenses}
                    initialExpense={selectedExpense}
                    activeBusinessId={activeBusinessId}
                />
            )}

            {showTDSModal && (
                <TDSModal
                    onClose={() => setShowTDSModal(false)}
                    userId={userId}
                    clients={clients}
                    currentFY={selectedFY}
                    activeBusinessId={activeBusinessId}
                />
            )}
        </div>
    );
}

function ExpenseModal({ onClose, userId, expenses, initialExpense, activeBusinessId }: { onClose: () => void, userId: string, expenses: Expense[], initialExpense?: Expense | null, activeBusinessId: string }) {
    const [formData, setFormData] = useState({
        amount: initialExpense?.amount?.toString() || "",
        date: initialExpense?.date || new Date().toISOString().slice(0, 10),
        category: initialExpense?.category || EXPENSE_CATEGORIES[0],
        description: initialExpense?.description || "",
        vendorName: initialExpense?.vendorName || "",
        gstCharged: initialExpense?.gstCharged || false,
        gstAmount: initialExpense?.gstAmount?.toString() || "",
        vendorGSTIN: initialExpense?.vendorGSTIN || "",
        itcReview: initialExpense?.itcReview || "unsure",
    });
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [ocrProcessing, setOcrProcessing] = useState(false);
    const [localOcrStatus, setLocalOcrStatus] = useState<'idle' | 'processing' | 'done' | 'failed'>('idle');
    const [tempAttachment, setTempAttachment] = useState<{ id: string, publicId: string, url: string } | null>(null);
    const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
    const [currentExpenseId] = useState(initialExpense?.id || id());
    const [isDraftCreated, setIsDraftCreated] = useState(!!initialExpense);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setOcrProcessing(true);
        setLocalOcrStatus('processing');

        try {
            const folder = `expenses/${new Date().getFullYear()}/${formData.category.toLowerCase().replace(/\s+/g, "_")}`;
            const uploadResult = await uploadToCloudinary(selectedFile, folder, { ocr: true });

            const attachmentId = id();
            setTempAttachment({
                id: attachmentId,
                publicId: uploadResult.public_id,
                url: uploadResult.secure_url
            });

            const ocrInfo = (uploadResult as any).info?.ocr?.adv_ocr?.data;
            let suggestions: any = null;
            if (ocrInfo && ocrInfo.length > 0) {
                const fullText = ocrInfo[0].textAnnotations ? ocrInfo.map((block: any) => block.textAnnotations[0]?.description).join('\n') : JSON.stringify(ocrInfo);
                suggestions = parseOCRText(fullText);
            }

            const trans = [
                db.tx.attachments[attachmentId].update({
                    publicId: uploadResult.public_id,
                    url: uploadResult.secure_url,
                    type: "expense_bill",
                    createdAt: new Date().toISOString(),
                }),
                db.tx.expenses[currentExpenseId].update({
                    amount: suggestions?.amount || (formData.amount ? parseFloat(formData.amount) : 0),
                    date: suggestions?.date || formData.date,
                    category: formData.category,
                    vendorName: suggestions?.vendorName || formData.vendorName,
                    status: initialExpense ? (initialExpense as any).status || "confirmed" : "draft",
                    ocrStatus: suggestions ? "done" : "failed",
                    ocrSuggestions: suggestions || undefined
                }),
                db.tx.expenses[currentExpenseId].link({ attachment: attachmentId })
            ];

            if (!isDraftCreated) {
                trans.push(db.tx.expenses[currentExpenseId].link({ owner: userId }));
                if (activeBusinessId !== "ALL") {
                    trans.push(db.tx.expenses[currentExpenseId].link({ business: activeBusinessId }));
                }
                setIsDraftCreated(true);
            }
            db.transact(trans);

            if (suggestions) {
                const filled = new Set<string>();
                setFormData(prev => {
                    const updates: any = {};
                    if (!prev.amount && suggestions.amount) {
                        updates.amount = suggestions.amount.toString();
                        filled.add('amount');
                    }
                    if (!prev.vendorName && suggestions.vendorName) {
                        updates.vendorName = suggestions.vendorName;
                        filled.add('vendorName');
                    }
                    if (prev.date === new Date().toISOString().slice(0, 10) && suggestions.date) {
                        updates.date = suggestions.date;
                        filled.add('date');
                    }
                    return { ...prev, ...updates };
                });
                setAutoFilledFields(filled);
                setLocalOcrStatus('done');
            } else {
                setLocalOcrStatus('failed');
            }
        } catch (error) {
            console.error("Upload/OCR failed:", error);
            setLocalOcrStatus('failed');
        } finally {
            setOcrProcessing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            const expenseId = currentExpenseId;
            let attachmentId = tempAttachment?.id || null;

            if (tempAttachment) {
                db.transact([
                    db.tx.attachments[tempAttachment.id].update({
                        publicId: tempAttachment.publicId,
                        url: tempAttachment.url,
                        type: "expense_bill",
                        createdAt: new Date().toISOString(),
                    })
                ]);
            } else if (file) {
                const folder = `expenses/${new Date().getFullYear()}/${formData.category.toLowerCase().replace(/\s+/g, "_")}`;
                const uploadResult = await uploadToCloudinary(file, folder);
                attachmentId = id();
                db.transact([
                    db.tx.attachments[attachmentId].update({
                        publicId: uploadResult.public_id,
                        url: uploadResult.secure_url,
                        type: "expense_bill",
                        createdAt: new Date().toISOString(),
                    })
                ]);
            }

            let nextNum = (initialExpense as any)?.displayNumber;
            let displayId = (initialExpense as any)?.displayId;

            if (!initialExpense) {
                const maxNum = expenses.reduce((max, e) => Math.max(max, (e as any).displayNumber || 0), 0);
                nextNum = maxNum + 1;
                displayId = `EXP-${nextNum.toString().padStart(4, '0')}`;
            }

            const trans = [
                db.tx.expenses[expenseId].update({
                    amount: formData.amount ? parseFloat(formData.amount) : 0,
                    date: formData.date,
                    category: formData.category,
                    description: formData.description,
                    vendorName: formData.vendorName,
                    gstCharged: formData.gstCharged,
                    gstAmount: formData.gstAmount ? parseFloat(formData.gstAmount) : undefined,
                    vendorGSTIN: formData.vendorGSTIN,
                    itcReview: formData.itcReview,
                    displayId,
                    displayNumber: nextNum,
                    status: "confirmed",
                    ocrStatus: file ? (localOcrStatus !== 'idle' ? localOcrStatus : "processing") : (initialExpense ? (initialExpense as any).ocrStatus : undefined),
                }),
                db.tx.expenses[expenseId].link({ owner: userId })
            ];

            if (attachmentId) {
                trans.push(db.tx.expenses[expenseId].link({ attachment: attachmentId }));
            }

            if (activeBusinessId !== "ALL") {
                trans.push(db.tx.expenses[expenseId].link({ business: activeBusinessId }));
            }

            db.transact(trans);
            onClose();
        } catch (error) {
            console.error("Failed to save expense:", error);
            alert("Failed to save expense.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 pb-0 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                            {initialExpense ? 'Edit Expense' : 'Add Expense'}
                        </h3>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                            {initialExpense ? 'Modify existing record' : 'Register business outgoing'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 relative">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                Amount (₹) {autoFilledFields.has('amount') && <span className="text-orange-500 animate-bounce">✨</span>}
                            </label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full text-3xl font-black text-gray-900 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-1 focus:outline-none transition-all placeholder:text-gray-200"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                autoFocus
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Category</label>
                            <select
                                className="w-full h-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-1 focus:outline-none cursor-pointer"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                Vendor Name {autoFilledFields.has('vendorName') && <span className="text-orange-500 animate-bounce">✨</span>}
                            </label>
                            <input
                                type="text"
                                className="w-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-1 focus:outline-none"
                                value={formData.vendorName}
                                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                                placeholder="e.g. Amazon, Local Studio"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                Date {autoFilledFields.has('date') && <span className="text-orange-500 animate-bounce">✨</span>}
                            </label>
                            <input
                                type="date"
                                className="w-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-1 focus:outline-none"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">GST Details</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                    checked={formData.gstCharged}
                                    onChange={(e) => setFormData({ ...formData, gstCharged: e.target.checked })}
                                />
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Charged?</span>
                            </label>
                        </div>

                        {formData.gstCharged && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">GST Amount</label>
                                    <input
                                        type="number"
                                        className="w-full text-sm font-bold border-b border-gray-200 bg-transparent focus:border-gray-900 py-1 focus:outline-none"
                                        value={formData.gstAmount}
                                        onChange={(e) => setFormData({ ...formData, gstAmount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">Vendor GSTIN</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm font-bold border-b border-gray-200 bg-transparent focus:border-gray-900 py-1 focus:outline-none"
                                        value={formData.vendorGSTIN}
                                        onChange={(e) => setFormData({ ...formData, vendorGSTIN: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">ITC Eligibility</label>
                                    <div className="flex gap-2">
                                        {["yes", "no", "unsure"].map(val => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, itcReview: val })}
                                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.itcReview === val ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bill Attachment (Public Proof)</label>
                        {(initialExpense as any)?.attachment && !file && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📄</span>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-900 uppercase">Current Attachment</p>
                                        <a href={(initialExpense as any).attachment.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-600 hover:underline">View existing file</a>
                                    </div>
                                </div>
                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest bg-white px-2 py-1 rounded-full border border-blue-100">Saved</span>
                            </div>
                        )}
                        <div className="relative group">
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} accept="image/*,application/pdf" />
                            <div className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${file ? 'border-green-500 bg-green-50' : 'border-gray-200 group-hover:border-gray-900'}`}>
                                <span className="text-xl">{file ? '📄' : '📤'}</span>
                                <p className="text-[10px] font-black uppercase text-gray-500">{file ? file.name : (initialExpense as any)?.attachment ? "Tap to replace bill" : "Tap to upload bill (JPG, PNG, PDF)"}</p>
                            </div>
                        </div>

                        {(localOcrStatus === 'processing' || (initialExpense as any)?.ocrStatus === "processing") && (
                            <div className="mt-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm">✨</div>
                                <div>
                                    <p className="text-[10px] font-black text-orange-900 uppercase tracking-tight">AI OCR Reading Bill...</p>
                                    <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">Detecting amounts & dates</p>
                                </div>
                            </div>
                        )}

                        {(localOcrStatus === 'done' || (initialExpense as any)?.ocrStatus === "done") && (
                            <div className="mt-3 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✔</div>
                                <div>
                                    <p className="text-[10px] font-black text-green-900 uppercase tracking-tight">✨ We found details from the bill</p>
                                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-0.5">Please review and confirm below</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Notes</label>
                        <input
                            type="text"
                            placeholder="Optional notes..."
                            className="w-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-1 focus:outline-none"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-xs font-black uppercase text-gray-600 hover:bg-gray-100 rounded-xl transition-all" disabled={isUploading}>Cancel</button>
                        <button type="submit" className="px-10 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50" disabled={isUploading || ocrProcessing}>{isUploading ? "Saving..." : "Confirm & Save"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function TDSModal({ onClose, userId, clients, currentFY, activeBusinessId }: { onClose: () => void, userId: string, clients: Client[], currentFY: string, activeBusinessId: string }) {
    const [formData, setFormData] = useState({
        amount: "",
        clientId: "",
        fy: currentFY,
        hasCertificate: false,
        notes: ""
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || !formData.clientId) return;

        const tdsId = id();
        const txs = [
            db.tx.tdsEntries[tdsId].update({
                amount: parseFloat(formData.amount),
                fy: formData.fy,
                hasCertificate: formData.hasCertificate,
                notes: formData.notes,
            }),
            db.tx.tdsEntries[tdsId].link({ owner: userId, client: formData.clientId })
        ];
        if (activeBusinessId !== "ALL") {
            txs.push(db.tx.tdsEntries[tdsId].link({ business: activeBusinessId }));
        }
        db.transact(txs);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-10 pb-0 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Record TDS</h3>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Deduction from payment</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount (₹)</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full text-3xl font-black text-gray-900 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-2 focus:outline-none transition-all"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client</label>
                            <select
                                className="w-full h-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-2 focus:outline-none cursor-pointer"
                                value={formData.clientId}
                                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                            >
                                <option value="">Select...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.displayName || c.firstName}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-8">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Financial Year</label>
                            <input
                                type="text"
                                className="w-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-2 focus:outline-none"
                                value={formData.fy}
                                onChange={(e) => setFormData({ ...formData, fy: e.target.value })}
                            />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer mt-6 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 transition-all border-2"
                                checked={formData.hasCertificate}
                                onChange={(e) => setFormData({ ...formData, hasCertificate: e.target.checked })}
                            />
                            <span className="text-[10px] font-black uppercase text-gray-600 tracking-tight">Verified</span>
                        </label>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Narrative</label>
                        <input
                            type="text"
                            placeholder="Notes for CA summary..."
                            className="w-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-2 focus:outline-none"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-xs font-black uppercase text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                        <button type="submit" className="px-10 py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95">Save Record</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
