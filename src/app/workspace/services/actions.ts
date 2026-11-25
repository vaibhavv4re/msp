"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function workspaceContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." as const };
  const store = await cookies();
  const businessId = store.get("backdrop_active_business_id")?.value;
  if (!businessId) return { error: "Choose a workspace first." as const };
  const { data: membership } = await supabase.from("business_members")
    .select("role").eq("business_id", businessId).eq("user_id", user.id).maybeSingle();
  if (!membership) return { error: "You do not have access to this workspace." as const };
  return { supabase, user, businessId, role: membership.role };
}

export async function saveService(input: { id?: string; name: string; description?: string; sacCode?: string; rate: number; isActive?: boolean }) {
  const ctx = await workspaceContext();
  if ("error" in ctx) return ctx;
  if (!["owner", "admin", "accountant", "employee"].includes(ctx.role)) return { error: "You do not have permission to manage services." };
  const name = input.name.trim();
  if (!name || !Number.isFinite(input.rate) || input.rate < 0) return { error: "Enter a valid service name and rate." };
  const payload = { name, description: input.description?.trim() || null, sac_code: input.sacCode?.trim() || null, rate: input.rate, is_active: input.isActive ?? true };
  const result = input.id
    ? await ctx.supabase.from("services").update(payload).eq("id", input.id).eq("business_id", ctx.businessId)
    : await ctx.supabase.from("services").insert({ ...payload, business_id: ctx.businessId, source: "manual" });
  if (result.error) return { error: result.error.message };
  revalidatePath("/workspace/services");
  return { success: true };
}

export async function updateServiceStatus(id: string, isActive: boolean) {
  const ctx = await workspaceContext();
  if ("error" in ctx) return ctx;
  if (!["owner", "admin", "accountant", "employee"].includes(ctx.role)) return { error: "You do not have permission to manage services." };
  const { error } = await ctx.supabase.from("services").update({ is_active: isActive }).eq("id", id).eq("business_id", ctx.businessId);
  if (error) return { error: error.message };
  revalidatePath("/workspace/services");
  return { success: true };
}

export async function removeService(id: string) {
  const ctx = await workspaceContext();
  if ("error" in ctx) return ctx;
  if (!["owner", "admin", "accountant"].includes(ctx.role)) return { error: "Only workspace owners, admins, or accountants can delete services." };
  const { error } = await ctx.supabase.from("services").delete().eq("id", id).eq("business_id", ctx.businessId);
  if (error) return { error: error.message };
  revalidatePath("/workspace/services");
  return { success: true };
}
