import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientsWorkspace } from "./ClientsWorkspace";

const ACTIVE_WORKSPACE_COOKIE = "backdrop_active_business_id";

export default async function WorkspaceClientsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/workspace");

  const { data: memberships, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id, role, businesses(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (membershipError) {
    return <main className="min-h-screen bg-[#09090b] p-8 text-white"><p>Unable to load workspaces: {membershipError.message}</p></main>;
  }
  if (!memberships?.length) redirect("/workspace");

  const cookieStore = await cookies();
  const cookieBusinessId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const activeMembership = memberships.find((item) => item.business_id === cookieBusinessId) ?? memberships[0];
  const business = Array.isArray(activeMembership.businesses) ? activeMembership.businesses[0] : activeMembership.businesses;
  const businessName = business?.name ?? "Selected workspace";

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, client_type, salutation, first_name, last_name, company_name, display_name, email, phone, work_phone, mobile, address, pan, tan, gstin, currency, payment_terms, custom_term_days, is_tds_deducting")
    .eq("business_id", activeMembership.business_id)
    .order("display_name", { ascending: true });

  return (
    <div>
      <div className="border-b border-white/10 bg-[#09090b] px-5 py-4 text-white md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/workspace" className="text-sm font-semibold text-neutral-300 hover:text-white">← Workspace</Link>
          <span className="text-xs uppercase tracking-widest text-neutral-500">Backdrop · Supabase migration</span>
        </div>
      </div>
      {clientsError ? (
        <main className="min-h-screen bg-[#09090b] p-8 text-white"><p>Unable to load clients: {clientsError.message}</p></main>
      ) : (
        <ClientsWorkspace businessName={businessName} clients={(clients ?? []) as never[]} />
      )}
    </div>
  );
}
