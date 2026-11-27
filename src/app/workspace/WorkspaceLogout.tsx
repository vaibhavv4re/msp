"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function WorkspaceLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    if (pending) return;
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setPending(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }
  return (
    <button type="button" onClick={logout} disabled={pending} title="Sign out" aria-label="Sign out"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
      {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" /> :
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>}
    </button>
  );
}
