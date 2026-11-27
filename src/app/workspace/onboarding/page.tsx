import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Onboarding } from "./Onboarding";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/workspace");
  const businessId = (await cookies()).get("backdrop_active_business_id")?.value;
  const { data: membershipRows } = await supabase.from("business_members")
    .select("business_id,role").eq("user_id", user.id).order("joined_at", { ascending: true });
  if (!membershipRows?.length) redirect("/workspace");
  const membership = membershipRows.find(x => x.business_id === businessId) ?? membershipRows[0];
  const [{ data: business, error }, { count: bankCount }, { count: serviceCount }, { data: taxSettings }] = await Promise.all([
    supabase.from("businesses").select("id,name,legal_name,business_type,address,city,state,pin,country,email,contact,pan,gstin,gst_type")
      .eq("id", membership.business_id).single(),
    supabase.from("bank_accounts").select("id", { count: "exact", head: true }).eq("business_id", membership.business_id).eq("is_active", true),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", membership.business_id).eq("is_active", true),
    supabase.from("tax_settings").select("business_id").eq("business_id", membership.business_id).maybeSingle(),
  ]);
  if (error || !business) return <main className="p-8 text-red-600">Unable to load business profile: {error?.message ?? "Business not found"}</main>;
  return <Onboarding business={business} role={membership.role} setup={{ bank: (bankCount ?? 0) > 0, service: (serviceCount ?? 0) > 0, tax: !!taxSettings }} />;
}
