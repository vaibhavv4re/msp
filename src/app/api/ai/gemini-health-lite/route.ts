import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-3.5-flash-lite";


export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, stage: "authentication", error: "Please sign in before testing Gemini." }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, stage: "configuration", error: "GEMINI_API_KEY is missing from the server environment." }, { status: 503 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}`,
      { headers: { "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(10000) }
    );
    const payload = await response.json().catch(() => ({}));
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      return NextResponse.json({
        ok: false, stage: "model_metadata", model: MODEL,
        httpStatus: response.status, durationMs,
        error: payload?.error?.message || "Gemini model metadata request failed."
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      stage: "model_metadata",
      model: payload?.name || MODEL,
      displayName: payload?.displayName || null,
      supportedGenerationMethods: payload?.supportedGenerationMethods || [],
      durationMs
    });
  } catch (error: any) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json({
      ok: false, stage: timedOut ? "metadata_timeout" : "network",
      model: MODEL, durationMs: Date.now() - startedAt,
      error: timedOut ? "Gemini model metadata did not respond within 10 seconds." : error?.message || "Could not reach Gemini."
    }, { status: timedOut ? 504 : 502 });
  }
}

export async function POST() {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, stage: "authentication", error: "Please sign in before testing Gemini." }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, stage: "configuration", error: "GEMINI_API_KEY is missing from the server environment." }, { status: 503 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with exactly: GEMINI_OK" }] }],
          generationConfig: { maxOutputTokens: 16 }
        }),
        signal: AbortSignal.timeout(20000)
      }
    );

    const payload = await response.json().catch(() => ({}));
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const providerMessage = payload?.error?.message || "Gemini returned an error without a message.";
      console.error("[Backdrop AI] Gemini connectivity test failed", { model: MODEL, status: response.status, durationMs, providerMessage });
      return NextResponse.json({
        ok: false,
        stage: "gemini_api",
        model: MODEL,
        httpStatus: response.status,
        durationMs,
        error: providerMessage
      }, { status: 502 });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("").trim() || "";
    if (!text) {
      return NextResponse.json({
        ok: false,
        stage: "gemini_response",
        model: MODEL,
        httpStatus: response.status,
        durationMs,
        error: "Gemini accepted the request but returned no text. Check the candidate finish reason in the server logs."
      }, { status: 502 });
    }

    console.info("[Backdrop AI] Gemini connectivity test passed", { model: MODEL, durationMs });
    return NextResponse.json({ ok: true, stage: "complete", model: MODEL, durationMs, response: text });
  } catch (error: any) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    console.error("[Backdrop AI] Gemini connectivity test error", { model: MODEL, name: error?.name, message: error?.message });
    return NextResponse.json({
      ok: false,
      stage: timedOut ? "timeout" : "network",
      model: MODEL,
      durationMs: Date.now() - startedAt,
      error: timedOut ? "Gemini did not respond within 20 seconds." : error?.message || "Could not reach Gemini."
    }, { status: timedOut ? 504 : 502 });
  }
}
