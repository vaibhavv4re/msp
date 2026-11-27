# Backdrop — Supabase Auth setup

This branch adds the Supabase SSR client foundation. It does **not** switch the existing application login or InstantDB data queries yet. Keep the current login available until the identity and data migration is implemented together.

## 1. Environment variables

Add these to your local `.env.local` and deployment environment:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://yrcribxiptikoybukjzg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key-from-Supabase>
```

The publishable key is safe for browser use. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable or in client-side code.

## 2. Configure Google as an Auth provider

1. Open Supabase Dashboard → Authentication → Sign In / Providers → Google.
2. Enable Google and enter the Google OAuth Web Client ID and Client Secret.
3. In Google Cloud Console → Google Auth Platform → Clients, create or use a **Web application** OAuth client.
4. Add the Supabase callback URI shown on the Google provider page to Google's **Authorized redirect URIs**. It will look like:

   `https://yrcribxiptikoybukjzg.supabase.co/auth/v1/callback`

5. In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to your production Backdrop origin and add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - Your production origin plus `/auth/callback`
   - Any preview origin you intentionally use for testing

For the Google OAuth consent screen, request only the basic identity scopes needed for sign-in: `openid`, `email`, and `profile`. Google Calendar authorization remains a separate integration.

## 3. Next.js session handling

- `src/lib/supabase/client.ts`: browser client.
- `src/lib/supabase/server.ts`: server component / route handler client.
- `middleware.ts`: refreshes cookie-based sessions on Next.js 15.
- `src/app/auth/callback/route.ts`: exchanges the OAuth PKCE code for a Supabase session.

## 4. Migration boundary

The existing root page still authenticates through InstantDB and uses InstantDB queries. Do not remove InstantDB credentials or disable its Google login yet. The next implementation step is to bridge the signed-in Supabase user to the new `profiles` and `business_members` records, then migrate each data module from InstantDB to Supabase before removing the legacy auth path.

## 5. Local setup

After pulling this branch, run:

```bash
npm install
npm run build
```

Commit the generated `package-lock.json` update along with the dependency changes. Then add the environment variables and test the Google provider callback before switching the production login.


## 6. Test Supabase sign-in and workspace provisioning

The isolated `/workspace` preview exercises Supabase without replacing the existing InstantDB login:

1. Start the app with the Supabase URL and publishable key configured.
2. Open `http://localhost:3000/workspace`.
3. Sign in with Google. The callback returns to `/workspace`.
4. Confirm the profile is created automatically in `public.profiles`.
5. Create a business workspace. The `create_business` RPC creates the business and owner membership in one database transaction.
6. Confirm the workspace appears with the `owner` role. Select it and refresh; the active workspace is stored in an HTTP-only cookie and is revalidated against the signed-in user's membership on every page render.

The preview is intentionally separate from the current root application. Do not switch the production login until the full identity bridge and feature-by-feature data migration are ready.
