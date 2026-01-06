
import React, { useState } from "react";
import { parseFile, preprocessImportData, executeImport, ImportSummary } from "@/lib/invoiceImport";
import {
    generateInvoiceCSV,
    getAvailableFinancialYears,
    getAvailableMonthYears,
    filterInvoicesByFY,
    filterInvoicesByMonth
} from "@/lib/invoiceExport";
import {
    generateClientCSV
} from "@/lib/clientExport";
import {
    parseClientFile,
    preprocessClientData,
    executeClientImport,
    ClientImportSummary
} from "@/lib/clientImport";
import { APP_CONFIG } from "@/config";

interface DataManagementProps {
    userId: string;
    invoices: any[];
    clients: any[];
}

export function DataManagement({ userId, invoices, clients }: DataManagementProps) {
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isClientImportModalOpen, setIsClientImportModalOpen] = useState(false);
    const [isClientExportModalOpen, setIsClientExportModalOpen] = useState(false);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Data Management</h2>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mt-2">Centralized Import, Export & Sync Tools</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Invoices Section */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Invoice Records</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage your billing history</p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-gray-50">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-900 group/btn transition-all"
                        >
                            <span className="text-sm font-black text-gray-900 uppercase tracking-widest group-hover/btn:text-white">Import Invoices</span>
                            <div className="bg-white p-2 rounded-xl text-gray-900 group-hover/btn:bg-gray-800 group-hover/btn:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                        </button>

                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-blue-600 group/btn transition-all"
                        >
                            <span className="text-sm font-black text-gray-900 uppercase tracking-widest group-hover/btn:text-white">Export Invoices</span>
                            <div className="bg-white p-2 rounded-xl text-gray-900 group-hover/btn:bg-blue-700 group-hover/btn:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Clients Section */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Client Database</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Profiles & Contacts</p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-gray-50">
                        <button
                            onClick={() => setIsClientImportModalOpen(true)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-900 group/btn transition-all"
                        >
                            <span className="text-sm font-black text-gray-900 uppercase tracking-widest group-hover/btn:text-white">Import Clients</span>
                            <div className="bg-white p-2 rounded-xl text-gray-900 group-hover/btn:bg-gray-800 group-hover/btn:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                        </button>

                        <button
                            onClick={() => setIsClientExportModalOpen(true)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-blue-600 group/btn transition-all"
                        >
                            <span className="text-sm font-black text-gray-900 uppercase tracking-widest group-hover/btn:text-white">Export Clients</span>
                            <div className="bg-white p-2 rounded-xl text-gray-900 group-hover/btn:bg-blue-700 group-hover/btn:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Advanced Sync section */}
            <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all duration-500"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left max-w-lg">
                        <h4 className="text-2xl font-black uppercase tracking-tight mb-2">Sync Infrastructure</h4>
                        <p className="text-sm text-gray-400 font-medium leading-relaxed">
                            Looking for real-time calendar synchronization? Head to the <span className="text-white font-bold">Calendar</span> tab to configure your Google Calendar and iCal feeds.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                            <p className="text-[24px] font-black">1.0</p>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Version</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                            <p className="text-[24px] font-black text-green-400">UP</p>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Status</p>
                        </div>
                    </div>
                </div>
            </div>

            {isImportModalOpen && (
                <ImportModal
                    onClose={() => setIsImportModalOpen(false)}
                    userId={userId}
                    existingInvoices={invoices}
                    existingClients={clients}
                />
            )}

            {isExportModalOpen && (
                <ExportModal
                    onClose={() => setIsExportModalOpen(false)}
                    invoices={invoices}
                />
            )}

            {isClientImportModalOpen && (
                <ClientImportModal
                    onClose={() => setIsClientImportModalOpen(false)}
                    userId={userId}
                    existingClients={clients}
                />
            )}

            {isClientExportModalOpen && (
                <ClientExportModal
                    onClose={() => setIsClientExportModalOpen(false)}
                    clients={clients}
                />
            )}
        </div>
    );
}

