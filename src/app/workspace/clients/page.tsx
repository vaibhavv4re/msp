import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Clients as ClientsSupabase } from "./ClientsSupabase";
import type { Client } from "@/app/page";

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

  if (membershipError || !memberships?.length) redirect("/workspace");

  const cookieStore = await cookies();
  const cookieBusinessId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const activeMembership = memberships.find((item) => item.business_id === cookieBusinessId) ?? memberships[0];
  const business = Array.isArray(activeMembership.businesses) ? activeMembership.businesses[0] : activeMembership.businesses;

  const { data: rows, error } = await supabase.from("clients")
    .select("id, client_type, salutation, first_name, last_name, company_name, display_name, email, phone, work_phone, mobile, address, pan, tan, gstin, currency, payment_terms, custom_term_days, is_tds_deducting")
    .eq("business_id", activeMembership.business_id)
    .order("display_name", { ascending: true });

  if (error) return <main className="p-8"><p>Unable to load clients: {error.message}</p></main>;

  const clients = (rows ?? []).map((row) => ({
    id: row.id,
    clientType: row.client_type ?? "Individual",
    salutation: row.salutation ?? undefined,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    companyName: row.company_name ?? undefined,
    displayName: row.display_name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    workPhone: row.work_phone ?? undefined,
    mobile: row.mobile ?? undefined,
    address: row.address ?? undefined,
    pan: row.pan ?? undefined,
    tan: row.tan ?? undefined,
    gst: row.gstin ?? undefined,
    currency: row.currency,
    paymentTerms: row.payment_terms ?? undefined,
    customTermDays: row.custom_term_days ?? undefined,
    isTdsDeducting: row.is_tds_deducting,
  })) as unknown as Client[];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="border-b border-gray-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/workspace" className="text-sm font-semibold text-gray-700 hover:text-black">← Workspace</Link>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{business?.name ?? "Workspace"} · Clients</span>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ClientsSupabase clients={clients} invoices={[]} businesses={[]} userId={user.id} activeBusinessId={activeMembership.business_id} />
      </main>
    </div>
  );
}
