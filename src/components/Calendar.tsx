
import { useState, useMemo } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { CalendarEvent } from "@/app/page";
import { syncToCalendars, ensureIcalUid } from "@/lib/calendarSync";

// Helper to get date string in local timezone (YYYY-MM-DD)
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Calendar({
  calendarEvents,
  userId,
  initiallyOpenModal,
  onModalClose,
  calendarSecret,
}: {
  calendarEvents: CalendarEvent[];
  userId: string;
  initiallyOpenModal?: boolean;
  onModalClose?: () => void;
  calendarSecret?: string;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"agenda" | "grid">("agenda");

  // Filter events: only show confirmed/tentative, and handle the new 'start' field
  const events = useMemo(() => {
    return calendarEvents
      .filter(e => e.status !== 'cancelled')
      .sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  }, [calendarEvents]);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const daysInMonth = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [month, year]);

  const startingDay = new Date(year, month, 1).getDay();

  function handleDateClick(date: Date, event?: CalendarEvent) {
    setSelectedDate(date);
    setEditingEvent(event || null);
    setIsModalOpen(true);
  }

  const icalUrl = calendarSecret
    ? `${window.location.origin}/api/ical/${userId}/${calendarSecret}`
    : null;

  return (
    <div className="space-y-16 py-12">
      {/* Editorial Header & Controls */}
      <section className="flex flex-col md:flex-row justify-between items-end gap-8 pb-12 border-b border-border-subtle">
        <div className="flex items-end gap-12">
          <h2 className="text-6xl font-serif text-foreground tracking-tighter">
            {currentDate.toLocaleString("default", { month: "long" })}
            <span className="text-muted text-2xl ml-4 font-light">{year}</span>
          </h2>
          <div className="flex gap-4 pb-2">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="flex gap-8 border-l border-border-subtle pl-12">
            <button
              onClick={() => setView("agenda")}
              className={`text-[10px] font-sans font-black uppercase tracking-[0.2em] transition-all hover:text-foreground ${view === 'agenda' ? 'text-foreground border-b border-foreground' : 'text-muted'}`}
            >Agenda</button>
            <button
              onClick={() => setView("grid")}
              className={`text-[10px] font-sans font-black uppercase tracking-[0.2em] transition-all hover:text-foreground ${view === 'grid' ? 'text-foreground border-b border-foreground' : 'text-muted'}`}
            >Monthly</button>
          </div>
          <button
            onClick={() => handleDateClick(new Date())}
            className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-foreground border border-foreground px-8 py-3 rounded-full hover:bg-foreground hover:text-background transition-all"
          >
            Schedule
          </button>
        </div>
      </section>

      {/* Main Content */}
      <section className="min-h-[600px]">
        {view === "agenda" ? (
          <div className="max-w-4xl space-y-24">
            {events.length === 0 ? (
              <p className="text-2xl font-serif text-muted italic py-12">No scheduled engagements for this period.</p>
            ) : (
              events.map(event => (
                <div
                  key={event.id}
                  onClick={() => handleDateClick(new Date(event.start!), event)}
                  className="group flex gap-24 items-start cursor-pointer border-b border-border-subtle pb-12 last:border-0"
                >
                  <div className="shrink-0 pt-2">
                    <span className="text-[10px] text-accent font-black uppercase tracking-[0.3em] block mb-2">
                      {new Date(event.start!).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-6xl font-serif tracking-tighter leading-none block">
                      {new Date(event.start!).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 space-y-4">
                    <h4 className="text-4xl font-serif tracking-tighter group-hover:text-accent transition-colors">
                      {event.title}
                    </h4>
                    <div className="flex gap-12 text-[10px] text-muted font-sans font-black uppercase tracking-[0.2em]">
                      <span>
                        {new Date(event.start!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —
                        {new Date(event.end!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={event.status === 'confirmed' ? "text-status-paid" : "text-status-pending"}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-7 border-t border-l border-border-subtle">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="border-r border-b border-border-subtle p-4 text-[10px] font-sans font-black text-muted uppercase tracking-[0.3em]">
                {d}
              </div>
            ))}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={i} className="border-r border-b border-border-subtle min-h-[160px] bg-background-alt/10" />
            ))}
            {daysInMonth.map(day => {
              const dateStr = getLocalDateString(day);
              const dayEvents = events.filter(e => e.start?.startsWith(dateStr));
              const isToday = dateStr === getLocalDateString(new Date());

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[160px] border-r border-b border-border-subtle p-4 transition-all cursor-pointer group hover:bg-[#A68A64]/5 ${isToday ? 'bg-[#FAF9F7]' : ''}`}
                >
                  <span className={`text-[11px] font-sans font-black tracking-widest ${isToday ? 'text-accent border-b border-accent' : 'text-muted'}`}>
                    {day.getDate()}
                  </span>
                  <div className="mt-4 space-y-2">
                    {dayEvents.map(e => (
                      <div
                        key={e.id}
                        className="text-[9px] font-sans font-black uppercase tracking-tight text-foreground truncate block bg-border-subtle/30 px-2 py-1"
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* iCal Subscription Footer */}
      {icalUrl && (
        <section className="pt-24 border-t border-border-subtle">
          <div className="max-w-2xl">
            <h4 className="text-[10px] text-muted font-sans font-black uppercase tracking-[0.3em] mb-8 text-center sm:text-left">External Integration</h4>
            <div className="flex flex-col sm:flex-row items-center gap-12 bg-foreground p-12 rounded-3xl text-background">
              <div className="flex-1 space-y-2">
                <h5 className="text-2xl font-serif tracking-tighter">Calendar Direct</h5>
                <p className="text-xs text-background/60 leading-relaxed">
                  Synchronize your creative schedule with local device repositories. Continuous mirroring ensures visibility across all endpoints.
                </p>
              </div>
              <button
                onClick={() => {
                  window.location.href = icalUrl.replace('http', 'webcal');
                }}
                className="text-[10px] font-sans font-black uppercase tracking-[0.2em] bg-background text-foreground px-8 py-4 rounded-full hover:bg-white transition-all whitespace-nowrap"
              >
                Configure Sync
              </button>
            </div>
          </div>
        </section>
      )}

      {isModalOpen && selectedDate && (
        <EventModal
          date={selectedDate}
          event={editingEvent}
          userId={userId}
          onClose={() => {
            setIsModalOpen(false);
            if (onModalClose) onModalClose();
          }}
        />
      )}
    </div>
  );
}

function EventModal({
  date,
  event,
  userId,
  onClose,
}: {
  date: Date;
  event: CalendarEvent | null;
  userId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(event?.title || "");
  const [status, setStatus] = useState<"tentative" | "confirmed" | "cancelled">(event?.status as any || "confirmed");

  // Local date state (YYYY-MM-DD)
  const [eventDateStr, setEventDateStr] = useState(getLocalDateString(date));

  const [startTime, setStartTime] = useState(event?.start ? new Date(event.start).toTimeString().slice(0, 5) : "09:00");
  const [endTime, setEndTime] = useState(event?.end ? new Date(event.end).toTimeString().slice(0, 5) : "18:00");

  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const baseDate = new Date(eventDateStr);
    const startISO = new Date(baseDate);
    const [sH, sM] = startTime.split(":");
    startISO.setHours(parseInt(sH), parseInt(sM), 0, 0);

    const endISO = new Date(baseDate);
    const [eH, eM] = endTime.split(":");
    endISO.setHours(parseInt(eH), parseInt(eM), 0, 0);

    const eventId = event?.id || id();
    const eventData = {
      title: title || "New Shoot",
      start: startISO.toISOString(),
      end: endISO.toISOString(),
      status,
      icalUid: ensureIcalUid(event || {}),
      googleEventId: event?.googleEventId,
      date: eventDateStr,
    };

    try {
      const { googleEventId } = await syncToCalendars({ id: eventId, ...eventData }, event ? 'update' : 'create');
      if (googleEventId) eventData.googleEventId = googleEventId;
    } catch (err) {
      console.error("Mirroring failed:", err);
    }

    if (!event) {
      db.transact([
        db.tx.calendarEvents[eventId].update(eventData),
        db.tx.calendarEvents[eventId].link({ owner: userId })
      ]);
    } else {
      db.transact(db.tx.calendarEvents[eventId].update(eventData));
    }

    onClose();
  }

  async function handleDelete() {
    if (!event) return;
    if (confirm("Permanently remove this event?")) {
      await syncToCalendars(event as any, 'delete');
      db.transact(db.tx.calendarEvents[event.id].delete());
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xl flex justify-center items-center z-[100] p-12 animate-in slide-in-from-bottom duration-300">
      <div className="bg-background border border-border-subtle rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-12 flex justify-between items-start">
          <div>
            <h3 className="text-4xl font-serif text-foreground tracking-tighter mb-4">
              {event ? 'Reformulate' : 'Chronicle'}
            </h3>
            <p className="text-[10px] text-muted font-sans font-black uppercase tracking-[0.2em]">Engagement parameters</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <svg className="w-8 h-8 font-thin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-12 pb-12 space-y-12">
          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-[0.3em] block mb-4">Identification</label>
            <input
              type="text"
              className="w-full text-2xl font-serif tracking-tighter border-b border-border-subtle focus:border-foreground py-4"
              placeholder="THE SHOOT NAME"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-12">
            <div>
              <label className="text-[9px] font-black text-muted uppercase tracking-[0.3em] block mb-4">Date</label>
              <input
                type="date"
                className="w-full text-sm font-sans uppercase tracking-widest border-b border-border-subtle focus:border-foreground"
                value={eventDateStr}
                onChange={e => setEventDateStr(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-muted uppercase tracking-[0.3em] block mb-4">Start</label>
                <input
                  type="time"
                  className="w-full text-sm font-sans border-b border-border-subtle focus:border-foreground"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-muted uppercase tracking-[0.3em] block mb-4">End</label>
                <input
                  type="time"
                  className="w-full text-sm font-sans border-b border-border-subtle focus:border-foreground"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-[0.3em] block mb-8 text-center md:text-left">Invoice Status</label>
            <div className="flex gap-12 justify-center md:justify-start">
              {["confirmed", "tentative"].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s as any)}
                  className={`text-[10px] font-sans font-black uppercase tracking-[0.2em] transition-all hover:text-foreground ${status === s ? "text-foreground border-b border-foreground" : "text-muted"
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-12 border-t border-border-subtle">
            {event && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-[9px] font-black uppercase tracking-widest text-status-overdue hover:opacity-50 transition-opacity"
              >
                Void Engagement
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="text-[11px] font-sans font-black uppercase tracking-[0.4em] bg-foreground text-background px-12 py-6 rounded-full hover:bg-black transition-all shadow-xl shadow-foreground/10"
            >
              {isSaving ? "MANIFESTING..." : event ? "REFORMULATE" : "CHRONICLE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
