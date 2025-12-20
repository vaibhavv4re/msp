# Google Calendar Setup Guide

## Why InstantDB Can't Help

**InstantDB does NOT provide access to Google Calendar API tokens.** Their OAuth is for authentication only (proving who you are), not authorization (accessing Google services).

## What You Need to Do

Set up **your own Google OAuth client** specifically for Calendar access. This runs alongside InstantDB auth.

---

## Step 1: Create Google OAuth Client

1. **Go to Google Cloud Console**  
   https://console.cloud.google.com/apis/credentials

2. **Enable Google Calendar API**
   - Click "+ ENABLE APIS AND SERVICES"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth Consent Screen** (if you haven't)
   - Go to "OAuth consent screen" in the left menu
   - Choose "External" (for testing)
   - Fill in required fields:
     - App name: "Your App Name"
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue"
   - **Add Scopes**: Click "Add or Remove Scopes"
     - Search for `https://www.googleapis.com/auth/calendar.events`
     - Select it and click "Update"
   - Add test users (your Gmail address)
   - Click "Save and Continue"

4. **Create OAuth Client ID**
   - Go to "Credentials" tab
   - Click "+ CREATE CREDENTIALS"
   - Select "OAuth client ID"
   - Application type: "Web application"
   - Name: "Calendar Access"
   - **Authorized JavaScript origins**:
     - `http://localhost:3001` (for development)
     - Your production URL (when deployed)
   - **Authorized redirect URIs**:
     - `http://localhost:3001` (for development)
     - Your production URL (when deployed)
   - Click "Create"

5. **Copy Your Client ID**
   - You'll see a popup with "Client ID" and "Client Secret"
   - **Copy the Client ID** (looks like: `123456-abc.apps.googleusercontent.com`)

---

## Step 2: Update Your Code

Open: `src/lib/googleOAuth.ts`

Replace this line:
```typescript
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
```

With your actual Client ID:
```typescript
const GOOGLE_CLIENT_ID = '123456-abc.apps.googleusercontent.com';
```

---

## Step 3: Test the Connection

1. **Restart your dev server** (if running)
   ```bash
   npm run dev
   ```

2. **Click the yellow "⚠️ Calendar Sync Disabled" badge** in navbar

3. **Click "📅 Connect with Google (Recommended)"**

4. **Authorize the app**:
   - Sign in with Google (if needed)
   - Click "Allow" to grant Calendar access
   - You'll be redirected back to your app

5. **Verify connection**:
   - Badge should turn green: "📅 Calendar Sync Active"
   - You should see a success alert

---

## Step 4: Test Calendar Sync

1. Go to **Calendar** tab
2. Click any date
3. Set status to **Booked**
4. Enter a title
5. Toggle **"Sync to Google Calendar"** ON
6. Click **Save**
7. **Check your Google Calendar** - event should appear!

---

## Troubleshooting

### "400: redirect_uri_mismatch"
- Make sure `http://localhost:3001` is in "Authorized redirect URIs" in Google Console
- Check your port matches (might be 3000 or 3001)

### "401: invalid_client"
- Double-check the Client ID in `googleOAuth.ts`
- Make sure you copied it correctly

### Token not saving
- Check browser console for errors
- Make sure localStorage is enabled

### Events not syncing
- Verify green badge shows "Calendar Sync Active"
- Check browser console for API errors
- Make sure you enabled Google Calendar API

---

## Important Notes

- ✅ **Two Separate Auth Systems**:
  - InstantDB OAuth → User login & data access
  - Google OAuth → Calendar API access
  
- ✅ **Tokens Expire**: Google tokens last ~1 hour. Users may need to reconnect.

- ✅ **Development vs Production**: 
  - Add your production URL to Google Console when deploying
  - Update the redirect URIs accordingly

- ✅ **User Privacy**: Each user connects their own Google Calendar. Tokens are stored per-browser.

---

## Quick Reference

**Google Console**: https://console.cloud.google.com/apis/credentials  
**File to Update**: `src/lib/googleOAuth.ts`  
**What to Copy**: Client ID (not Client Secret for browser apps)  
**Scope Needed**: `https://www.googleapis.com/auth/calendar.events`
