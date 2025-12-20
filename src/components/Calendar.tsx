
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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          &lt; Previous
        </button>
        <h2 className="text-xl font-bold">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Next &gt;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center font-bold text-sm py-2">
            {day}
          </div>
        ))}
        {Array.from({ length: startingDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {daysInMonth.map((day) => {
          const event = getEventForDate(day);
          const status = event ? event.status : "Available";
          const hasDetails = event?.title && status === "Booked";

          return (
            <div
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              className={`p-3 text-center cursor-pointer rounded-lg border-2 transition-all hover:shadow-md ${status === "Booked"
                  ? "bg-red-500 text-white border-red-600"
                  : "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                }`}
            >
              <div className="font-semibold">{day.getDate()}</div>
              {hasDetails && (
                <div className="text-xs mt-1 truncate" title={event.title}>
                  {event.title}
                </div>
              )}
              {event?.syncToGoogle && status === "Booked" && (
                <div className="text-xs mt-1">📅</div>
              )}
            </div>
          );
        })}
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
