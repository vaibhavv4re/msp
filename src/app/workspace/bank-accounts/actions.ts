"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function workspaceContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." as const };
  const businessId = (await cookies()).get("backdrop_active_business_id")?.value;
  if (!businessId) return { error: "Choose a workspace first." as const };
  const { data: membership } = await supabase.from("business_members").select("role")
    .eq("business_id", businessId).eq("user_id", user.id).maybeSingle();
  if (!membership) return { error: "You do not have access to this workspace." as const };
  return { supabase, user, businessId, role: membership.role };
}

const EDIT_ROLES = ["owner", "admin", "accountant"];

export async function saveBankAccount(input: {
  id?: string; label: string; bankName: string; holderName: string;
  accountNumber: string; ifsc: string; upiId: string; chequeName: string; isActive: boolean;
}) {
  const ctx = await workspaceContext();
  if ("error" in ctx) return ctx;
  if (!EDIT_ROLES.includes(ctx.role)) return { error: "Only owners, admins and accountants can manage bank accounts." };
  const bankName = input.bankName.trim();
  const accountNumber = input.accountNumber.trim();
  if (!bankName || !accountNumber) return { error: "Bank name and account number are required." };
  const payload = {
    label: input.label.trim() || "Secondary",
    bank_name: bankName,
    holder_name: input.holderName.trim() || null,
    account_number: accountNumber,
    ifsc: input.ifsc.trim().toUpperCase() || null,
    upi_id: input.upiId.trim() || null,
    cheque_name: input.chequeName.trim() || null,
    is_active: input.isActive,
  };
  const result = input.id
    ? await ctx.supabase.from("bank_accounts").update(payload).eq("id", input.id).eq("business_id", ctx.businessId)
    : await ctx.supabase.from("bank_accounts").insert({ ...payload, business_id: ctx.businessId, created_by: ctx.user.id, source: "manual" });
  if (result.error) return { error: result.error.message };
  revalidatePath("/workspace/bank-accounts");
  revalidatePath("/workspace/invoices");
  return { success: true };
}

export async function setBankAccountActive(id: string, isActive: boolean) {
  const ctx = await workspaceContext();
  if ("error" in ctx) return ctx;
  if (!EDIT_ROLES.includes(ctx.role)) return { error: "Only owners, admins and accountants can manage bank accounts." };
  const { error } = await ctx.supabase.from("bank_accounts").update({ is_active: isActive })
    .eq("id", id).eq("business_id", ctx.businessId);
  if (error) return { error: error.message };
  revalidatePath("/workspace/bank-accounts");
  revalidatePath("/workspace/invoices");
  return { success: true };
}

export async function deleteBankAccount(id: string) {
  const ctx = await workspaceContext();
  if ("error" in ctx) return ctx;
  if (!["owner", "admin"].includes(ctx.role)) return { error: "Only workspace owners and admins can delete bank accounts." };
  const { error } = await ctx.supabase.from("bank_accounts").delete().eq("id", id).eq("business_id", ctx.businessId);
  if (error) return { error: error.message.includes("foreign key") ? "This account is used by invoices or payments and cannot be deleted. Deactivate it instead." : error.message };
  revalidatePath("/workspace/bank-accounts");
  revalidatePath("/workspace/invoices");
  return { success: true };
}
