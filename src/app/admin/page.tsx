"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";

// Admin Console Sections
type AdminSection = "overview" | "users" | "businesses" | "concierge" | "audit" | "system";

export default function AdminConsole() {
    const { isLoading: authLoading, user, error: authError } = db.useAuth();

    // Global Query for Admin Operations
    const { isLoading: dataLoading, data, error: queryError } = db.useQuery({
        $users: {
            $: { limit: 1000 },
            businesses: {},
        },
        businesses: {
            owner: {},
            clients: {},
            services: {},
            bankAccounts: {},
            invoices: {},
            expenses: {}
        },
        auditLogs: {
            $: {
                order: { serverCreatedAt: "desc" },
                limit: 100
            }
        }
    } as any);

    const [activeSection, setActiveSection] = useState<AdminSection>("overview");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const currentUser = (data as any)?.$users?.find((u: any) => u.id === user?.id);
    const isAdmin = currentUser?.role === "admin";

    // Helper: Audit Logger
    const logAction = (action: string, targetType: string, targetId: string, targetName?: string, details?: string) => {
        if (!user) return;
        db.transact(
            db.tx.auditLogs[id()].update({
                adminId: user.id,
                adminEmail: user.email,
                action,
                targetType,
                targetId,
                targetName,
                timestamp: new Date().toISOString(),
                details
            } as any)
        );
    };

    // 403 / Loading States
    if (authLoading || dataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans text-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Verifying Admin Access...</p>
                </div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white font-sans p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m0 0v2m0-2h2m-2 0h-2m14-3V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-4z"></path>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">403 Restricted</h1>
                    <p className="text-sm font-medium text-gray-500 leading-relaxed">
                        This area is reserved for Backdrop administrators. If you believe this is an error, please contact system operations.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="inline-block px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const allUsers = (data as any)?.$users || [];
    const allBusinesses = (data as any)?.businesses || [];
    const auditLogs = (data as any)?.auditLogs || [];

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex text-gray-900">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 h-full">
                <div className="p-8">
                    <h2 className="text-lg font-black uppercase tracking-tighter text-gray-900 flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
                        Admin Console
                    </h2>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 opacity-60">Backdrop Operations</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                    <NavButton
                        active={activeSection === "overview"}
                        onClick={() => setActiveSection("overview")}
                        label="Overview"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />}
                    />
                    <NavButton
                        active={activeSection === "users"}
                        onClick={() => setActiveSection("users")}
                        label="Users"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
                    />
                    <NavButton
                        active={activeSection === "businesses"}
                        onClick={() => setActiveSection("businesses")}
                        label="Profiles"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />}
                    />
                    <NavButton
                        active={activeSection === "concierge"}
                        onClick={() => setActiveSection("concierge")}
                        label="Concierge"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                    />
                    <NavButton
                        active={activeSection === "audit"}
                        onClick={() => setActiveSection("audit")}
                        label="Audit Logs"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />}
                    />
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <NavButton
                        active={activeSection === "system"}
                        onClick={() => setActiveSection("system")}
                        label="System Config"
                        icon={<><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>}
                    />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 min-h-screen p-12 overflow-y-auto">
                {activeSection === "overview" && <OverviewView users={allUsers} businesses={allBusinesses} auditLogs={auditLogs} />}
                {activeSection === "users" && <UsersView users={allUsers} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelect={setSelectedUser} />}
                {activeSection === "businesses" && <BusinessesView businesses={allBusinesses} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelect={setSelectedBusiness} />}
                {activeSection === "concierge" && <ConciergeView businesses={allBusinesses} logAction={logAction} adminId={user.id} onSelectBusiness={setSelectedBusiness} />}
                {activeSection === "audit" && <AuditView auditLogs={auditLogs} />}
                {activeSection === "system" && <SystemView />}
            </main>

            {/* Modals */}
            {selectedUser && <UserDetailView user={selectedUser} onClose={() => setSelectedUser(null)} logAction={logAction} />}
            {selectedBusiness && <BusinessDetailView business={selectedBusiness} onClose={() => setSelectedBusiness(null)} logAction={logAction} />}
        </div>
    );
}

function NavButton({ active, label, onClick, icon }: { active: boolean, label: string, onClick: () => void, icon?: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? "bg-gray-900 text-white shadow-xl shadow-gray-200" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
        >
            {icon && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>}
            {label}
        </button>
    );
}

// --- VIEWS ---

