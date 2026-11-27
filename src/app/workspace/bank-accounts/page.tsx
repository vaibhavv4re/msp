import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BankAccounts } from "./BankAccounts";

export default async function BankAccountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/workspace");
  const { data: memberships } = await supabase.from("business_members").select("business_id,role,businesses(name)")
    .eq("user_id", user.id).order("joined_at", { ascending: true });
  const list = memberships || [];
  if (!list.length) redirect("/workspace");
  const requested = (await cookies()).get("backdrop_active_business_id")?.value;
  const membership = list.find(x => x.business_id === requested) || list[0];
  const businessName = (membership.businesses as { name: string } | null)?.name || "Workspace";
  const { data: accounts, error } = await supabase.from("bank_accounts").select("*")
    .eq("business_id", membership.business_id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const role = membership.role;
  return <BankAccounts accounts={accounts || []} canManage={["owner","admin","accountant"].includes(role)}
    canDelete={["owner","admin"].includes(role)} />;
}
