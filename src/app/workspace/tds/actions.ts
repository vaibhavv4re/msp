"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_WORKSPACE_COOKIE = "backdrop_active_business_id";
const writers = ["owner", "admin", "accountant", "employee"];

async function context() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please sign in to continue.");
  const businessId = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (!businessId) throw new Error("Select a business workspace first.");
  const { data: member } = await supabase.from("business_members").select("role").eq("business_id", businessId).eq("user_id", user.id).maybeSingle();
  if (!member) throw new Error("You do not have access to this workspace.");
  return { supabase, user, businessId, role: member.role as string };
}

export async function saveTdsEntry(input: {
  id?: string; amount: number; clientId: string; invoiceId?: string | null;
  financialYear: string; deductionDate: string; tdsSection?: string;
  hasCertificate: boolean; certificateReference?: string; notes?: string;
}) {
  const { supabase, user, businessId, role } = await context();
  if (!writers.includes(role)) throw new Error("You do not have permission to manage TDS records.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter a TDS amount greater than zero.");
  if (!input.clientId) throw new Error("Select a client.");
  if (!/^\d{4}-\d{4}$/.test(input.financialYear)) throw new Error("Enter the financial year as YYYY-YYYY.");
  const { data: client } = await supabase.from("clients").select("id").eq("id", input.clientId).eq("business_id", businessId).maybeSingle();
  if (!client) throw new Error("Selected client does not belong to this workspace.");
  if (input.invoiceId) {
    const { data: invoice } = await supabase.from("invoices").select("id,client_id").eq("id", input.invoiceId).eq("business_id", businessId).maybeSingle();
    if (!invoice || invoice.client_id !== input.clientId) throw new Error("Select an invoice belonging to the chosen client.");
  }
  const payload = {
    business_id: businessId, client_id: input.clientId, invoice_id: input.invoiceId || null,
    amount: input.amount, financial_year: input.financialYear, deduction_date: input.deductionDate,
    tds_section: input.tdsSection?.trim() || null, has_certificate: input.hasCertificate,
    certificate_reference: input.certificateReference?.trim() || null,
    notes: input.notes?.trim() || null, created_by: user.id, updated_at: new Date().toISOString()
  };
  const query = input.id
    ? supabase.from("tds_entries").update(payload).eq("id", input.id).eq("business_id", businessId)
    : supabase.from("tds_entries").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/workspace/tds");
}

export async function deleteTdsEntry(id: string) {
  const { supabase, businessId, role } = await context();
  if (!["owner", "admin", "accountant"].includes(role)) throw new Error("Only workspace finance admins can delete TDS records.");
  const { error } = await supabase.from("tds_entries").delete().eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath("/workspace/tds");
}
