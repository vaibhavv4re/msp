
import { useState } from "react";
import { Invoice, Client, CalendarEvent } from "@/app/page";
import { db } from "@/lib/db";
import { Edit2, Trash2 } from "lucide-react";
import { syncToCalendars } from "@/lib/calendarSync";

type TimeContext = "this_month" | "last_month" | "all_time";

function calculateTotals(invoices: Invoice[], context: TimeContext) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filtered = invoices.filter(inv => {
    if (context === "all_time") return true;
    const invDate = new Date(inv.invoiceDate);
    if (context === "this_month") {
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
    }
    if (context === "last_month") {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return invDate.getMonth() === lastMonth && invDate.getFullYear() === lastMonthYear;
    }
    return true;
  });

  let received = 0;
  let receivable = 0;

  filtered.forEach(inv => {
    const total = inv.total || 0;
    const advance = (inv as any).isAdvanceReceived ? ((inv as any).advanceAmount || 0) : 0;

    if (inv.status === "Paid") {
      received += total;
    } else {
      received += advance;
      receivable += (total - advance);
    }
  });

  const billed = filtered.reduce((acc, inv) => acc + (inv.total || 0), 0);

  return { receivable, received, billed, count: filtered.length };
}

function isDateInFY(dateStr: string, fy: string) {
  const [startYearStr, endYearStr] = fy.split("-");
  const startYear = parseInt(startYearStr);
  const endYear = parseInt(endYearStr);
  const d = new Date(dateStr);
  const m = d.getMonth();
  const y = d.getFullYear();

  const isAfterAprilStart = (y === startYear && m >= 3) || y > startYear;
  const isBeforeMarchEnd = (y === endYear && m <= 2) || y < endYear;

  return isAfterAprilStart && isBeforeMarchEnd;
}

function calculateGSTMetrics(invoices: Invoice[], selectedFY: string) {
  const paidInvoices = invoices.filter(inv =>
    inv.status === "Paid" && isDateInFY(inv.invoiceDate, selectedFY)
  );

  const totalReceived = paidInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
  const gstCollected = paidInvoices.reduce((acc, inv) => acc + (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0), 0);
  const usableIncome = totalReceived - gstCollected;

  // Group by month
  const timelineMap: Record<string, { monthYear: string, gst: number, date: Date }> = {};

  paidInvoices.forEach(inv => {
    const d = new Date(inv.invoiceDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const monthYear = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!timelineMap[key]) {
      timelineMap[key] = { monthYear, gst: 0, date: d };
    }
    timelineMap[key].gst += (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0);
  });

  const timeline = Object.values(timelineMap).sort((a, b) => b.date.getTime() - a.date.getTime());

  return { totalReceived, gstCollected, usableIncome, timeline };
}

