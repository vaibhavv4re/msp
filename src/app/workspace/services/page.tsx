import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Services as ServicesSupabase } from "./ServicesSupabase";

const ACTIVE_WORKSPACE_COOKIE = "backdrop_active_business_id";

export default async function WorkspaceServicesPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/workspace");

  const { data: memberships, error: membershipError } = await supabase
    .from("business_members").select("business_id, role, businesses(name)")
    .eq("user_id", user.id).order("created_at", { ascending: true });
  if (membershipError || !memberships?.length) redirect("/workspace");

  const cookieStore = await cookies();
  const cookieBusinessId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const activeMembership = memberships.find((item) => item.business_id === cookieBusinessId) ?? memberships[0];
  const business = Array.isArray(activeMembership.businesses) ? activeMembership.businesses[0] : activeMembership.businesses;

  const { data: rows, error } = await supabase.from("services")
    .select("id, name, description, sac_code, rate, is_active")
    .eq("business_id", activeMembership.business_id)
    .order("name", { ascending: true });

  if (error) return <main className="p-8"><p>Unable to load services: {error.message}</p></main>;

  const services = (rows ?? []).map((row) => ({
    id: row.id, name: row.name, description: row.description ?? undefined,
    sacCode: row.sac_code ?? undefined, rate: Number(row.rate), isActive: row.is_active,
  }));

  return <div className="min-h-screen bg-gray-100">
    <div className="border-b border-gray-200 bg-white px-5 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/workspace" className="text-sm font-semibold text-gray-700 hover:text-black">← Workspace</Link>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{business?.name ?? "Workspace"} · Services</span>
      </div>
    </div>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ServicesSupabase services={services} userId={user.id} activeBusinessId={activeMembership.business_id} />
    </main>
  </div>;
}
