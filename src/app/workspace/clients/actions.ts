"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_WORKSPACE_COOKIE = "backdrop_active_business_id";

async function getAuthorizedWorkspace() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in again." as const };

  const cookieStore = await cookies();
  const businessId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (!businessId) return { error: "Choose a workspace first." as const };

  const { data: membership, error } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) return { error: "You do not have access to this workspace." as const };
  return { supabase, user, businessId, role: membership.role };
}

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function clientPayload(formData: FormData) {
  const clientType = value(formData, "client_type") || "Individual";
  const companyName = value(formData, "company_name");
  const firstName = value(formData, "first_name");
  const lastName = value(formData, "last_name");
  const salutation = value(formData, "salutation");
  const displayName = value(formData, "display_name") ||
    (clientType === "Business" ? companyName : [salutation, firstName, lastName].filter(Boolean).join(" "));
  return {
    client_type: clientType,
    salutation: salutation || null,
    first_name: firstName || null,
    last_name: lastName || null,
    company_name: companyName || null,
    display_name: displayName,
    email: value(formData, "email") || null,
    phone: value(formData, "phone") || null,
    work_phone: value(formData, "work_phone") || null,
    mobile: value(formData, "mobile") || null,
    address: value(formData, "address") || null,
    pan: value(formData, "pan").toUpperCase() || null,
    tan: value(formData, "tan").toUpperCase() || null,
    gstin: value(formData, "gstin").toUpperCase() || null,
    currency: value(formData, "currency") || "INR",
    payment_terms: value(formData, "payment_terms") || "net_30",
    custom_term_days: value(formData, "payment_terms") === "custom" && value(formData, "custom_term_days")
      ? Number(value(formData, "custom_term_days")) : null,
    is_tds_deducting: formData.get("is_tds_deducting") === "on",
  };
}

export async function saveClient(formData: FormData) {
  const context = await getAuthorizedWorkspace();
  if ("error" in context) return context;

  const payload = clientPayload(formData);
  if (!payload.display_name) return { error: "Enter a client or company name." };
  if (payload.custom_term_days !== null && (!Number.isInteger(payload.custom_term_days) || payload.custom_term_days < 1)) {
    return { error: "Custom payment days must be a positive whole number." };
  }

  const id = value(formData, "id");
  const query = context.supabase.from("clients");
  const result = id
    ? await query.update(payload).eq("id", id).eq("business_id", context.businessId)
    : await query.insert({ ...payload, business_id: context.businessId, created_by: context.user.id });

  if (result.error) return { error: result.error.message };
  revalidatePath("/workspace/clients");
  return { success: true };
}

export async function deleteClient(formData: FormData) {
  const context = await getAuthorizedWorkspace();
  if ("error" in context) return context;
  const id = value(formData, "id");
  if (!id) return { error: "Client ID is required." };

  const { error } = await context.supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("business_id", context.businessId);

  if (error) return { error: error.message };
  revalidatePath("/workspace/clients");
  return { success: true };
}