export function Dashboard({
  invoices,
  clients,
  calendarEvents,
  activeBusinessId,
  onNavigate
}: {
  invoices: Invoice[];
  clients: Client[];
  calendarEvents: CalendarEvent[];
  activeBusinessId: string;
  onNavigate: (view: any, modal?: string) => void;
}) {
  const [context, setContext] = useState<TimeContext>("this_month");
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [selectedGSTFY, setSelectedGSTFY] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    return now.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  });

  const { receivable, received, billed } = calculateTotals(invoices, context);
  const { totalReceived, gstCollected, usableIncome, timeline } = calculateGSTMetrics(invoices, selectedGSTFY);

  const upcomingEvents = calendarEvents
    .filter(event => {
      const eventDate = new Date(event.start || "");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);
      return eventDate >= today && eventDate <= nextWeek;
    })
    .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

  const paymentInvoices = invoices.filter(inv => {
    if (inv.status === "Paid") return false;
    const client = clients.find(c => c.id === (inv as any).client?.id);
    const clientName = client?.displayName || client?.firstName || "";
    const search = paymentSearch.toLowerCase();
    return inv.invoiceNumber.toLowerCase().includes(search) || clientName.toLowerCase().includes(search);
  });

  const oldestUnpaid = [...invoices]
    .filter(inv => inv.status !== "Paid")
    .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime())[0];

  const oldestUnpaidClient = oldestUnpaid ? clients.find(c => c.id === (oldestUnpaid as any).client?.id) : null;

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
      try {
        await syncToCalendars(event as any, 'delete');
        db.transact(db.tx.calendarEvents[event.id].delete());
      } catch (error) {
        console.error("Failed to delete event:", error);
        alert("Failed to delete event. It will be removed from the local database.");
        db.transact(db.tx.calendarEvents[event.id].delete());
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Context Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Overview</h2>
            {activeBusinessId === "ALL" && (
              <span className="bg-gray-100 text-gray-600 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-gray-200">
                All Businesses
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 font-medium">Welcome back! Here's what's happening.</p>
        </div>
        <div className="inline-flex bg-white p-1 rounded-lg shadow-sm border border-gray-200">
          {(["this_month", "last_month", "all_time"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setContext(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${context === t
                ? "bg-gray-900 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-blue-600 hover:shadow-md transition-shadow">
          <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Billed</h2>
          <div className="flex flex-col xl:flex-row xl:items-baseline xl:gap-2 overflow-hidden">
            <span className="text-xl xl:text-2xl font-bold text-gray-600 shrink-0">₹</span>
            <p className="text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 truncate">
              {billed.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded uppercase">Total Invoiced</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-green-500 hover:shadow-md transition-shadow">
          <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Received</h2>
          <div className="flex flex-col xl:flex-row xl:items-baseline xl:gap-2 overflow-hidden">
            <span className="text-xl xl:text-2xl font-bold text-gray-600 shrink-0">₹</span>
            <p className="text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 truncate">
              {received.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="mt-2 text-[10px] font-bold text-green-600 bg-green-50 inline-block px-2 py-0.5 rounded uppercase">Cash in Hand</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-yellow-500 hover:shadow-md transition-shadow">
          <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Receivable</h2>
          <div className="flex flex-col xl:flex-row xl:items-baseline xl:gap-2 overflow-hidden">
            <span className="text-xl xl:text-2xl font-bold text-gray-600 shrink-0">₹</span>
            <p className="text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 truncate">
              {receivable.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="mt-2 text-[10px] font-bold text-yellow-700 bg-yellow-50 inline-block px-2 py-0.5 rounded uppercase">Awaiting Payment</div>
        </div>
      </div>

      {/* What needs attention */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">What needs attention</h3>
          {!oldestUnpaid && <span className="text-[10px] font-black text-green-600 uppercase">You're all set!</span>}
        </div>
        <div className="p-6">
          {oldestUnpaid ? (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 uppercase text-xs tracking-tight">Oldest Pending Payment</h4>
                  <p className="text-sm text-gray-600 font-medium">
                    Invoice <span className="font-bold text-gray-900">#{oldestUnpaid.invoiceNumber}</span> for <span className="font-bold text-gray-900">{oldestUnpaidClient?.displayName || oldestUnpaidClient?.firstName || "Unknown Client"}</span>
                  </p>
                  <p className="text-[10px] font-bold text-red-500 uppercase mt-1">Status: {oldestUnpaid.status} • Issued on {oldestUnpaid.invoiceDate}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRecordPayment(true)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                >
                  Record Payment
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <div>
                <h4 className="font-black text-gray-900 uppercase text-xs tracking-tight">Perfectly on Track</h4>
                <p className="text-sm text-gray-600 font-medium">No pending payments right now. You’re up to date 👍</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-8 h-[1px] bg-gray-200"></span> Quick Actions
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <button
              onClick={() => onNavigate("invoices", "create-invoice")}
              className="flex flex-col items-center justify-center p-4 md:p-6 bg-white rounded-2xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all min-h-[100px]"
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter">New Invoice</span>
            </button>
            <button
              onClick={() => setShowRecordPayment(true)}
              className="flex flex-col items-center justify-center p-4 md:p-6 bg-white rounded-2xl border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all min-h-[100px]"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter">Paid Payment</span>
            </button>
            <button
              onClick={() => onNavigate("taxzone", "capture-expense")}
              className="flex flex-col items-center justify-center p-4 md:p-6 bg-white rounded-2xl border border-gray-200 hover:border-red-600 hover:bg-red-50 transition-all min-h-[100px]"
            >
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter">Capture Expense</span>
            </button>
            {/* Hidden on small mobile to reduce clutter, but shown on md+ */}
            <button
              onClick={() => onNavigate("calendar", "mark-availability")}
              className="hidden md:flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 hover:border-purple-600 hover:bg-purple-50 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter">Mark Busy</span>
            </button>
            <button
              onClick={() => onNavigate("customers", "create-client")}
              className="flex flex-col items-center justify-center p-4 md:p-6 bg-white rounded-2xl border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all min-h-[100px]"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter">New Client</span>
            </button>
          </div>
        </div>

        {/* Upcoming Work Block */}
        <div>
          <h3 className="text-sm font-black text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-8 h-[1px] bg-gray-200"></span> Upcoming Work
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Next 7 Days</span>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-3xl mb-2">🏖️</div>
                  <p className="text-sm font-bold text-gray-600">No shoots scheduled</p>
                  <p className="text-[10px] text-gray-600 uppercase mt-1">Time to market yourself!</p>
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  const eventDate = new Date(event.start || "");
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isTomorrow = new Date(today.getTime() + 86400000).toDateString() === eventDate.toDateString();
                  const isToday = today.toDateString() === eventDate.toDateString();

                  let dateLabel = event.start?.split("T")[0] || "";
                  if (isToday) dateLabel = "Today";
                  else if (isTomorrow) dateLabel = "Tomorrow";
                  else {
                    const diff = Math.ceil((eventDate.getTime() - today.getTime()) / 86400000);
                    dateLabel = `${diff} days later`;
                  }

                  return (
                    <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-gray-900 leading-tight">{event.title}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] font-bold text-blue-600 uppercase">{dateLabel}</p>
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-600">
                              {new Date(event.start || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onNavigate("calendar", `edit-event-${event.id}`)}
                            className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-gray-900 transition-colors shadow-sm border border-transparent hover:border-gray-100"
                            title="Edit Event"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-colors shadow-sm border border-transparent hover:border-red-100"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GST Snapshot Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">GST Snapshot</h3>
                <select
                  className="bg-transparent text-[10px] font-black text-blue-600 uppercase border-none focus:outline-none cursor-pointer"
                  value={selectedGSTFY}
                  onChange={(e) => setSelectedGSTFY(e.target.value)}
                >
                  <option value="2023-2024">FY 23-24</option>
                  <option value="2024-2025">FY 24-25</option>
                  <option value="2025-2026">FY 25-26</option>
                </select>
              </div>
              <div className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded uppercase">PAID ONLY</div>
            </div>
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <div className="flex flex-row md:flex-col justify-between items-center md:items-start border-b md:border-b-0 pb-4 md:pb-0">
                  <h4 className="text-[10px] font-black text-gray-600 uppercase">Received</h4>
                  <p className="text-xl md:text-2xl font-black text-gray-900">₹{totalReceived.toLocaleString("en-IN")}</p>
                </div>
                <div className="flex flex-row md:flex-col justify-between items-center md:items-start border-b md:border-b-0 pb-4 md:pb-0">
                  <h4 className="text-[10px] font-black text-gray-600 uppercase">GST Portion</h4>
                  <p className="text-xl md:text-2xl font-black text-red-600">₹{gstCollected.toLocaleString("en-IN")}</p>
                </div>
                <div className="flex flex-row md:flex-col justify-between items-center md:items-start">
                  <h4 className="text-[10px] font-black text-gray-600 uppercase">True Income</h4>
                  <p className="text-xl md:text-2xl font-black text-green-600">₹{usableIncome.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="mt-6 md:mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                <div className="hidden md:flex w-10 h-10 rounded-full bg-blue-100 items-center justify-center shrink-0">
                  <span className="text-xl">💡</span>
                </div>
                <div>
                  <h5 className="font-black text-blue-900 uppercase text-[10px] tracking-tight mb-1">Insight</h5>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    GST collected is <span className="font-bold">₹{gstCollected.toLocaleString("en-IN")}</span>. Keep this aside for the government. Your true earnings are <span className="font-bold">₹{usableIncome.toLocaleString("en-IN")}</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GST Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">GST Timeline</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {timeline.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs font-bold text-gray-600 uppercase">No GST collected yet</p>
              </div>
            ) : (
              timeline.map((entry, idx) => {
                const now = new Date();
                const isCurrentMonth = entry.date.getMonth() === now.getMonth() && entry.date.getFullYear() === now.getFullYear();

                return (
                  <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase">{entry.monthYear}</h4>
                        <p className="text-[10px] font-bold text-gray-600 uppercase mt-1">Status: {isCurrentMonth ? 'Ongoing' : 'Likely Payable'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-red-600">₹{entry.gst.toLocaleString("en-IN")}</p>
                        <p className="text-[8px] font-black text-gray-600 uppercase mt-0.5">GST Portion</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Record Payment</h3>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Select an invoice to update</p>
              </div>
              <button
                onClick={() => setShowRecordPayment(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >✕</button>
            </div>

            <div className="p-4 bg-white border-b border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by invoice # or client name..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                />
                <svg className="w-5 h-5 text-gray-600 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
              {paymentInvoices.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm font-bold text-gray-600">No unpaid invoices found</p>
                </div>
              ) : (
                paymentInvoices.map((inv) => {
                  const client = clients.find(c => c.id === (inv as any).client?.id);
                  const isAdvanceRec = (inv as any).isAdvanceReceived;
                  const balance = (inv.total || 0) - ((inv as any).advanceAmount || 0);

                  return (
                    <div key={inv.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-gray-900">{inv.invoiceNumber}</span>
                          <span className="text-[10px] bg-yellow-100 text-yellow-700 font-black px-1.5 py-0.5 rounded uppercase">{inv.status}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-600">{client?.displayName || client?.firstName || "Unknown"}</p>
                        <p className="text-lg font-black text-gray-900 mt-1">₹{inv.total?.toLocaleString()}</p>
                        {isAdvanceRec && (
                          <p className="text-[10px] font-black text-red-500 uppercase">Pending Balance: ₹{balance.toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const currentPaid = (inv as any).advanceAmount || 0;
                            const balance = (inv.total || 0) - currentPaid;
                            const amount = prompt(`Enter payment amount (Balance: ₹${balance.toLocaleString()}):`, balance.toString());
                            if (amount) {
                              const val = parseFloat(amount);
                              if (!isNaN(val)) {
                                const newTotalPaid = currentPaid + val;
                                let newStatus = inv.status;
                                if (newTotalPaid >= (inv.total || 0)) {
                                  newStatus = "Paid";
                                } else if (newTotalPaid > 0) {
                                  newStatus = "Partially Paid";
                                }
                                db.transact(db.tx.invoices[inv.id].update({
                                  advanceAmount: newTotalPaid,
                                  isAdvanceReceived: true,
                                  status: newStatus
                                }));
                              }
                            }
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-tight hover:bg-green-700 shadow-md shadow-green-100 transition-colors"
                        >
                          {isAdvanceRec ? "Record Next Payment" : "Record Payment"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
