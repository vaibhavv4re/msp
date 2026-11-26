"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setActiveWorkspace } from "./actions";

type WorkspaceActionsProps = {
  isAuthenticated: boolean;
};

export function WorkspaceActions({ isAuthenticated }: WorkspaceActionsProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/workspace`,
      },
    });

    if (authError) {
      setError(authError.message);
      setPending(false);
    }
  }

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signOut();

    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }

    router.refresh();
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter a business name.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data: businessId, error: createError } = await supabase.rpc("create_business", {
      p_name: trimmedName,
      p_legal_name: legalName.trim() || undefined,
      p_business_type: businessType.trim() || undefined,
    });

    if (createError) {
      setError(createError.message);
      setPending(false);
      return;
    }

    if (businessId) {
      const selection = await setActiveWorkspace(businessId);
      if ("error" in selection && selection.error) {
        setError(selection.error ?? "Workspace was created, but could not be selected. Please refresh and choose it.");
        setPending(false);
        return;
      }
    }

    setName("");
    setLegalName("");
    setBusinessType("");
    setPending(false);
    router.refresh();
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={pending}
          className="group relative flex min-h-[62px] w-full items-center justify-center gap-4 overflow-hidden rounded-2xl bg-white px-6 py-5 text-xs font-black uppercase tracking-[.18em] text-black shadow-[0_20px_40px_-10px_rgba(255,255,255,.1)] transition-all duration-500 hover:text-white active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-60 before:absolute before:inset-0 before:translate-y-full before:bg-gradient-to-r before:from-blue-600 before:to-indigo-600 before:transition-transform before:duration-500 hover:before:translate-y-0"
        >
          <span className="relative z-10 flex items-center gap-3">{pending ? "Connecting…" : <><svg className="h-5 w-5 transition-transform duration-500 group-hover:rotate-[360deg]" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Enter Workspace</>}</span>
        </button>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createWorkspace} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Business name *</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={160}
            required
            placeholder="e.g. Acme Creative Studio"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-blue-400"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Legal name</span>
          <input
            value={legalName}
            onChange={(event) => setLegalName(event.target.value)}
            maxLength={200}
            placeholder="Optional registered name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-blue-400"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Business type</span>
          <input
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            maxLength={100}
            placeholder="e.g. Freelancer, Agency, Private Limited"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-blue-400"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Creating workspace…" : "Create business workspace"}
        </button>
      </form>
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="text-sm text-neutral-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
      >
        Sign out
      </button>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
