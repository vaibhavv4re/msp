"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setActiveWorkspace } from "./actions";

type WorkspaceOption = { id: string; name: string; role: string };
type WorkspaceSwitcherProps = { workspaces: WorkspaceOption[]; activeWorkspaceId: string | null };

export function WorkspaceSwitcher({ workspaces, activeWorkspaceId }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!workspaces.length) return null;

  async function chooseWorkspace(id: string) {
    if (!id || id === activeWorkspaceId || pending) return;
    setError(null);
    setPending(true);
    try {
      const result = await setActiveWorkspace(id);
      if ("error" in result) {
        setError(result.error ?? "Unable to switch workspace.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to switch workspace. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <label htmlFor="workspace-select" className="hidden text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 sm:block">
        Workspace
      </label>
      <div className="relative min-w-0">
        <select
          id="workspace-select"
          value={activeWorkspaceId ?? ""}
          disabled={pending}
          onChange={(event) => chooseWorkspace(event.target.value)}
          aria-label="Switch business workspace"
          className="max-w-[220px] cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-9 text-xs font-bold text-gray-800 shadow-sm outline-none transition hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:max-w-[260px]"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name} · {workspace.role}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">⌄</span>
      </div>
      {pending && <span className="text-[10px] text-gray-400">Switching…</span>}
      {error && <span role="alert" className="max-w-[180px] text-[10px] text-red-600">{error}</span>}
      <span className="sr-only">{active ? `Active workspace: ${active.name}` : "No active workspace"}</span>
    </div>
  );
}
