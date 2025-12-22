
import { useState } from "react";
import { Invoice, Client, CalendarEvent } from "@/app/page";
import { db } from "@/lib/db";

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

function calculateGSTMetrics(invoices: Invoice[]) {
  const paidInvoices = invoices.filter(inv => inv.status === "Paid");

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
  onNavigate
}: {
  invoices: Invoice[];
  clients: Client[];
  calendarEvents: CalendarEvent[];
  onNavigate: (view: any, modal?: string) => void;
}) {
  const [context, setContext] = useState<TimeContext>("this_month");
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");

  const { receivable, received, billed } = calculateTotals(invoices, context);
  const { totalReceived, gstCollected, usableIncome, timeline } = calculateGSTMetrics(invoices);

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

  return (
    <div className="space-y-24 py-12">
      {/* Editorial Header */}
      <section className="flex flex-col md:flex-row justify-between items-end gap-8 pb-12 border-b border-border-subtle">
        <div className="max-w-2xl">
          <h2 className="text-6xl font-serif text-foreground tracking-tighter mb-4">The Overview</h2>
          <p className="text-muted text-sm uppercase tracking-[0.2em] leading-relaxed">
            Overview of your earnings and upcoming events. <br />
            An intentional snapshot of your creative enterprise.
          </p>
        </div>
        <div className="flex gap-8 border-l border-border-subtle pl-12">
          {(["this_month", "last_month", "all_time"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setContext(t)}
              className={`text-[10px] font-sans font-black uppercase tracking-[0.2em] transition-all hover:text-foreground ${context === t ? "text-foreground border-b border-foreground" : "text-muted"
                }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </section>

      {/* Primordial Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-24">
        {[
          { label: "Billed", value: billed, accent: "text-foreground" },
          { label: "Received", value: received, accent: "text-status-paid" },
          { label: "Receivable", value: receivable, accent: "text-status-pending" },
        ].map((metric) => (
          <div key={metric.label} className="group cursor-default">
            <h4 className="text-[10px] text-muted font-sans font-black uppercase tracking-[0.3em] mb-4">
              {metric.label}
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-serif text-muted">₹</span>
              <p className={`text-6xl font-serif tracking-tighter ${metric.accent} group-hover:opacity-70 transition-opacity`}>
                {metric.value.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* GST Snapshot - Less boxy, more narrative */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-24">
        <div className="space-y-12">
          <div className="pb-8 border-b border-border-subtle">
            <h3 className="text-[10px] text-muted font-sans font-black uppercase tracking-[0.3em] mb-12">GST Snapshot</h3>
            <div className="flex justify-between items-center mb-8">
              <span className="text-sm font-sans uppercase tracking-widest text-muted">GST Collected</span>
              <span className="text-2xl font-serif text-status-overdue">₹{gstCollected.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-sans uppercase tracking-widest text-foreground">Retained Income</span>
              <span className="text-2xl font-serif text-status-paid">₹{usableIncome.toLocaleString("en-IN")}</span>
            </div>
          </div>
          <p className="text-xs text-muted leading-relaxed max-w-sm italic">
            "Tax represents the societal dividend of your craft. Reserve the allocated portion for statutory obligations while focusing on the true valuation of your output."
          </p>
        </div>

        <div className="space-y-8 bg-[#f5f3f0] p-12 rounded-2xl">
          <h3 className="text-[10px] text-muted font-sans font-black uppercase tracking-[0.3em] mb-8">Recent GST History</h3>
          <div className="space-y-6">
            {timeline.slice(0, 3).map((entry, idx) => (
              <div key={idx} className="flex justify-between items-center group">
                <span className="text-sm font-sans uppercase tracking-widest group-hover:text-foreground transition-colors">{entry.monthYear}</span>
                <span className="text-sm font-serif text-muted">₹{entry.gst.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Engagements & Quick Context */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-24">
        <div className="lg:col-span-2 space-y-12">
          <h3 className="text-[10px] text-muted font-sans font-black uppercase tracking-[0.3em]">Quick Directives</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <button
              onClick={() => onNavigate("invoices", "create-invoice")}
              className="group p-12 border border-border-subtle rounded-2xl text-left hover:bg-foreground hover:border-foreground transition-all duration-300"
            >
              <h4 className="text-sm font-serif group-hover:text-background transition-colors mb-2">Issue Invoice</h4>
              <p className="text-[10px] text-muted uppercase tracking-widest group-hover:text-background/60">New billing record</p>
            </button>
            <button
              onClick={() => onNavigate("customers", "create-client")}
              className="group p-12 border border-border-subtle rounded-2xl text-left hover:bg-foreground hover:border-foreground transition-all duration-300"
            >
              <h4 className="text-sm font-serif group-hover:text-background transition-colors mb-2">Onboard Client</h4>
              <p className="text-[10px] text-muted uppercase tracking-widest group-hover:text-background/60">Creative collaboration</p>
            </button>
          </div>
        </div>

        <div className="space-y-12">
          <h3 className="text-[10px] text-muted font-sans font-black uppercase tracking-[0.3em]">Upcoming</h3>
          <div className="space-y-8">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-muted italic">The slate is pristine. No upcoming shoots detected.</p>
            ) : (
              upcomingEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="group">
                  <span className="text-[9px] text-accent font-black uppercase tracking-widest mb-1 block">
                    {new Date(event.start || "").toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <h4 className="text-sm font-serif group-hover:translate-x-1 transition-transform">{event.title}</h4>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Record Payment (Floating/Overlay) */}
      <div className="pt-24 border-t border-border-subtle flex justify-center">
        <button
          onClick={() => setShowRecordPayment(true)}
          className="text-[11px] font-sans font-black uppercase tracking-[0.4em] text-foreground border border-foreground px-12 py-6 rounded-full hover:bg-foreground hover:text-background transition-all"
        >
          Reconcile Payments
        </button>
      </div>

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl flex items-center justify-center z-[100] p-12 animate-in fade-in duration-300">
          <div className="bg-background border border-border-subtle rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-12 flex justify-between items-start">
              <div>
                <h3 className="text-4xl font-serif text-foreground tracking-tighter mb-4">Reconcile</h3>
                <p className="text-[10px] text-muted font-sans font-black uppercase tracking-[0.2em]">Select an account for payment</p>
              </div>
              <button
                onClick={() => setShowRecordPayment(false)}
                className="text-muted hover:text-foreground transition-colors"
              >
                <svg className="w-8 h-8 font-thin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="px-12 pb-8">
              <input
                type="text"
                placeholder="SEARCH ACCOUNTS / INVOICES"
                className="w-full text-sm font-sans tracking-widest uppercase placeholder:text-muted/30 focus:border-foreground"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-12 pb-12 space-y-4">
              {paymentInvoices.length === 0 ? (
                <p className="text-sm italic text-muted text-center py-24">All accounts are currently settled.</p>
              ) : (
                paymentInvoices.map((inv) => {
                  const client = clients.find(c => c.id === (inv as any).client?.id);
                  return (
                    <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between py-6 border-b border-border-subtle group">
                      <div>
                        <span className="text-[9px] font-sans font-black text-accent uppercase tracking-widest">{inv.invoiceNumber}</span>
                        <h4 className="text-xl font-serif mt-1">{client?.displayName || client?.firstName || "Unknown"}</h4>
                      </div>
                      <div className="flex items-center gap-12 mt-4 md:mt-0">
                        <span className="text-xl font-serif">₹{inv.total?.toLocaleString()}</span>
                        <button
                          onClick={() => {
                            const val = prompt(`Confirm payment amount for ₹${inv.total?.toLocaleString()}:`, (inv.total || 0).toString());
                            if (val) {
                              const amount = parseFloat(val);
                              db.transact(db.tx.invoices[inv.id].update({
                                advanceAmount: amount,
                                isAdvanceReceived: true,
                                status: amount >= (inv.total || 0) ? "Paid" : "Partially Paid"
                              }));
                            }
                          }}
                          className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-foreground hover:bg-foreground hover:text-background border border-foreground px-6 py-3 rounded-full transition-all"
                        >
                          Settle
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
