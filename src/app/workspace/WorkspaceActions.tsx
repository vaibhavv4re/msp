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
      if ("error" in selection) {
        setError(selection.error);
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
          className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Connecting…" : "Continue with Google"}
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
