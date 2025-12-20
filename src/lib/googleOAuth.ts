/**
 * Google OAuth for Calendar Access
 * 
 * This is separate from InstantDB auth and only handles Google Calendar permissions.
 * You'll need to create a Google OAuth client specifically for this.
 */

// You'll need to create these in Google Cloud Console
// Go to: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = '454210277648-smnnidivmjdbniqk8nh9mgbcf1sk6ane.apps.googleusercontent.com'; // Your client ID
// For implicit flow, redirect URI should be just the origin (no path)
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

export class GoogleCalendarAuth {
  /**
   * Start OAuth flow for Google Calendar
   */
  static requestCalendarAccess() {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `include_granted_scopes=true&` +
      `state=calendar_auth`;
    
    // Open popup for OAuth
    const width = 500;
    const height = 600;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    const popup = window.open(
      authUrl,
      'Google Calendar Authorization',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Listen for the OAuth callback
    return new Promise<string>((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'GOOGLE_CALENDAR_AUTH') {
          window.removeEventListener('message', handleMessage);
          if (event.data.token) {
            resolve(event.data.token);
          } else {
            reject(new Error('Failed to get access token'));
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          reject(new Error('OAuth popup was closed'));
        }
      }, 1000);
    });
  }
  
  /**
   * Alternative: Use implicit flow with redirect (simpler)
   */
  static requestCalendarAccessRedirect() {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `include_granted_scopes=true&` +
      `state=calendar_auth`;
    
    window.location.href = authUrl;
  }
  
  /**
   * Handle the OAuth callback (extract token from URL)
   */
  static handleCallback(): string | null {
    const hash = window.location.hash;
    if (!hash) return null;
    
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const state = params.get('state');
    
    if (state === 'calendar_auth' && accessToken) {
      // Clear the hash from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return accessToken;
    }
    
    return null;
  }
}