function ImportModal({
    onClose,
    userId,
    existingInvoices,
    existingClients,
}: {
    onClose: () => void;
    userId: string;
    existingInvoices: any[];
    existingClients: any[];
}) {
    const [file, setFile] = useState<File | null>(null);
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsProcessing(true);
        setError(null);

        try {
            const data = await parseFile(selectedFile);
            const res = preprocessImportData(data, existingInvoices, existingClients);
            setSummary(res);
        } catch (err: any) {
            setError("Failed to parse file. Please ensure it's a valid CSV or Excel file.");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    }

    async function handleImport() {
        if (!summary) return;
        setIsImporting(true);
        try {
            await executeImport(summary, userId);
            alert("Import successful!");
            onClose();
        } catch (err) {
            setError("Failed to execute import. Please try again.");
            console.error(err);
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Import Invoices</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">CSV / Excel Import Utility</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto space-y-6">
                    {!summary ? (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
                                <h4 className="text-blue-900 font-bold text-sm mb-2 uppercase tracking-wide">Step 1: Prepare your file</h4>
                                <p className="text-[10px] font-bold text-blue-800 uppercase leading-tight mb-4">
                                    Ensure your file contains standard columns like Invoice Number, Client Name, and Item Details.
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-black uppercase text-blue-700/60">
                                    <div>• Invoice Number</div>
                                    <div>• Client Name</div>
                                    <div>• Item Description</div>
                                    <div>• Item Rate</div>
                                </div>
                            </div>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center group-hover:border-gray-900 transition-colors bg-gray-50 group-hover:bg-white">
                                    <div className="bg-gray-900 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-black text-gray-900 uppercase">Upload File</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 tracking-widest">CSV, XLSX supported</p>
                                </div>
                            </div>
                            {isProcessing && (
                                <div className="flex items-center justify-center py-4 text-gray-600 font-bold uppercase text-[10px] tracking-widest animate-pulse">
                                    📊 Analyzing data structure...
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-gray-900 rounded-2xl p-6 text-white">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800 text-green-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    <p className="text-xs font-black uppercase tracking-widest">{file?.name}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <p className="text-2xl font-black">{summary.uniqueInvoices}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Invoices</p>
                                    </div>
                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <p className="text-2xl font-black text-blue-400">{summary.newClientsCount}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">New Clients</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border-2 border-yellow-100 rounded-xl p-4 flex gap-3 italic">
                                <div className="text-yellow-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <p className="text-[10px] font-bold text-yellow-900 uppercase leading-tight">
                                    Records are matched by GST/Email. Duplicates are automatically skipped to maintain data integrity.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border-2 border-red-100 rounded-xl p-4 text-red-700 font-bold text-[10px] uppercase text-center animate-shake">
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t flex gap-3">
                    <button
                        onClick={() => { setFile(null); setSummary(null); setError(null); }}
                        className="flex-1 py-4 border-2 border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white active:scale-95 transition-all text-gray-400"
                        disabled={isImporting}
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleImport}
                        className="flex-[2] py-4 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
                        disabled={!summary || isImporting || summary.uniqueInvoices === 0}
                    >
                        {isImporting ? "Processing..." : "Finish Import"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ExportModal({
    onClose,
    invoices,
}: {
    onClose: () => void;
    invoices: any[];
}) {
    const [exportType, setExportType] = useState<"fy" | "month">("fy");
    const [selectedFY, setSelectedFY] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");

    const availableFYs = getAvailableFinancialYears(invoices);
    const availableMonths = getAvailableMonthYears(invoices);

    // Set defaults
    React.useEffect(() => {
        if (availableFYs.length > 0 && !selectedFY) setSelectedFY(availableFYs[0]);
        if (availableMonths.length > 0 && !selectedMonth) setSelectedMonth(`${availableMonths[0].year}-${availableMonths[0].month}`);
    }, [availableFYs, availableMonths]);

    function handleExport() {
        let filteredInvoices = [];
        if (exportType === "fy") {
            filteredInvoices = filterInvoicesByFY(invoices, selectedFY);
        } else {
            const [year, month] = selectedMonth.split('-').map(Number);
            filteredInvoices = filterInvoicesByMonth(invoices, month, year);
        }

        if (filteredInvoices.length === 0) {
            alert("No invoices found for the selected range.");
            return;
        }

        generateInvoiceCSV(filteredInvoices);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Export Data</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Standardized CSV Extraction</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Toggle */}
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                        <button
                            onClick={() => setExportType("fy")}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${exportType === "fy" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                        >
                            By Financial Year
                        </button>
                        <button
                            onClick={() => setExportType("month")}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${exportType === "month" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                        >
                            By Month
                        </button>
                    </div>

                    <div className="space-y-4">
                        {exportType === "fy" ? (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Select Financial Year</label>
                                <select
                                    value={selectedFY}
                                    onChange={(e) => setSelectedFY(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 focus:border-gray-900 transition-colors outline-none"
                                >
                                    {availableFYs.map(fy => (
                                        <option key={fy} value={fy}>{fy}</option>
                                    ))}
                                    {availableFYs.length === 0 && <option disabled>No data available</option>}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Select Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 focus:border-gray-900 transition-colors outline-none"
                                >
                                    {availableMonths.map(m => (
                                        <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{m.label}</option>
                                    ))}
                                    {availableMonths.length === 0 && <option disabled>No data available</option>}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">Standard Format</p>
                            <p className="text-[11px] font-medium text-blue-700/80 leading-relaxed">
                                This export generates a CSV that includes all Client details, tax breakdowns, and line items. It can be re-imported back into {APP_CONFIG.NAME} at any time.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 border-2 border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all text-gray-400"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex-[2] py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-100"
                    >
                        Generate CSV
                    </button>
                </div>
            </div>
        </div>
    );
}

function ClientImportModal({
    onClose,
    userId,
    existingClients,
}: {
    onClose: () => void;
    userId: string;
    existingClients: any[];
}) {
    const [file, setFile] = useState<File | null>(null);
    const [summary, setSummary] = useState<ClientImportSummary | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsProcessing(true);
        setError(null);

        try {
            const data = await parseClientFile(selectedFile);
            const res = preprocessClientData(data, existingClients);
            setSummary(res);
        } catch (err: any) {
            setError("Failed to parse file. Please ensure it's a valid CSV or Excel file.");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    }

    async function handleImport() {
        if (!summary) return;
        setIsImporting(true);
        try {
            await executeClientImport(summary, userId);
            alert("Client import successful!");
            onClose();
        } catch (err) {
            setError("Failed to execute import. Please try again.");
            console.error(err);
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Import Clients</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Bulk Client Creation Utility</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto space-y-6">
                    {!summary ? (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
                                <h4 className="text-blue-900 font-bold text-sm mb-2 uppercase tracking-wide">Supported Columns:</h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-black uppercase text-blue-700/60">
                                    <div>• Display Name</div>
                                    <div>• Company Name</div>
                                    <div>• Email</div>
                                    <div>• Phone / Mobile</div>
                                    <div>• GSTIN / PAN</div>
                                    <div>• Address</div>
                                </div>
                            </div>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center group-hover:border-gray-900 transition-colors bg-gray-50 group-hover:bg-white">
                                    <div className="bg-gray-900 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-black text-gray-900 uppercase">Upload Client List</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 tracking-widest">CSV, XLSX supported</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-gray-900 rounded-2xl p-6 text-white">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800 text-blue-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    <p className="text-xs font-black uppercase tracking-widest">{file?.name}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <p className="text-2xl font-black text-green-400">{summary.newClients}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">New Profiles</p>
                                    </div>
                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <p className="text-2xl font-black text-blue-400">{summary.updatedClients}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">To Update</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border-2 border-red-100 rounded-xl p-4 text-red-700 font-bold text-[10px] uppercase text-center animate-shake">
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t flex gap-3">
                    <button
                        onClick={() => { setFile(null); setSummary(null); setError(null); }}
                        className="flex-1 py-4 border-2 border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white active:scale-95 transition-all text-gray-400"
                        disabled={isImporting}
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleImport}
                        className="flex-[2] py-4 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
                        disabled={!summary || isImporting || (summary.newClients === 0 && summary.updatedClients === 0)}
                    >
                        {isImporting ? "Processing..." : "Finish Import"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ClientExportModal({
    onClose,
    clients,
}: {
    onClose: () => void;
    clients: any[];
}) {
    function handleExport() {
        if (clients.length === 0) {
            alert("No Client records found to export.");
            return;
        }
        generateClientCSV(clients);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Export Clients</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Full Database Extraction</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-blue-600 rounded-2xl p-6 text-white text-center">
                        <p className="text-4xl font-black mb-1">{clients.length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total Client Records</p>
                    </div>

                    <p className="text-[11px] font-medium text-gray-500 leading-relaxed text-center px-4">
                        This will generate a CSV file containing all details for your active client base, including GSTINs, addresses, and contact profiles.
                    </p>
                </div>

                <div className="p-6 bg-gray-50 border-t flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 border-2 border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all text-gray-400"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex-[2] py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-100"
                    >
                        Download CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
