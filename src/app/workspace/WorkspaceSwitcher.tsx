"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveWorkspace } from "./actions";

type WorkspaceOption = {
  id: string;
  name: string;
  role: string;
};

type WorkspaceSwitcherProps = {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string | null;
};

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!workspaces.length) return null;

  async function chooseWorkspace(id: string) {
    setError(null);
    const result = await setActiveWorkspace(id);
    if (result.error) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-200">Switch workspace</h2>
        <span className="text-xs text-neutral-500">Your access-controlled businesses</span>
      </div>
      <ul className="space-y-2">
        {workspaces.map((workspace) => {
          const active = workspace.id === activeWorkspaceId;
          return (
            <li key={workspace.id}>
              <button
                type="button"
                disabled={isPending || active}
                onClick={() => chooseWorkspace(workspace.id)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-default ${
                  active
                    ? "border-blue-400/40 bg-blue-500/10"
                    : "border-white/10 bg-black/20 hover:border-white/25 hover:bg-white/[0.04]"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{workspace.name}</span>
                  <span className="mt-1 block text-xs capitalize text-neutral-500">{workspace.role}</span>
                </span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  active ? "bg-blue-400/15 text-blue-200" : "bg-white/5 text-neutral-400"
                }`}>
                  {active ? "Active" : isPending ? "Switching…" : "Select"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </section>
  );
}
