"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
const COOKIE = "backdrop_active_business_id";
const WRITERS = ["owner","admin","accountant","employee"];
async function context() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please sign in again.");
  const businessId = (await cookies()).get(COOKIE)?.value;
  if (!businessId) throw new Error("Choose a workspace first.");
  const { data: member } = await supabase.from("business_members").select("role")
    .eq("business_id", businessId).eq("user_id", user.id).maybeSingle();
  if (!member) throw new Error("You do not have access to this workspace.");
  return { supabase, user, businessId, role: member.role };
}
export async function saveExpense(input: any) {
  const { supabase, user, businessId, role } = await context();
  if (!WRITERS.includes(role)) throw new Error("You cannot edit expenses.");
  if (input.business_id !== businessId) throw new Error("Workspace mismatch.");
  const expense = { ...input, created_by: user.id };
  const { data, error } = await supabase.rpc("save_expense_with_attachment", {
    p_expense: expense, p_attachment: input.attachment ?? null
  });
  if (error) throw new Error(error.message);
  revalidatePath("/workspace/expenses");
  return data as string;
}
export async function deleteExpense(id: string) {
  const { supabase, businessId, role } = await context();
  if (!["owner","admin","accountant"].includes(role)) throw new Error("You cannot delete expenses.");
  const { data: attachment } = await supabase.from("attachments").select("public_id")
    .eq("expense_id", id).eq("business_id", businessId).maybeSingle();
  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath("/workspace/expenses");
  return attachment?.public_id ?? null;
}
