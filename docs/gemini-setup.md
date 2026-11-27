# Gemini AI setup

Backdrop's Brief to Estimate feature uses the Gemini Developer API from the server. The API key must never be prefixed with `NEXT_PUBLIC_` or exposed to browser code.

Add these values to the root `.env.local` file:

```env
GEMINI_API_KEY=your_google_ai_studio_api_key
GEMINI_MODEL=gemini-3.8-flash
```

Restart the Next.js development server after changing environment variables.

For production, add the same variables to the hosting provider's server environment settings and redeploy. Keep the key private and rotate it if it is ever exposed.

The model can be changed without code changes by setting `GEMINI_MODEL` to another model enabled for the API key. Brief analysis is performed by the server-side route at `/api/ai/parse-estimate-brief`. The route requires an authenticated Backdrop session and checks membership in the active workspace.

Gemini returns structured project information and suggested line items. Backdrop validates service IDs and takes rates from the workspace's saved service catalogue. Unmatched suggestions receive a zero rate and must be priced manually. The client's budget is retained as a reference and is never automatically treated as the quote.

If `GEMINI_API_KEY` is missing, the manual estimate workflow remains available; the AI feature reports that Gemini is not configured.