function OverviewView({ users, businesses, auditLogs }: { users: any[], businesses: any[], auditLogs: any[] }) {
    const active7d = users.filter(u => {
        if (!u.lastLoginAt) return false;
        const lastLogin = new Date(u.lastLoginAt).getTime();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return lastLogin > sevenDaysAgo;
    }).length;

    const pendingClaims = businesses.filter(b => b.status === "pending_claim").length;
    const disabledUsers = users.filter(u => u.status === "disabled").length;

    const stats = [
        { label: "Total Users", val: users.length.toString(), color: "text-blue-600" },
        { label: "Active 7D", val: active7d.toString(), color: "text-green-600" },
        { label: "Pending Claims", val: pendingClaims.toString(), color: "text-red-600" },
        { label: "Disabled", val: disabledUsers.toString(), color: "text-gray-400" },
    ];

    const stuckClaims = businesses.filter(b => {
        if (b.status !== "pending_claim" || !b.serverCreatedAt) return false;
        const created = new Date(b.serverCreatedAt).getTime();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return created < sevenDaysAgo;
    });

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div>
                <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase mb-4">Operations<br />Overview</h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Situational Awareness — Realtime</p>
            </div>

            <div className="grid grid-cols-4 gap-6">
                {stats.map(s => (
                    <div key={s.label} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:border-gray-900 group">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">{s.label}</p>
                        <div className="flex items-end justify-between">
                            <p className="text-4xl font-black text-gray-900 tracking-tighter">{s.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-12 mt-12">
                <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 ml-2 italic">Critical Attention</h3>
                    <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                        {stuckClaims.length > 0 ? (
                            <div className="flex items-start gap-4">
                                <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2"></span>
                                <div>
                                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{stuckClaims.length} users stuck in pending_claim &gt; 7 days</p>
                                    <p className="text-[10px] font-medium text-gray-500 mt-1">Suggested action: Follow up or release profile.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4 opacity-40">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></span>
                                <div>
                                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">No stuck claims</p>
                                    <p className="text-[10px] font-medium text-gray-500 mt-1">Concierges are claiming profiles within SLAs.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 ml-2 italic">Recent Activity</h3>
                    <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                        {auditLogs.slice(0, 5).map((log: any) => (
                            <div key={log.id} className="py-4 first:pt-0 last:pb-0 flex justify-between items-center px-2">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate">{log.action.replace("_", " ")}</p>
                                    <p className="text-[8px] font-medium text-gray-400 truncate">{log.targetName || log.targetId}</p>
                                </div>
                                <p className="text-[9px] font-black text-gray-400 uppercase shrink-0">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UsersView({ users, searchQuery, setSearchQuery, onSelect }: { users: any[], searchQuery: string, setSearchQuery: (s: string) => void, onSelect: (u: any) => void }) {
    const filteredUsers = useMemo(() => users.filter(u => u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || u.role?.toLowerCase().includes(searchQuery.toLowerCase())), [users, searchQuery]);
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase mb-4">User<br />Management</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Manage Identity & Permissions</p>
                </div>
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by email..." />
            </div>
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <tr><th className="px-8 py-6">Email / Role</th><th className="px-8 py-6 text-center">Status</th><th className="px-8 py-6">Last Login</th><th className="px-8 py-6 text-right pr-12">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="group hover:bg-gray-50/30 cursor-pointer" onClick={() => onSelect(u)}>
                                <td className="px-8 py-6"><p className="text-sm font-black text-gray-900">{u.email}</p><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${u.role === "admin" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>{u.role || "user"}</span></td>
                                <td className="px-8 py-6 text-center"><span className={`text-[10px] font-black uppercase tracking-tighter ${u.status === "disabled" ? "text-red-400" : "text-green-500"}`}>{u.status === "disabled" ? "Disabled" : "Active"}</span></td>
                                <td className="px-8 py-6"><p className="text-[10px] font-black text-gray-500 uppercase">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-GB') : "Never"}</p></td>
                                <td className="px-8 py-6 text-right pr-12"><button className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all">View Detail</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BusinessesView({ businesses, searchQuery, setSearchQuery, onSelect }: { businesses: any[], searchQuery: string, setSearchQuery: (s: string) => void, onSelect: (b: any) => void }) {
    const filteredBusinesses = useMemo(() => businesses.filter(b => b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.email?.toLowerCase().includes(searchQuery.toLowerCase())), [businesses, searchQuery]);
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div><h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase mb-4">Business<br />Profiles</h1><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Manage Organization Profiles</p></div>
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search profiles..." />
            </div>
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <tr><th className="px-8 py-6">Business Name / Email</th><th className="px-8 py-6 text-center">Status</th><th className="px-8 py-6 text-center">Claimant / Owner</th><th className="px-8 py-6 text-right pr-12">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredBusinesses.map(b => (
                            <tr key={b.id} className="group hover:bg-gray-50/30 cursor-pointer" onClick={() => onSelect(b)}>
                                <td className="px-8 py-6">
                                    <p className="text-sm font-black text-gray-900">{b.name}</p>
                                    <p className="text-[10px] font-medium text-gray-400">{b.email || "No business email"}</p>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${b.status === "active" ? "text-green-500" : b.status === "disabled" ? "text-red-400" : "text-orange-400"}`}>
                                        {b.status || "active"}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-center whitespace-nowrap">
                                    {b.status === "pending_claim" ? (
                                        <span className="text-[10px] font-black uppercase text-gray-300">No (Awaiting User)</span>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black uppercase text-blue-600">Yes</span>
                                            <span className="text-[9px] font-medium text-gray-500 lowercase">{b.owner?.email}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-right pr-12"><button className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all">View Detail</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ConciergeView({ businesses, logAction, adminId, onSelectBusiness }: { businesses: any[], logAction: any, adminId: string, onSelectBusiness: (b: any) => void }) {
    const [step, setStep] = useState(1);
    const [onboardingTab, setOnboardingTab] = useState<"business" | "clients" | "services" | "finance">("business");
    const [form, setForm] = useState({
        business: { name: "", email: "", legalName: "", pan: "", gst: "" },
        clients: [{ id: id(), displayName: "", email: "" }],
        services: [{ id: id(), name: "", rate: "" }],
        bankAccounts: [{ id: id(), bankName: "", holderName: "", accountNumber: "", ifsc: "" }],
        invoices: [{ id: id(), clientIdx: 0, amount: "", subject: "" }],
        expenses: [{ id: id(), description: "", amount: "", category: "Miscellaneous" }]
    });

    const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);

    const pendingProfiles = businesses.filter(b => b.status === "pending_claim");

    const addItem = (key: keyof typeof form) => {
        if (key === "business") return;
        const newId = id();
        let newVal: any = {};
        if (key === "clients") newVal = { id: newId, displayName: "", email: "" };
        if (key === "services") newVal = { id: newId, name: "", rate: "" };
        if (key === "bankAccounts") newVal = { id: newId, bankName: "", holderName: "", accountNumber: "", ifsc: "" };
        if (key === "invoices") newVal = { id: newId, clientIdx: 0, amount: "", subject: "" };
        if (key === "expenses") newVal = { id: newId, description: "", amount: "", category: "Miscellaneous" };

        setForm(prev => ({ ...prev, [key]: [...(prev[key] as any[]), newVal] }));
    };

    const updateItem = (key: keyof typeof form, idx: number, fields: any) => {
        if (key === "business") {
            setForm(prev => ({ ...prev, business: { ...prev.business, ...fields } }));
            return;
        }
        setForm(prev => {
            const list = [...(prev[key] as any[])];
            list[idx] = { ...list[idx], ...fields };
            return { ...prev, [key]: list };
        });
    };

    const handleCreate = () => {
        if (!form.business.name || !form.business.email) {
            alert("Business Name and Email are required");
            return;
        }
        const bId = editingBusinessId || id();
        const txs: any[] = [
            db.tx.businesses[bId].update({
                ...form.business,
                status: "pending_claim",
                createdBy: "admin",
                color: businessToEdit?.color || ("#" + Math.floor(Math.random() * 16777215).toString(16))
            } as any),
            db.tx.businesses[bId].link({ owner: adminId })
        ];

        form.clients.filter(c => c.displayName).forEach(c => {
            txs.push(db.tx.clients[c.id].update({ displayName: c.displayName, email: c.email, source: "concierge" } as any));
            txs.push(db.tx.clients[c.id].link({ business: bId, owner: adminId }));
        });

        form.services.filter(s => s.name).forEach(s => {
            txs.push(db.tx.services[s.id].update({ name: s.name, rate: parseFloat(s.rate) || 0, isActive: true, source: "concierge" } as any));
            txs.push(db.tx.services[s.id].link({ business: bId, owner: adminId }));
        });

        form.bankAccounts.filter(ba => ba.bankName).forEach(ba => {
            txs.push(db.tx.bankAccounts[ba.id].update({ ...ba, isActive: true, label: "Primary", source: "concierge" } as any));
            txs.push(db.tx.bankAccounts[ba.id].link({ business: bId, owner: adminId }));
        });

        form.invoices.filter(inv => inv.amount).forEach(inv => {
            const clientId = form.clients[inv.clientIdx]?.id;
            txs.push(db.tx.invoices[inv.id].update({
                invoiceNumber: "H-" + Math.floor(Math.random() * 1000),
                invoiceDate: new Date().toISOString().split('T')[0],
                dueDate: new Date().toISOString().split('T')[0],
                subtotal: parseFloat(inv.amount) || 0,
                total: parseFloat(inv.amount) || 0,
                status: "draft",
                subject: inv.subject || "Historical Record",
                source: "concierge"
            } as any));
            txs.push(db.tx.invoices[inv.id].link({ business: bId, owner: adminId }));
            if (clientId) txs.push(db.tx.invoices[inv.id].link({ client: clientId }));
        });

        form.expenses.filter(e => e.amount).forEach(e => {
            txs.push(db.tx.expenses[e.id].update({
                description: e.description,
                amount: parseFloat(e.amount) || 0,
                category: e.category,
                date: new Date().toISOString().split('T')[0],
                status: "confirmed",
                source: "concierge"
            } as any));
            txs.push(db.tx.expenses[e.id].link({ business: bId, owner: adminId }));
        });

        db.transact(txs);
        logAction(editingBusinessId ? "update_concierge_profile" : "comprehensive_concierge_setup", "business", bId, form.business.name, `Email: ${form.business.email}`);
        setStep(1);
        setEditingBusinessId(null);
        alert(editingBusinessId ? "Concierge profile updated!" : "Comprehensive concierge profile created!");
    };

    const businessToEdit = editingBusinessId ? businesses.find(b => b.id === editingBusinessId) : null;

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase mb-4">Concierge<br />Onboarding</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Full Environment Pre-provisioning</p>
                </div>
                {step === 1 ? (
                    <button onClick={() => {
                        setEditingBusinessId(null);
                        setForm({
                            business: { name: "", email: "", legalName: "", pan: "", gst: "" },
                            clients: [{ id: id(), displayName: "", email: "" }],
                            services: [{ id: id(), name: "", rate: "" }],
                            bankAccounts: [{ id: id(), bankName: "", holderName: "", accountNumber: "", ifsc: "" }],
                            invoices: [{ id: id(), clientIdx: 0, amount: "", subject: "" }],
                            expenses: [{ id: id(), description: "", amount: "", category: "Miscellaneous" }]
                        });
                        setStep(2);
                    }} className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200">Start New Setup</button>
                ) : (
                    <div className="flex gap-4">
                        <button onClick={() => { setStep(1); setEditingBusinessId(null); }} className="px-8 py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
                        <button onClick={handleCreate} className="px-8 py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-100">
                            {editingBusinessId ? "Update & Save" : "Provision Everything"}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-4 gap-8">
                <div className="col-span-1 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 ml-2 italic">Pending Claims</h3>
                    <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm space-y-4 max-h-[40rem] overflow-y-auto">
                        {pendingProfiles.map(b => (
                            <div
                                key={b.id}
                                onClick={() => onSelectBusiness(b)}
                                className="p-5 bg-gray-50 rounded-3xl border border-transparent hover:border-gray-900 transition-all cursor-pointer group flex justify-between items-center"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase truncate">{b.name}</p>
                                    <p className="text-[9px] font-medium text-gray-400 mt-1 truncate">{b.email}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingBusinessId(b.id);
                                            setForm({
                                                business: {
                                                    name: b.name || "",
                                                    email: b.email || "",
                                                    legalName: b.legalName || "",
                                                    pan: b.pan || "",
                                                    gst: b.gst || ""
                                                },
                                                clients: b.clients?.length ? b.clients.map((c: any) => ({ id: c.id, displayName: c.displayName, email: c.email })) : [{ id: id(), displayName: "", email: "" }],
                                                services: b.services?.length ? b.services.map((s: any) => ({ id: s.id, name: s.name, rate: s.rate?.toString() || "" })) : [{ id: id(), name: "", rate: "" }],
                                                bankAccounts: b.bankAccounts?.length ? b.bankAccounts.map((ba: any) => ({ id: ba.id, bankName: ba.bankName, holderName: ba.holderName, accountNumber: ba.accountNumber, ifsc: ba.ifsc })) : [{ id: id(), bankName: "", holderName: "", accountNumber: "", ifsc: "" }],
                                                invoices: b.invoices?.length ? b.invoices.map((inv: any) => ({ id: inv.id, clientIdx: b.clients?.findIndex((c: any) => c.id === inv.client?.id) ?? 0, amount: inv.total?.toString() || "", subject: inv.subject || "" })) : [{ id: id(), clientIdx: 0, amount: "", subject: "" }],
                                                expenses: b.expenses?.length ? b.expenses.map((e: any) => ({ id: e.id, description: e.description, amount: e.amount?.toString() || "", category: e.category })) : [{ id: id(), description: "", amount: "", category: "Miscellaneous" }]
                                            });
                                            setStep(2);
                                        }}
                                        className="p-3 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all"
                                        title="Resume Setup / Edit"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Discard provisioned profile for "${b.name}"? This will remove the business and all linked concierge data.`)) {
                                                db.transact(db.tx.businesses[b.id].delete());
                                                logAction("discard_concierge_profile", "business", b.id, b.name);
                                            }
                                        }}
                                        className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-all"
                                        title="Discard Profile"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {pendingProfiles.length === 0 && <p className="text-center py-10 text-[9px] font-black text-gray-300 uppercase">No active concierges</p>}
                    </div>
                </div>

                <div className="col-span-3">
                    {step === 1 ? (
                        <div className="bg-white rounded-[4rem] border border-gray-100 shadow-sm p-20 text-center flex flex-col items-center justify-center min-h-[40rem] opacity-60">
                            <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-[2.5rem] flex items-center justify-center mb-8">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Ready for Onboarding</h3>
                            <p className="text-sm font-medium text-gray-400 mt-3 max-w-sm">Use this section to pre-configure a complete business environment including legal info, customers, and active services.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[4rem] border border-gray-900 shadow-2xl p-12 space-y-12 animate-in slide-in-from-right-12 duration-500 overflow-hidden relative">
                            {/* Sub-navigation */}
                            <div className="flex gap-8 border-b border-gray-100 pb-2">
                                {(["business", "clients", "services", "finance"] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setOnboardingTab(tab)}
                                        className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${onboardingTab === tab ? "text-gray-900" : "text-gray-300 hover:text-gray-500"}`}
                                    >
                                        {tab}
                                        {onboardingTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-full"></div>}
                                    </button>
                                ))}
                            </div>

                            <div className="min-h-[30rem]">
                                {onboardingTab === "business" && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="grid grid-cols-2 gap-8">
                                            <FormInput label="Brand Name" placeholder="e.g. Acme Studio" value={form.business.name} onChange={v => updateItem("business", 0, { name: v })} />
                                            <FormInput label="Claim Email" placeholder="user@gmail.com" value={form.business.email} onChange={v => updateItem("business", 0, { email: v })} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-8">
                                            <FormInput label="Legal Name" placeholder="Acme Pvt Ltd" value={form.business.legalName} onChange={v => updateItem("business", 0, { legalName: v })} />
                                            <FormInput label="PAN" placeholder="ABCDE1234F" value={form.business.pan} onChange={v => updateItem("business", 0, { pan: v })} />
                                            <FormInput label="GST" placeholder="27AAAC..." value={form.business.gst} onChange={v => updateItem("business", 0, { gst: v })} />
                                        </div>
                                    </div>
                                )}

                                {onboardingTab === "clients" && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                        {form.clients.map((c, i) => (
                                            <div key={c.id} className="grid grid-cols-2 gap-8 bg-gray-50 p-6 rounded-3xl relative group">
                                                <FormInput label={`Client ${i + 1} Name`} placeholder="John Doe" value={c.displayName} onChange={v => updateItem("clients", i, { displayName: v })} />
                                                <FormInput label="Contact Email" placeholder="john@doe.com" value={c.email} onChange={v => updateItem("clients", i, { email: v })} />
                                            </div>
                                        ))}
                                        <button onClick={() => addItem("clients")} className="w-full py-4 border border-dashed border-gray-300 rounded-2xl text-[9px] font-black text-gray-400 uppercase tracking-widest hover:border-gray-900 hover:text-gray-900 transition-all">+ Add Another Client</button>
                                    </div>
                                )}

                                {onboardingTab === "services" && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                        {form.services.map((s, i) => (
                                            <div key={s.id} className="grid grid-cols-3 gap-8 bg-gray-50 p-6 rounded-3xl">
                                                <div className="col-span-2"><FormInput label="Service Name" placeholder="Wedding Photography" value={s.name} onChange={v => updateItem("services", i, { name: v })} /></div>
                                                <FormInput label="Standard Rate" placeholder="50000" value={s.rate} onChange={v => updateItem("services", i, { rate: v })} />
                                            </div>
                                        ))}
                                        <button onClick={() => addItem("services")} className="w-full py-4 border border-dashed border-gray-300 rounded-2xl text-[9px] font-black text-gray-400 uppercase tracking-widest hover:border-gray-900 hover:text-gray-900 transition-all">+ Add Another Service</button>
                                    </div>
                                )}

                                {onboardingTab === "finance" && (
                                    <div className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="space-y-6">
                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-2">Bank Accounts</p>
                                            {form.bankAccounts.map((ba, i) => (
                                                <div key={ba.id} className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-3xl">
                                                    <FormInput label="Bank" placeholder="HDFC" value={ba.bankName} onChange={v => updateItem("bankAccounts", i, { bankName: v })} />
                                                    <FormInput label="Holder" placeholder="Acme" value={ba.holderName} onChange={v => updateItem("bankAccounts", i, { holderName: v })} />
                                                    <FormInput label="A/C No" placeholder="..." value={ba.accountNumber} onChange={v => updateItem("bankAccounts", i, { accountNumber: v })} />
                                                    <FormInput label="IFSC" placeholder="..." value={ba.ifsc} onChange={v => updateItem("bankAccounts", i, { ifsc: v })} />
                                                </div>
                                            ))}
                                            <button onClick={() => addItem("bankAccounts")} className="px-4 py-2 text-[8px] font-black uppercase text-blue-500">+ Add Bank</button>
                                        </div>

                                        <div className="space-y-6">
                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-2">Historical Records (Invoices & Expenses)</p>
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    {form.invoices.map((inv, i) => (
                                                        <div key={inv.id} className="bg-gray-50 p-4 rounded-3xl space-y-4">
                                                            <div className="flex gap-4">
                                                                <div className="flex-1">
                                                                    <p className="text-[8px] font-black uppercase text-gray-400 ml-1 mb-1">Assign to Client</p>
                                                                    <select
                                                                        className="w-full bg-white rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none"
                                                                        value={inv.clientIdx}
                                                                        onChange={e => updateItem("invoices", i, { clientIdx: parseInt(e.target.value) })}
                                                                    >
                                                                        {form.clients.map((c, ci) => (
                                                                            <option key={c.id} value={ci}>{c.displayName || `Client ${ci + 1}`}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <FormInput label="Amount" placeholder="100" value={inv.amount} onChange={v => updateItem("invoices", i, { amount: v })} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addItem("invoices")} className="text-[8px] font-black uppercase text-blue-500">+ Add Invoice</button>
                                                </div>
                                                <div className="space-y-4">
                                                    {form.expenses.map((e, i) => (
                                                        <div key={e.id} className="bg-gray-50 p-4 rounded-3xl space-y-4">
                                                            <div className="flex gap-4">
                                                                <div className="flex-1"><FormInput label="Expense Desc" placeholder="Rent" value={e.description} onChange={v => updateItem("expenses", i, { description: v })} /></div>
                                                                <FormInput label="Amount" placeholder="50" value={e.amount} onChange={v => updateItem("expenses", i, { amount: v })} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addItem("expenses")} className="text-[8px] font-black uppercase text-blue-500">+ Add Expense</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AuditView({ auditLogs }: { auditLogs: any[] }) {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div><h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase mb-4">Audit<br />Logs</h1><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Administrative Accountability</p></div>
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <tr><th className="px-8 py-6">Admin</th><th className="px-8 py-6">Action</th><th className="px-8 py-6">Target</th><th className="px-8 py-6">Timestamp</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {auditLogs.map(log => (
                            <tr key={log.id} className="group hover:bg-gray-50/30">
                                <td className="px-8 py-6 text-[10px] font-black text-gray-900">{log.adminEmail}</td>
                                <td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-blue-600">{log.action.replace("_", " ")}</td>
                                <td className="px-8 py-6"><p className="text-[10px] font-black text-gray-900 uppercase truncate max-w-xs">{log.targetName || log.targetId}</p></td>
                                <td className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase">{new Date(log.timestamp).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SystemView() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div><h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase mb-4">System<br />Config</h1><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tactical Environmental Controls</p></div>
            <div className="max-w-xl space-y-6">
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <div><p className="text-sm font-black text-gray-900 uppercase">Concierge Onboarding</p><p className="text-[10px] font-medium text-gray-400 pr-20 mt-1">Enable or disable the special pre-provisioning flow for operations.</p></div>
                        <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-end px-1 cursor-not-allowed opacity-50"><div className="w-4 h-4 bg-white rounded-full"></div></div>
                    </div>
                </div>
                <div className="bg-gray-900 p-8 rounded-[3rem] space-y-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Environmental Context</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl"><p className="text-[8px] font-black text-gray-500 uppercase mb-1">Status</p><p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Production Ready</p></div>
                        <div className="p-4 bg-white/5 rounded-2xl"><p className="text-[8px] font-black text-gray-500 uppercase mb-1">Region</p><p className="text-[10px] font-black text-white hover:text-green-400 transition-colors uppercase tracking-widest">Global Ops</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SHARED UI ---
function SearchBar({ value, onChange, placeholder }: { value: string, onChange: (s: string) => void, placeholder: string }) {
    return (
        <div className="w-80 relative group">
            <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-white border border-gray-100 rounded-2xl px-12 py-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-gray-900 transition-all shadow-sm group-hover:shadow-md" />
            <svg className="w-4 h-4 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
    );
}

function FormInput({ label, placeholder, value, onChange }: { label: string, placeholder: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="space-y-2">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">{label}</p>
            <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-gray-50 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-2 ring-gray-900" />
        </div>
    );
}

// --- DETAIL MODALS (UserDetailView, BusinessDetailView) as previously defined but optimized ---
function UserDetailView({ user, onClose, logAction }: { user: any, onClose: () => void, logAction: any }) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const handleToggleStatus = () => {
        const newStatus = user.status === "disabled" ? "active" : "disabled";
        db.transact(db.tx.$users[user.id].update({ status: newStatus } as any));
        logAction(newStatus === "disabled" ? "disable_user" : "enable_user", "user", user.id, user.email);
        onClose();
    };
    const handleDelete = () => {
        if (deleteConfirmText !== "DELETE") return;
        const txs: any[] = [db.tx.$users[user.id].delete()];
        user.businesses?.forEach((b: any) => txs.push(db.tx.businesses[b.id].delete()));
        db.transact(txs);
        logAction("hard_delete_user", "user", user.id, user.email);
        onClose();
    };
    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-[32rem] bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">User Identity card</p><h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{user.email}</h2></div>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="flex-1 overflow-y-auto p-12 space-y-12">
                    <div className="grid grid-cols-2 gap-8">
                        <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal ID</p><p className="text-[10px] font-mono font-bold text-gray-600 truncate">{user.id}</p></div>
                        <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Role</p><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${user.role === "admin" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>{user.role || "user"}</span></div>
                    </div>
                    <div className="pt-8 space-y-4 border-t border-gray-100">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] border-b border-red-50 pb-2">Destructive Operations</p>
                        <button onClick={handleToggleStatus} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${user.status === "disabled" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>{user.status === "disabled" ? "Enable Access" : "Disable User (Soft block)"}</button>
                        {!confirmingDelete ? <button onClick={() => setConfirmingDelete(true)} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase transition-all">Delete Account</button> : <div className="p-6 bg-red-600 rounded-3xl animate-in shake"><input placeholder="Type DELETE..." value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white text-xs font-black outline-none mb-4" /><div className="flex gap-2"><button onClick={handleDelete} className="flex-1 bg-white text-red-600 py-3 rounded-xl text-[10px] font-black uppercase">Confirm</button><button onClick={() => setConfirmingDelete(false)} className="px-4 py-3 rounded-xl text-[10px] font-black text-white uppercase">Cancel</button></div></div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BusinessDetailView({ business, onClose, logAction }: { business: any, onClose: () => void, logAction: any }) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    // Form state for editing
    const [form, setForm] = useState({
        name: business.name || "",
        email: business.email || "",
        legalName: business.legalName || "",
        pan: business.pan || "",
        gst: business.gst || ""
    });

    const isDirty = form.name !== (business.name || "") ||
        form.email !== (business.email || "") ||
        form.legalName !== (business.legalName || "") ||
        form.pan !== (business.pan || "") ||
        form.gst !== (business.gst || "");

    const handleSave = () => {
        db.transact(db.tx.businesses[business.id].update(form));
        logAction("update_business_details", "business", business.id, business.name, JSON.stringify(form));
    };

    const handleToggleStatus = () => {
        const newStatus = business.status === "disabled" ? "active" : "disabled";
        db.transact(db.tx.businesses[business.id].update({ status: newStatus } as any));
        logAction(newStatus === "disabled" ? "disable_business" : "enable_business", "business", business.id, business.name);
        onClose();
    };

    const handleDelete = () => {
        if (deleteConfirmText !== "DELETE") return;
        db.transact(db.tx.businesses[business.id].delete());
        logAction("hard_delete_business", "business", business.id, business.name);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-[32rem] bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Business Identity card</p>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{business.name}</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar">
                    {/* Core Info Inputs */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 pb-2 italic">Profile Details</p>
                        <div className="space-y-4">
                            <FormInput label="Brand Name" placeholder="Acme Studio" value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} />
                            <FormInput label="Email" placeholder="contact@acme.com" value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="Legal Name" placeholder="Acme Pvt Ltd" value={form.legalName} onChange={(v) => setForm(f => ({ ...f, legalName: v }))} />
                                <FormInput label="PAN" placeholder="ABCDE1234F" value={form.pan} onChange={(v) => setForm(f => ({ ...f, pan: v }))} />
                            </div>
                            <FormInput label="GST Number" placeholder="27AAAC..." value={form.gst} onChange={(v) => setForm(f => ({ ...f, gst: v }))} />
                        </div>
                        {isDirty && (
                            <button
                                onClick={handleSave}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all animate-in fade-in"
                            >
                                Save Changes
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</p>
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${business.status === "active" ? "bg-green-50 text-green-600" : business.status === "pending_claim" ? "bg-orange-50 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                                {business.status?.replace("_", " ") || "active"}
                            </span>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Legal Owner</p>
                            <p className="text-[10px] font-bold text-gray-900 truncate">
                                {business.status === "pending_claim" ? "Unclaimed (Pending)" : (business.owner?.email || "Unknown User")}
                            </p>
                        </div>
                    </div>

                    {/* Stats or Assets */}
                    <div className="bg-gray-50 rounded-[2rem] p-6 space-y-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Provisioned Assets</p>
                        <div className="grid grid-cols-5 gap-2 text-center">
                            <div className="bg-white p-2 rounded-xl"><p className="text-sm font-black text-gray-900">{business.clients?.length || 0}</p><p className="text-[7px] font-black text-gray-400 uppercase">Clients</p></div>
                            <div className="bg-white p-2 rounded-xl"><p className="text-sm font-black text-gray-900">{business.services?.length || 0}</p><p className="text-[7px] font-black text-gray-400 uppercase">Services</p></div>
                            <div className="bg-white p-2 rounded-xl"><p className="text-sm font-black text-gray-900">{business.bankAccounts?.length || 0}</p><p className="text-[7px] font-black text-gray-400 uppercase">Banks</p></div>
                            <div className="bg-white p-2 rounded-xl"><p className="text-sm font-black text-gray-900">{business.invoices?.length || 0}</p><p className="text-[7px] font-black text-gray-400 uppercase">Invoices</p></div>
                            <div className="bg-white p-2 rounded-xl"><p className="text-sm font-black text-gray-900">{business.expenses?.length || 0}</p><p className="text-[7px] font-black text-gray-400 uppercase">Expenses</p></div>
                        </div>
                    </div>

                    <div className="pt-8 space-y-4 border-t border-gray-100">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] border-b border-red-50 pb-2">Admin Overrides</p>
                        <button onClick={handleToggleStatus} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${business.status === "disabled" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>{business.status === "disabled" ? "Enable Profile" : "Disable Profile"}</button>
                        {!confirmingDelete ? <button onClick={() => setConfirmingDelete(true)} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase transition-all">Delete Profile</button> : <div className="p-6 bg-red-600 rounded-3xl animate-in shake"><input placeholder="Type DELETE..." value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white text-xs font-black outline-none mb-4" /><div className="flex gap-2"><button onClick={handleDelete} className="flex-1 bg-white text-red-600 py-3 rounded-xl text-[10px] font-black uppercase">Confirm</button><button onClick={() => setConfirmingDelete(false)} className="px-4 py-3 rounded-xl text-[10px] font-black text-white uppercase">Cancel</button></div></div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
