
import { useState, useMemo, useEffect } from "react";
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
  initiallyOpenModal?: string | null;
  onModalClose?: () => void;
  calendarSecret?: string;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"agenda" | "grid">("agenda");

  // Handle initial modal opening
  useEffect(() => {
    if (!initiallyOpenModal) return;

    if (initiallyOpenModal === "mark-availability") {
      setSelectedDate(new Date());
      setEditingEvent(null);
      setIsModalOpen(true);
      onModalClose?.();
    } else if (initiallyOpenModal.startsWith("edit-event-")) {
      const eventId = initiallyOpenModal.replace("edit-event-", "");
      const event = calendarEvents.find(e => e.id === eventId);
      if (event && event.start) {
        setSelectedDate(new Date(event.start));
        setEditingEvent(event);
        setIsModalOpen(true);
        onModalClose?.();
      }
    }
  }, [initiallyOpenModal, calendarEvents, onModalClose]);

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
    <div className="flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h2 className="text-sm md:text-xl font-black text-gray-900 uppercase tracking-widest">
              {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-xl flex-1 md:flex-none">
              <button
                onClick={() => setView("agenda")}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${view === 'agenda' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              >Agenda</button>
              <button
                onClick={() => setView("grid")}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              >Grid</button>
            </div>
            <button
              onClick={() => handleDateClick(new Date())}
              className="bg-gray-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
            >
              + New Event
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {view === "agenda" ? (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-100 p-12 text-center">
              <p className="text-xs font-black text-gray-600 uppercase tracking-widest">No work scheduled</p>
            </div>
          ) : (
            events.map(event => (
              <div
                key={event.id}
                onClick={() => handleDateClick(new Date(event.start!), event)}
                className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-[0.99] ${event.status === 'confirmed' ? 'border-gray-200 shadow-sm' : 'border-dashed border-gray-300 bg-gray-50/30'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${event.status === 'confirmed' ? 'bg-gray-900 text-white' : 'bg-white border-2 border-gray-100 text-gray-600'
                    }`}>
                    <span className="text-[10px] font-black uppercase leading-none mb-1">
                      {new Date(event.start!).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-xl font-black leading-none">{new Date(event.start!).getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-gray-900 uppercase text-sm tracking-tight">{event.title}</h4>
                    <p className="text-[10px] font-bold text-gray-600 uppercase mt-1">
                      {new Date(event.start!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                      {new Date(event.end!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${event.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {event.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm">
          <div className="grid grid-cols-7 gap-1 md:gap-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest py-2">{d}</div>
            ))}
            {Array.from({ length: startingDay }).map((_, i) => <div key={i} />)}
            {daysInMonth.map(day => {
              const dateStr = getLocalDateString(day);
              const dayEvents = events.filter(e => e.start?.startsWith(dateStr));
              const isToday = dateStr === getLocalDateString(new Date());

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[100px] rounded-xl flex flex-col items-start p-2 relative border transition-all cursor-pointer ${isToday ? 'border-blue-500 bg-blue-50/50' : 'border-gray-50 hover:border-gray-200'
                    }`}
                >
                  <span className={`text-xs font-black mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{day.getDate()}</span>
                  <div className="flex flex-col gap-1 w-full overflow-hidden">
                    {dayEvents.map(e => (
                      <div
                        key={e.id}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate w-full ${e.status === 'confirmed' ? 'bg-gray-900 text-white' : 'bg-blue-100 text-blue-700'
                          }`}
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* iCal Subscription Footer */}
      {icalUrl && (
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-blue-900 uppercase">Subscribe to your Calendar</h4>
              <p className="text-[10px] font-bold text-blue-700 uppercase mt-1">Sync your MSP events directly to your iPhone or Mac calendar.</p>
            </div>
            <button
              onClick={() => {
                window.location.href = icalUrl.replace('http', 'webcal');
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
            >
              Add to My Calendar
            </button>
          </div>
        </div>
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

  // Default times: 09:00 - 18:00
  const defaultStart = new Date(date);
  defaultStart.setHours(9, 0, 0, 0);
  const defaultEnd = new Date(date);
  defaultEnd.setHours(18, 0, 0, 0);

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

    // Mirror to Google Calendar
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
    if (confirm("Permanently remove this event from all calendars?")) {
      await syncToCalendars(event as any, 'delete');
      db.transact(db.tx.calendarEvents[event.id].delete());
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
            {event ? 'Edit Event' : 'New Event'}
          </h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Shoot Title</label>
            <input
              type="text"
              className="w-full border-b-2 border-gray-100 focus:border-gray-900 outline-none py-2 text-lg font-black uppercase transition-all"
              placeholder="e.g. Brand X Shoot"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Date</label>
            <input
              type="date"
              className="w-full bg-gray-50 rounded-xl p-3 text-sm font-black outline-none"
              value={eventDateStr}
              onChange={e => setEventDateStr(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Start</label>
              <input
                type="time"
                className="w-full bg-gray-50 rounded-xl p-3 text-sm font-black outline-none"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">End</label>
              <input
                type="time"
                className="w-full bg-gray-50 rounded-xl p-3 text-sm font-black outline-none"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Status</label>
            <div className="flex gap-2">
              {["confirmed", "tentative"].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s as any)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === s ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {event && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-gray-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-gray-200"
            >
              {isSaving ? "Syncing..." : event ? "Update Schedule" : "Create Shoot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
