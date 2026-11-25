import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code", origin));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return NextResponse.redirect(new URL("/?auth_error=missing_supabase_config", origin));
  }

  const cookieStore = await cookies();
  const cookiesToSet: Array<{
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  }> = [];

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookies) {
        cookiesToSet.push(...cookies);
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const destination = error
    ? new URL("/?auth_error=oauth_callback", origin)
    : new URL(next, origin);
  const response = NextResponse.redirect(destination);

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
