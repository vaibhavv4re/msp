"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { AppSchema } from "@/instant.schema";
import { id, InstaQLEntity } from "@instantdb/react";
import { Dashboard } from "@/components/Dashboard";
import { Invoices } from "@/components/Invoices";
import { Calendar } from "@/components/Calendar";
import { Customers } from "@/components/Customers";
import { Services } from "@/components/Services";
import { Settings } from "@/components/Settings";
import { TaxZone } from "@/components/TaxZone";
import { GoogleCalendarAPI } from "@/lib/googleCalendar";
import { GoogleCalendarAuth } from "@/lib/googleOAuth";

export type Client = InstaQLEntity<AppSchema, "clients"> & { invoices: Invoice[] };
export type Invoice = InstaQLEntity<AppSchema, "invoices"> & {
  client?: Client;
  lineItems: LineItem[];
  business?: Business;
};
export type LineItem = InstaQLEntity<AppSchema, "lineItems">;
export type CalendarEvent = InstaQLEntity<AppSchema, "calendarEvents">;
export type Business = InstaQLEntity<AppSchema, "businesses">;

type View = "dashboard" | "invoices" | "calendar" | "customers" | "services" | "taxzone" | "settings";

function LoginPage() {
  const handleGoogleLogin = () => {
    // Get the current origin without trailing slash
    const redirectURL = window.location.origin;

    const url = db.auth.createAuthorizationURL({
      clientName: "google-web",
      redirectURL: redirectURL,
    });
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MSP
          </h1>
          <p className="text-gray-600">
            Manage your invoices, customers, and calendar
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Secure authentication powered by Google</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [modalToOpen, setModalToOpen] = useState<string | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { isLoading, user, error: authError } = db.useAuth();

  // Handle OAuth callback and extract Google access token
  useEffect(() => {
    // Check for Google Calendar OAuth callback first (separate from InstantDB)
    const calendarToken = GoogleCalendarAuth.handleCallback();
    if (calendarToken) {
      console.log('🎉 Google Calendar authorized! Token received.');
      GoogleCalendarAPI.setAccessToken(calendarToken);
      alert('Google Calendar connected successfully! You can now sync events.');
      return;
    }

    if (user) {
      // Log user object to help debug token location
      console.log('User authenticated:', { email: user.email, id: user.id });

      // Check if there's an OAuth code in the URL (from Google redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const isOAuthRedirect = urlParams.get('_instant_oauth_redirect');

      if (code && isOAuthRedirect) {
        console.log('✅ OAuth callback detected');
        console.log('📋 Complete user object:', user);

        // Try to extract access token from various possible locations in user object
        const userAny = user as any;
        const possibleToken =
          userAny?.accessToken ||
          userAny?.access_token ||
          userAny?.google?.accessToken ||
          userAny?.google?.access_token ||
          userAny?.tokens?.access_token ||
          userAny?.oauth?.access_token ||
          userAny?.refreshToken;

        if (possibleToken) {
          console.log('🎉 Found access token! Storing for Google Calendar');
          GoogleCalendarAPI.setAccessToken(possibleToken);
          localStorage.removeItem('token_warning_shown');
          alert('Google Calendar connected successfully! You can now sync events.');
        } else {
          console.warn('⚠️ OAuth successful but no access token found in user object');
          console.log('Please check the console for user object details and use the Calendar Sync button in the navbar to manually add a token.');
        }

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user]);


  const { isLoading: dataLoading, error, data } = db.useQuery({
    clients: { invoices: {} },
    invoices: { lineItems: {}, client: {}, business: {} },
    calendarEvents: {},
    $users: {},
    services: {},
    taxes: {},
    termsTemplates: {},
    businesses: {},
    expenses: {},
    tdsEntries: {
      client: {}
    }
  });

  // Extract data safely
  const clients = data?.clients || [];
  const invoices = data?.invoices || [];
  const calendarEvents = data?.calendarEvents || [];
  const services = data?.services || [];
  const taxes = data?.taxes || [];
  const termsTemplates = data?.termsTemplates || [];
  const businesses = data?.businesses || [];
  const expenses = data?.expenses || [];
  const tdsEntries = data?.tdsEntries || [];
  const $users = data?.$users || [];

  const currentUser = $users.find((u: any) => u.id === user?.id);

  // Generate calendar secret if missing
  useEffect(() => {
    if (user?.id && currentUser && !currentUser.calendarSecret) {
      db.transact(db.tx.$users[user.id].update({ calendarSecret: id() }));
    }
  }, [currentUser, user?.id]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth error if any
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-700">{authError.message}</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Show data loading state
  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  // Show data error if any
  if (error) {
    return <div className="text-red-500 p-4">Error: {error.message}</div>;
  }

  // No changes needed here, just removing the misplaced block from previous edit
  // if it exists.

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Desktop Navigation - Sidebar style or Top bar hidden on mobile */}
      <nav className="hidden md:block bg-white shadow-sm w-full sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-800">
                  MSP
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView("dashboard")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${view === "dashboard"
                  ? "text-white bg-gray-900"
                  : "text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setView("customers")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${view === "customers"
                  ? "text-white bg-gray-900"
                  : "text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Customers
              </button>
              <button
                onClick={() => setView("invoices")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${view === "invoices"
                  ? "text-white bg-gray-900"
                  : "text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Invoices
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${view === "calendar"
                  ? "text-white bg-gray-900"
                  : "text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setView("services")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${view === "services"
                  ? "text-white bg-gray-900"
                  : "text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Services
              </button>
              <button
                onClick={() => setView("taxzone")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${view === "taxzone"
                  ? "text-white bg-gray-900"
                  : "text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Tax Zone
              </button>
              <button
                onClick={() => setView("settings")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${view === "settings"
                  ? "text-white bg-gray-900"
                  : "text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Settings
              </button>
              <div className="border-l border-gray-300 h-8 mx-2"></div>
              <div className="flex items-center gap-3">
                <CalendarSyncStatus />
                {user.email && (
                  <span className="text-sm text-gray-600">{user.email}</span>
                )}
                <button
                  onClick={() => db.auth.signOut()}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-[60] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => { setView("dashboard"); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 ${view === "dashboard" ? "text-gray-900" : "text-gray-400"}`}
        >
          <svg className="w-6 h-6" fill={view === "dashboard" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
        </button>
        <button
          onClick={() => { setView("invoices"); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 ${view === "invoices" ? "text-gray-900" : "text-gray-400"}`}
        >
          <svg className="w-6 h-6" fill={view === "invoices" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">Invoices</span>
        </button>
        <button
          onClick={() => { setView("calendar"); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 ${view === "calendar" ? "text-gray-900" : "text-gray-400"}`}
        >
          <svg className="w-6 h-6" fill={view === "calendar" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">Calendar</span>
        </button>
        <button
          onClick={() => { setView("taxzone"); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 ${view === "taxzone" ? "text-gray-900" : "text-gray-400"}`}
        >
          <svg className="w-6 h-6" fill={view === "taxzone" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m3 2h12a3 3 0 003-3v-2a3 3 0 00-3-3H9a3 3 0 00-3 3v2a3 3 0 003 3z" /></svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">Tax Zone</span>
        </button>
        <button
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          className={`flex flex-col items-center gap-1 ${isMoreMenuOpen ? "text-gray-900" : "text-gray-400"}`}
        >
          <svg className="w-6 h-6" fill={isMoreMenuOpen ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">More</span>
        </button>
      </div>

      {/* Fullscreen Mobile More Menu */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 bg-white z-[55] md:hidden flex flex-col p-6 pt-12 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-2xl font-black uppercase tracking-widest text-gray-900">Explore</h2>
            <button onClick={() => setIsMoreMenuOpen(false)} className="p-2 bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'customers', label: 'Customers', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
              { id: 'services', label: 'Services', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 00-2-2m0 0V5a2 2 0 012-2h6.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V7n" /> },
              { id: 'settings', label: 'Settings', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id as any); setIsMoreMenuOpen(false); }}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${view === item.id ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-700 border-gray-100 hover:border-gray-300"}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
                <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}

            <button
              onClick={() => db.auth.signOut()}
              className="flex items-center gap-4 p-5 rounded-2xl border border-red-100 bg-red-50 text-red-600 transition-all active:scale-[0.98] mt-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span className="text-sm font-black uppercase tracking-widest">Sign Out</span>
            </button>
          </div>

          <div className="mt-auto py-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">MSP Business Suite v1.0</p>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        {view === "dashboard" && (
          <Dashboard
            invoices={invoices as any}
            clients={clients as any}
            calendarEvents={calendarEvents as any}
            onNavigate={(newView: View, modal?: string) => {
              setView(newView);
              if (modal) setModalToOpen(modal);
            }}
          />
        )}
        {view === "customers" && (
          <Customers
            clients={clients as any}
            userId={user.id}
            initiallyOpenModal={modalToOpen === "create-client"}
            onModalClose={() => setModalToOpen(null)}
          />
        )}
        {view === "invoices" && (
          <Invoices
            invoices={invoices as any}
            clients={clients as any}
            services={services as any}
            taxes={taxes as any}
            termsTemplates={termsTemplates as any}
            businesses={businesses as any}
            userId={user.id}
            initiallyOpenModal={modalToOpen === "create-invoice"}
            onModalClose={() => setModalToOpen(null)}
          />
        )}
        {view === "calendar" && (
          <Calendar
            calendarEvents={calendarEvents as any}
            userId={user.id}
            calendarSecret={currentUser?.calendarSecret}
            initiallyOpenModal={modalToOpen === "mark-availability"}
            onModalClose={() => setModalToOpen(null)}
          />
        )}
        {view === "services" && <Services services={services} userId={user.id} />}
        {view === "settings" && (
          <Settings
            taxes={taxes}
            termsTemplates={termsTemplates}
            userId={user.id}
            invoices={invoices}
            clients={clients}
            businesses={businesses}
          />
        )}
        {view === "taxzone" && (
          <TaxZone
            invoices={invoices as any}
            clients={clients as any}
            expenses={expenses as any}
            tdsEntries={tdsEntries as any}
            userId={user.id}
          />
        )}
      </main>
    </div>
  );
}

// Helper component for Google Calendar sync status and setup
function CalendarSyncStatus() {
  const [showSetup, setShowSetup] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('google_access_token');

  function handleSetToken() {
    if (tokenInput.trim()) {
      GoogleCalendarAPI.setAccessToken(tokenInput.trim());
      setTokenInput("");
      setShowSetup(false);
      alert("Google Calendar access token saved! You can now sync events.");
    }
  }

  function handleClearToken() {
    if (confirm("Are you sure you want to clear the Google Calendar token?")) {
      GoogleCalendarAPI.clearAccessToken();
      localStorage.removeItem('token_warning_shown');
      alert("Token cleared. Google Calendar sync disabled.");
      setShowSetup(false);
    }
  }

  function handleReAuthenticate() {
    // Sign out and sign back in to trigger OAuth again
    if (confirm("This will sign you out and redirect to login. Your data is safe. Continue?")) {
      GoogleCalendarAPI.clearAccessToken();
      localStorage.removeItem('token_warning_shown');
      window.location.reload();
    }
  }

  async function handleConnectGoogleCalendar() {
    try {
      // Use direct Google OAuth (not InstantDB)
      GoogleCalendarAuth.requestCalendarAccessRedirect();
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      alert('Failed to connect. Please try the manual token method.');
    }
  }

  if (showSetup) {
    return (
      <div className="relative">
        <div className="absolute right-0 top-8 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 w-96 z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm">Google Calendar Setup</h3>
            <button onClick={() => setShowSetup(false)} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="text-xs text-gray-600 mb-3 space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <p className="font-semibold text-blue-900 mb-1">ℹ️ Quick Method (For Testing)</p>
              <ol className="list-decimal ml-4 space-y-1 text-blue-800">
                <li>Open browser DevTools (Press F12)</li>
                <li>Go to <strong>Console</strong> tab</li>
                <li>Look for "📋 Complete user object:"</li>
                <li>Expand the object and find any access token field</li>
                <li>Copy the token value (long string)</li>
                <li>Paste it in the box below</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <p className="font-semibold text-yellow-900 mb-1">⚠️ Important Notes</p>
              <ul className="list-disc ml-4 space-y-1 text-yellow-800 text-xs">
                <li>Tokens expire after ~1 hour</li>
                <li>You may need to re-authenticate periodically</li>
                <li>This is for testing - production needs proper OAuth</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded p-2">
              <p className="font-semibold text-green-900 mb-1">✅ Alternative: Re-authenticate</p>
              <p className="text-green-800">Sign out and sign in again - we'll try to auto-detect the token.</p>
            </div>
          </div>

          <textarea
            className="border p-2 rounded w-full text-xs font-mono mb-2"
            rows={3}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste Google access token here"
          />

          <div className="flex flex-col gap-2">
            <button
              onClick={handleConnectGoogleCalendar}
              className="bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              📅 Connect with Google (Recommended)
            </button>

            <div className="text-xs text-gray-500 text-center my-1">or</div>

            <button
              onClick={handleSetToken}
              className="bg-gray-900 text-white px-3 py-2 rounded text-xs hover:bg-gray-800 font-medium"
            >
              💾 Save Token Manually
            </button>

            <button
              onClick={handleReAuthenticate}
              className="bg-gray-600 text-white px-3 py-2 rounded text-xs hover:bg-gray-700 font-medium"
            >
              🔄 Re-authenticate InstantDB
            </button>

            {hasToken && (
              <button
                onClick={handleClearToken}
                className="px-3 py-2 text-red-600 border border-red-600 rounded text-xs hover:bg-red-50 font-medium"
              >
                🗑️ Clear Saved Token
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowSetup(true)}
      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${hasToken
        ? "bg-green-100 text-green-700 border border-green-300"
        : "bg-yellow-100 text-yellow-700 border border-yellow-300"
        }`}
    >
      <span>{hasToken ? "📅 Calendar Sync Active" : "⚠️ Calendar Sync Disabled"}</span>
    </button>
  );
}

export default App;