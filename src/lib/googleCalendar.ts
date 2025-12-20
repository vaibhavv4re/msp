/**
 * Google Calendar Integration Helper
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to InstantDB Dashboard (https://instantdb.com/dash)
 * 2. Navigate to your app → Auth → Google OAuth
 * 3. Add the following scope to request Calendar access:
 *    - https://www.googleapis.com/auth/calendar.events
 * 4. After OAuth, store the access token in localStorage
 * 
 * NOTE: InstantDB handles OAuth flow, but you need to extract and store
 * the Google access token from the OAuth response for API calls.
 */

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: { date: string } | { dateTime: string; timeZone?: string };
  end: { date: string } | { dateTime: string; timeZone?: string };
  reminders?: {
    useDefault: boolean;
  };
}

export class GoogleCalendarAPI {
  private static getAccessToken(): string | null {
    return localStorage.getItem("google_access_token");
  }

  static setAccessToken(token: string): void {
    localStorage.setItem("google_access_token", token);
  }

  static clearAccessToken(): void {
    localStorage.removeItem("google_access_token");
  }

  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && token !== '';
  }

  static async createEvent(eventData: GoogleCalendarEvent): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const token = this.getAccessToken();
    
    if (!token) {
      return { success: false, error: "Not authenticated with Google Calendar" };
    }

    try {
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || "Failed to create event" };
      }

      const data = await response.json();
      return { success: true, eventId: data.id };
    } catch (error: any) {
      console.error("Error creating Google Calendar event:", error);
      return { success: false, error: error.message };
    }
  }

  static async updateEvent(
    eventId: string,
    eventData: GoogleCalendarEvent
  ): Promise<{ success: boolean; error?: string }> {
    const token = this.getAccessToken();
    
    if (!token) {
      return { success: false, error: "Not authenticated with Google Calendar" };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || "Failed to update event" };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error updating Google Calendar event:", error);
      return { success: false, error: error.message };
    }
  }

  static async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    const token = this.getAccessToken();
    
    if (!token) {
      console.error('❌ No Google access token found');
      return { success: false, error: "Not authenticated with Google Calendar" };
    }

    console.log('🔑 Token found, attempting to delete event:', eventId);

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('📡 Delete response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = "Failed to delete event";
        try {
          const error = await response.json();
          errorMessage = error.message || error.error?.message || errorMessage;
          console.error('❌ Google Calendar API error:', error);
        } catch (e) {
          // Response might not be JSON
          errorMessage = `${response.status} ${response.statusText}`;
        }
        return { success: false, error: errorMessage };
      }

      console.log('✅ Event deleted successfully from Google Calendar');
      return { success: true };
    } catch (error: any) {
      console.error("❌ Error deleting Google Calendar event:", error);
      return { success: false, error: error.message };
    }
  }
}
