
import { useState, useMemo } from "react";
import { Plus, Download } from "lucide-react";
import { Invoice, Client } from "@/app/page";
import { db } from "@/lib/db";
import { id, InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

import { generateAuditPack } from "@/lib/auditPack";

type Expense = InstaQLEntity<AppSchema, "expenses">;
type TDSEntry = InstaQLEntity<AppSchema, "tdsEntries">;

const EXPENSE_CATEGORIES = [
    "Travel",
    "Assistants",
    "Studio / Rent",
    "Equipment / Rentals",
    "Miscellaneous"
];

export function TaxZone({
    invoices,
    clients,
    expenses,
    tdsEntries,
    userId
}: {
    invoices: Invoice[];
    clients: Client[];
    expenses: Expense[];
    tdsEntries: TDSEntry[];
    userId: string;
}) {
    const [activeTab, setActiveTab] = useState<"gst" | "income" | "expenses" | "tds" | "export">("gst");
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedFY, setSelectedFY] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        return now.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    });

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showTDSModal, setShowTDSModal] = useState(false);

    // GST Calculations (Monthly)
    const gstMetrics = useMemo(() => {
        const monthFiltered = invoices.filter(inv =>
            inv.invoiceDate.startsWith(selectedMonth) && inv.status === "Paid"
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

    // Annual Income Calculations
    const annualMetrics = useMemo(() => {
        const [startYearStr, endYearStr] = selectedFY.split("-");
        const startYear = parseInt(startYearStr);
        const endYear = parseInt(endYearStr);

        const fyFiltered = invoices.filter(inv => {
            const d = new Date(inv.invoiceDate);
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

    // Expense Calculations
    const categoryTotals = useMemo(() => {
        return EXPENSE_CATEGORIES.reduce((acc, cat) => {
            acc[cat] = expenses
                .filter(e => e.category === cat)
                .reduce((sum, e) => sum + e.amount, 0);
            return acc;
        }, {} as Record<string, number>);
    }, [expenses]);

    const totalTDS = useMemo(() => {
        return tdsEntries
            .filter(t => t.fy === selectedFY)
            .reduce((sum, t) => sum + t.amount, 0);
    }, [tdsEntries, selectedFY]);

    const [isExporting, setIsExporting] = useState(false);

    const handleDownloadAuditPack = async () => {
        setIsExporting(true);
        try {
            const [startYearStr, endYearStr] = selectedFY.split("-");
            const startYear = parseInt(startYearStr);
            const endYear = parseInt(endYearStr);

            const fyFilteredInvoices = invoices.filter(inv => {
                const d = new Date(inv.invoiceDate);
                const m = d.getMonth();
                const y = d.getFullYear();
                const isAfterAprilStart = (y === startYear && m >= 3) || y > startYear;
                const isBeforeMarchEnd = (y === endYear && m <= 2) || y < endYear;
                return isAfterAprilStart && isBeforeMarchEnd && inv.status === "Paid";
            });

            const fyFilteredExpenses = expenses.filter(exp => {
                const d = new Date(exp.date);
                const m = d.getMonth();
                const y = d.getFullYear();
                const isAfterAprilStart = (y === startYear && m >= 3) || y > startYear;
                const isBeforeMarchEnd = (y === endYear && m <= 2) || y < endYear;
                return isAfterAprilStart && isBeforeMarchEnd;
            });

            await generateAuditPack({
                fy: selectedFY,
                expenses: fyFilteredExpenses,
                invoices: fyFilteredInvoices
            });
        } catch (error) {
            console.error("Audit Pack Generation failed:", error);
            alert("Failed to generate audit pack. Please try again.");
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

                <div className="inline-flex bg-white p-1 rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
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
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Select Month</label>
                            <input
                                type="month"
                                className="text-2xl font-black text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-blue-600 hover:shadow-md transition-shadow">
                                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Invoiced (Paid)</h2>
                                <p className="text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 truncate tracking-tighter">₹{gstMetrics.billed.toLocaleString("en-IN")}</p>
                                <p className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded uppercase">{gstMetrics.count} manifests recognized</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-red-500 hover:shadow-md transition-shadow">
                                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">GST Collected</h2>
                                <p className="text-3xl lg:text-4xl xl:text-5xl font-black text-red-600 truncate tracking-tighter">₹{(gstMetrics.cgst + gstMetrics.sgst + gstMetrics.igst).toLocaleString("en-IN")}</p>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <div className="bg-gray-50 px-2 py-1 rounded text-[9px] font-black text-gray-500 uppercase">CGST: ₹{gstMetrics.cgst.toLocaleString()}</div>
                                    <div className="bg-gray-50 px-2 py-1 rounded text-[9px] font-black text-gray-500 uppercase">SGST: ₹{gstMetrics.sgst.toLocaleString()}</div>
                                    <div className="bg-gray-50 px-2 py-1 rounded text-[9px] font-black text-gray-500 uppercase">IGST: ₹{gstMetrics.igst.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-center">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Internal Advisory</h4>
                                <p className="text-sm font-medium text-gray-600 leading-relaxed italic">
                                    "This portion represents tax collected on behalf of the government. Keep this aside for filing."
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "income" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Financial Year</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Gross Professional Income</h4>
                                    <p className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter">₹{annualMetrics.gross.toLocaleString("en-IN")}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">GST Portion</h4>
                                        <p className="text-2xl xl:text-3xl font-black text-gray-400 truncate">₹{annualMetrics.gst.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Net Earnings</h4>
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
                        <div className="flex justify-between items-center">
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
                                    onClick={() => setShowExpenseModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-bold text-sm shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Expense
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {EXPENSE_CATEGORIES.map(cat => (
                                <div key={cat} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-gray-900 transition-all">
                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1 truncate">{cat}</h4>
                                    <p className="text-xl font-black text-gray-900">₹{(categoryTotals[cat] || 0).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {expenses.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-xs font-bold text-gray-400 uppercase">No expenses recorded</td></tr>
                                    ) : (
                                        expenses.sort((a, b) => b.date.localeCompare(a.date)).map(exp => (
                                            <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{new Date(exp.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none mb-1">
                                                            {exp.category}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 font-mono">
                                                            {(exp as any).displayId || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-medium">{exp.description || "—"}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-black text-gray-900">₹{exp.amount.toLocaleString()}</span>
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
                        </div>
                    </div>
                )}

                {activeTab === "tds" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">TDS Tracking</h3>
                            <button
                                onClick={() => setShowTDSModal(true)}
                                className="px-6 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                            >
                                Record TDS
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Deductions (FY {selectedFY})</h4>
                                <p className="text-5xl font-black text-orange-600 tracking-tighter">₹{totalTDS.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">For CA reconciliation</p>
                            </div>

                            <div className="space-y-3">
                                {tdsEntries.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-3xl">
                                        <p className="font-bold text-gray-400 uppercase text-xs">No records found</p>
                                    </div>
                                ) : (
                                    tdsEntries.filter(t => t.fy === selectedFY).map(tds => {
                                        const client = clients.find(c => c.id === (tds as any).client?.id);
                                        return (
                                            <div key={tds.id} className="p-5 bg-white border border-gray-100 rounded-2xl flex justify-between items-center shadow-sm hover:border-gray-900 transition-all">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight mb-1">
                                                        {client?.displayName || client?.firstName || "Unknown Client"}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xl font-black text-gray-900">₹{tds.amount.toLocaleString()}</p>
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
                    <div className="h-[50vh] flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center shadow-2xl">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight">The Magic Button</h3>
                            <p className="text-gray-500 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                                Download all reports organized for your accountant in one consolidated sheet.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadAuditPack}
                            disabled={isExporting}
                            className="px-12 py-5 bg-gray-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                        >
                            {isExporting ? "Generating CA Pack..." : "Download CA Audit Pack"}
                        </button>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic animate-pulse">
                            {isExporting ? "Renaming files & creating ZIP..." : "Excel / Tally / Accounting Ready"}
                        </p>
                    </div>
                )}
            </main>

            {/* Expense Modal */}
            {showExpenseModal && (
                <ExpenseModal
                    onClose={() => setShowExpenseModal(false)}
                    userId={userId}
                    expenses={expenses}
                />
            )}

            {/* TDS Modal */}
            {showTDSModal && (
                <TDSModal
                    onClose={() => setShowTDSModal(false)}
                    userId={userId}
                    clients={clients}
                    currentFY={selectedFY}
                />
            )}
        </div>
    );
}

function ExpenseModal({ onClose, userId, expenses }: { onClose: () => void, userId: string, expenses: Expense[] }) {
    const [formData, setFormData] = useState({
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        category: EXPENSE_CATEGORIES[0],
        description: "",
        vendorName: "",
        gstCharged: false,
        gstAmount: "",
        vendorGSTIN: "",
        itcReview: "unsure",
    });
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount) return;

        setIsUploading(true);
        try {
            const expenseId = id();
            let attachmentId = null;

            // Calculate next display number
            const maxNum = expenses.reduce((max, e) => Math.max(max, (e as any).displayNumber || 0), 0);
            const nextNum = maxNum + 1;
            const displayId = `EXP-${nextNum.toString().padStart(4, '0')}`;

            if (file) {
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

            const trans = [
                db.tx.expenses[expenseId].update({
                    amount: parseFloat(formData.amount),
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
                }),
                db.tx.expenses[expenseId].link({ owner: userId })
            ];

            if (attachmentId) {
                trans.push(db.tx.expenses[expenseId].link({ attachment: attachmentId }));
            }

            db.transact(trans);
            onClose();
        } catch (error) {
            console.error("Failed to save expense:", error);
            alert("Failed to save expense. Please check your connection and Cloudinary settings.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 pb-0 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Add Expense</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Register business outgoing</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount (₹)</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full text-3xl font-black text-gray-900 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-1 focus:outline-none transition-all"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                autoFocus
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendor Name</label>
                            <input
                                type="text"
                                className="w-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-1 focus:outline-none"
                                value={formData.vendorName}
                                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                                placeholder="e.g. Amazon, Local Studio"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GST Details</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.gstCharged}
                                    onChange={(e) => setFormData({ ...formData, gstCharged: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-[10px] font-black uppercase text-gray-600">GST Charged</span>
                            </label>
                        </div>

                        {formData.gstCharged && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase">GST Amount</label>
                                    <input
                                        type="number"
                                        className="w-full text-sm font-bold border-b border-gray-200 bg-transparent focus:border-gray-900 py-1 focus:outline-none"
                                        value={formData.gstAmount}
                                        onChange={(e) => setFormData({ ...formData, gstAmount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase">Vendor GSTIN</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm font-bold border-b border-gray-200 bg-transparent focus:border-gray-900 py-1 focus:outline-none"
                                        value={formData.vendorGSTIN}
                                        onChange={(e) => setFormData({ ...formData, vendorGSTIN: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase">ITC Eligibility</label>
                                    <div className="flex gap-2">
                                        {["yes", "no", "unsure"].map(val => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, itcReview: val })}
                                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.itcReview === val ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-400'}`}
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
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bill Attachment (Public Proof)</label>
                        <div className="relative group">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                accept="image/*,application/pdf"
                            />
                            <div className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${file ? 'border-green-500 bg-green-50' : 'border-gray-200 group-hover:border-gray-900'}`}>
                                <span className="text-xl">{file ? '📄' : '📤'}</span>
                                <p className="text-[10px] font-black uppercase text-gray-500">
                                    {file ? file.name : "Tap to upload bill (JPG, PNG, PDF)"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</label>
                        <input
                            type="text"
                            placeholder="Optional notes..."
                            className="w-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-1 focus:outline-none"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-all"
                            disabled={isUploading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-10 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                            disabled={isUploading}
                        >
                            {isUploading ? "Uploading..." : "Confirm Expense"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function TDSModal({ onClose, userId, clients, currentFY }: { onClose: () => void, userId: string, clients: Client[], currentFY: string }) {
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
        db.transact([
            db.tx.tdsEntries[tdsId].update({
                amount: parseFloat(formData.amount),
                fy: formData.fy,
                hasCertificate: formData.hasCertificate,
                notes: formData.notes,
            }),
            db.tx.tdsEntries[tdsId].link({ owner: userId, client: formData.clientId })
        ]);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-10 pb-0 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Record TDS</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Deduction from payment</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount (₹)</label>
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client</label>
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financial Year</label>
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
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-tight">Verified</span>
                        </label>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Narrative</label>
                        <input
                            type="text"
                            placeholder="Notes for CA summary..."
                            className="w-full text-sm font-bold text-gray-700 border-b-2 border-gray-100 bg-transparent focus:border-gray-900 py-2 focus:outline-none"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-all font-sans"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-10 py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95"
                        >
                            Save Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
