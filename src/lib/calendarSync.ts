
import { db } from "./db";
import { GoogleCalendarAPI, GoogleCalendarEvent } from "./googleCalendar";
import { AppSchema } from "@/instant.schema";
import { id as generateId, InstaQLEntity } from "@instantdb/react";

export type AppEvent = InstaQLEntity<AppSchema, "calendarEvents">;

const SOURCE_TAG = "MSP-Business-Suite";

/**
 * Syncs an app event to all connected external calendars.
 * This is an authoritative sync: the app is the source of truth.
 */
export async function syncToCalendars(
    event: Partial<AppEvent> & { id: string },
    action: 'create' | 'update' | 'delete'
): Promise<{ googleEventId?: string; error?: string }> {

    if (action === 'delete') {
        if (event.googleEventId) {
            await GoogleCalendarAPI.deleteEvent(event.googleEventId);
        }
        return { success: true } as any;
    }

    // Only sync if it's a work event (status confirmed or tentative)
    if (event.status === 'cancelled') {
        if (event.googleEventId) {
            await GoogleCalendarAPI.deleteEvent(event.googleEventId);
            return { googleEventId: undefined };
        }
        return { success: true } as any;
    }

    const googleEvent: GoogleCalendarEvent = {
        summary: event.title || "MSP Work Event",
        start: { dateTime: event.start! },
        end: { dateTime: event.end! },
        extendedProperties: {
            private: {
                source: SOURCE_TAG,
                appEventId: event.id
            }
        } as any
    };

    if (action === 'create' || !event.googleEventId) {
        const result = await GoogleCalendarAPI.createEvent(googleEvent);
        return { googleEventId: result.eventId, error: result.error };
    } else {
        const result = await GoogleCalendarAPI.updateEvent(event.googleEventId, googleEvent);
        return { googleEventId: event.googleEventId, error: result.error };
    }
}

/**
 * Helper to ensure an event has an icalUid.
 */
export function ensureIcalUid(event: Partial<AppEvent>): string {
    return event.icalUid || `msp-${generateId()}`;
}
