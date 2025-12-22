
import { useState } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { CalendarEvent } from "@/app/page";
import { GoogleCalendarAPI } from "@/lib/googleCalendar";

// Simple toast notification helper
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Helper to get date string in local timezone
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
}: {
  calendarEvents: CalendarEvent[];
  userId: string;
  initiallyOpenModal?: boolean;
  onModalClose?: () => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  useState(() => {
    if (initiallyOpenModal) {
      const today = new Date();
      setSelectedDate(today);
      const todayStr = getLocalDateString(today);
      const event = calendarEvents.find(e => e.date === todayStr);
      setEditingEvent(event || null);
      setIsModalOpen(true);
    }
  });

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const daysInMonth = [];
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    daysInMonth.push(new Date(year, month, i));
  }

  const startingDay = firstDayOfMonth.getDay();

  function getEventForDate(date: Date) {
    const dateString = getLocalDateString(date);
    return calendarEvents.find((e) => e.date === dateString);
  }

  function handleDateClick(date: Date) {
    const event = getEventForDate(date);
    setSelectedDate(date);
    setEditingEvent(event || null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedDate(null);
    setEditingEvent(null);
    if (onModalClose) onModalClose();
  }

  const [mobileView, setMobileView] = useState<"agenda" | "grid">("agenda");

  // Filter events for the current month/view
  const upcomingEvents = calendarEvents
    .filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 md:p-6 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h2 className="text-sm md:text-xl font-black text-gray-900 uppercase tracking-widest">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>

        {/* View Toggle for Mobile */}
        <div className="flex md:hidden bg-gray-200 p-1 rounded-xl w-full">
          <button
            onClick={() => setMobileView("agenda")}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mobileView === "agenda" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Agenda
          </button>
          <button
            onClick={() => setMobileView("grid")}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mobileView === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Grid
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Desktop Grid or Mobile Grid (if toggled) */}
        <div className={`${mobileView === "grid" ? "block" : "hidden md:block"}`}>
          <div className="grid grid-cols-7 gap-1 md:gap-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center font-black text-gray-400 text-[10px] uppercase tracking-widest py-2">
                {day}
              </div>
            ))}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50 aspect-square md:aspect-auto rounded-xl" />
            ))}
            {daysInMonth.map((day) => {
              const event = getEventForDate(day);
              const status = event ? event.status : "Available";
              const isToday = getLocalDateString(day) === getLocalDateString(new Date());

              return (
                <div
                  key={day.toString()}
                  onClick={() => handleDateClick(day)}
                  className={`relative p-2 md:p-4 aspect-square md:aspect-auto flex flex-col items-center justify-center cursor-pointer rounded-xl border transition-all active:scale-95 ${status === "Booked"
                    ? "bg-red-50 text-red-700 border-red-100"
                    : isToday
                      ? "bg-blue-50 text-blue-700 border-blue-100"
                      : "bg-white text-gray-900 border-gray-100 hover:border-gray-300"
                    }`}
                >
                  <div className={`text-sm md:text-lg font-black ${isToday ? "text-blue-600" : ""}`}>{day.getDate()}</div>
                  {status === "Booked" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 md:mt-1"></div>
                  )}
                  {event?.syncToGoogle && status === "Booked" && (
                    <span className="absolute top-1 right-1 text-[8px] md:text-[10px]">📅</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Agenda View */}
        <div className={`${mobileView === "agenda" ? "block md:hidden" : "hidden"}`}>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">No shoots this month</p>
                <button
                  onClick={() => handleDateClick(new Date())}
                  className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 transform grow-0"
                >
                  Block a Date
                </button>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleDateClick(new Date(event.date))}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="flex flex-col items-center justify-center w-14 h-14 bg-gray-50 rounded-xl shrink-0">
                    <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">
                      {new Date(event.date).toLocaleString("default", { month: "short" })}
                    </span>
                    <span className="text-xl font-black text-gray-900 leading-none">
                      {new Date(event.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-gray-900 uppercase truncate leading-tight">
                      {event.title || "Quick Blocked"}
                    </h4>
                    <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mt-1">
                      {event.callTime && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          {event.callTime}
                        </span>
                      )}
                      <span>{event.duration}</span>
                    </p>
                  </div>
                  <div className="w-1.5 h-10 rounded-full bg-red-500"></div>
                </div>
              ))
            )}

            {upcomingEvents.length > 0 && (
              <button
                onClick={() => handleDateClick(new Date())}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-gray-900 hover:text-gray-900 transition-all"
              >
                + Block Another Date
              </button>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && selectedDate && (
        <EventModal
          date={selectedDate}
          event={editingEvent}
          userId={userId}
          onClose={closeModal}
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
  const dateString = getLocalDateString(date);
  const [status, setStatus] = useState(event?.status || "Available");
  const [title, setTitle] = useState(event?.title || "");
  const [duration, setDuration] = useState(event?.duration || "");
  const [callTime, setCallTime] = useState(event?.callTime || "");
  const [syncToGoogle, setSyncToGoogle] = useState(event?.syncToGoogle || false);
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const eventId = event?.id || id();
    const eventData = {
      date: dateString,
      status,
      title: title.trim() || undefined,
      duration: duration.trim() || undefined,
      callTime: callTime.trim() || undefined,
      syncToGoogle,
      googleEventId: event?.googleEventId,
    };

    if (status === "Booked" && title.trim()) {
      if (syncToGoogle) {
        setIsSyncing(true);
        try {
          const result = await syncEventToGoogle(eventData, event?.googleEventId);
          if (result.success) {
            (eventData as any).googleEventId = result.googleEventId;
            showToast(`Event synced to Google Calendar`, 'success');
          } else {
            showToast(`Failed to sync: ${result.error}`, 'error');
          }
        } catch (error) {
          showToast('Failed to sync to Google Calendar', 'error');
        } finally {
          setIsSyncing(false);
        }
      }
    }

    const isNew = !event;
    if (isNew) {
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
    if (confirm("Are you sure you want to delete this event?")) {
      db.transact(db.tx.calendarEvents[event.id].delete());
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="bg-white border-b p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" value="Available" checked={status === "Available"} onChange={(e) => setStatus(e.target.value)} className="mr-2" />
                <span className="text-green-700">Available</span>
              </label>
              <label className="flex items-center">
                <input type="radio" value="Booked" checked={status === "Booked"} onChange={(e) => setStatus(e.target.value)} className="mr-2" />
                <span className="text-red-700">Booked</span>
              </label>
            </div>
          </div>

          {status === "Booked" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Shoot Title</label>
                <input type="text" className="border p-2 rounded-md w-full" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration</label>
                <input type="text" className="border p-2 rounded-md w-full" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div className="border-t pt-4">
                <label className="flex items-center">
                  <input type="checkbox" checked={syncToGoogle} onChange={(e) => setSyncToGoogle(e.target.checked)} className="mr-3 w-5 h-5" />
                  <span>Sync to Google Calendar</span>
                </label>
              </div>
            </>
          )}

          <div className="flex justify-between gap-3 border-t pt-4">
            {event && <button type="button" onClick={handleDelete} className="text-red-500">Delete</button>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-6 py-2 border rounded-md">Cancel</button>
              <button type="submit" disabled={isSyncing} className="px-6 py-2 bg-gray-900 text-white rounded-md">
                {isSyncing ? "Syncing..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

async function syncEventToGoogle(eventData: any, existingId?: string): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
  const googleEvent = {
    summary: eventData.title,
    start: { date: eventData.date },
    end: { date: eventData.date },
  };
  if (existingId) return await GoogleCalendarAPI.updateEvent(existingId, googleEvent);
  return await GoogleCalendarAPI.createEvent(googleEvent);
}
