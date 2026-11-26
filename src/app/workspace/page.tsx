import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceActions } from "./WorkspaceActions";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export const metadata = {
  title: "Business workspaces | Backdrop",
};

const ACTIVE_WORKSPACE_COOKIE = "backdrop_active_business_id";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const requestedActiveWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;

  let profileName: string | null = null;
  let activeWorkspaceId: string | null = null;
  let workspaces: Array<{
    id: string;
    name: string;
    legal_name: string | null;
    business_type: string | null;
    role: string;
    joined_at: string;
  }> = [];
  // A missing session is the normal signed-out state, not an error to show.
  let loadError: string | null = user ? authError?.message ?? null : null;

  if (user) {
    const [{ data: profile }, { data: memberships, error: membershipError }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("business_members")
        .select("business_id, role, joined_at")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true }),
    ]);

    profileName = profile?.full_name ?? null;

    if (membershipError) {
      loadError = membershipError.message;
    } else if (memberships?.length) {
      const businessIds = memberships.map((membership) => membership.business_id);
      const { data: businesses, error: businessesError } = await supabase
        .from("businesses")
        .select("id, name, legal_name, business_type")
        .in("id", businessIds)
        .order("name", { ascending: true });

      if (businessesError) {
        loadError = businessesError.message;
      } else {
        const membershipByBusiness = new Map(
          memberships.map((membership) => [membership.business_id, membership])
        );

        workspaces = (businesses ?? []).map((business) => {
          const membership = membershipByBusiness.get(business.id);
          return {
            ...business,
            role: membership?.role ?? "member",
            joined_at: membership?.joined_at ?? "",
          };
        });

        // Only accept a cookie value that is still in the user's membership list.
        activeWorkspaceId = workspaces.some((workspace) => workspace.id === requestedActiveWorkspaceId)
          ? requestedActiveWorkspaceId
          : workspaces[0]?.id ?? null;
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#090b10] px-5 py-12 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 flex items-center justify-between">
          <a href="/" className="text-2xl font-black tracking-tight">Backdrop<span className="text-blue-500">.</span></a>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-neutral-400">
            Supabase workspace preview
          </span>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl sm:p-9">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">
            Your business, connected
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {user ? `Welcome${profileName ? `, ${profileName}` : ""}` : "Sign in to Backdrop"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400">
            {user
              ? `Signed in as ${user.email ?? "your Google account"}. Your workspaces are loaded using your Supabase membership and row-level security.`
              : "Use your Google account to test the new Supabase authentication foundation. This preview does not replace the existing InstantDB application login."}
          </p>

          {loadError && (
            <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
              {loadError}
            </p>
          )}

          {user && (
            <>
              <WorkspaceSwitcher
                workspaces={workspaces.map(({ id, name, role }) => ({ id, name, role }))}
                activeWorkspaceId={activeWorkspaceId}
              />
              {activeWorkspaceId && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {[
                    ["Clients","/workspace/clients"],
                    ["Services","/workspace/services"],
                    ["Estimates","/workspace/estimates"],
                    ["Invoices","/workspace/invoices"],
                    ["Expenses","/workspace/expenses"],
                    ["Bank Accounts","/workspace/bank-accounts"],
                    ["Tax Settings","/workspace/tax-settings"],
                    ["TDS Tracking","/workspace/tds"],
                    ["GST & ITC","/workspace/gst"],
                    ["CA Handover","/workspace/ca-handover"],
                  ].map(([label,href]) => (
                    <Link key={href} href={href} className="inline-flex items-center rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-200 hover:bg-blue-500/20">
                      Open {label} →
                    </Link>
                  ))}
                </div>
              )}
              {workspaces.length === 0 && !loadError && (
                <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-5 text-sm text-neutral-400">
                  No workspaces yet. Create your first business below.
                </div>
              )}
            </>
          )}

          <div className="mt-8 border-t border-white/10 pt-7">
            <h2 className="mb-4 text-sm font-semibold text-neutral-200">
              {user ? "Create a business workspace" : "Secure Google sign-in"}
            </h2>
            <WorkspaceActions isAuthenticated={Boolean(user)} />
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-neutral-600">
          This is an isolated Supabase onboarding preview. Existing Backdrop data and InstantDB login remain unchanged.
        </p>
      </div>
    </main>
  );
}
