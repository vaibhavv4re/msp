"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const COOKIE = "backdrop_active_business_id";
const writers = ["owner", "admin", "accountant", "employee"];

async function getContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please sign in again.");
  const businessId = (await cookies()).get(COOKIE)?.value;
  if (!businessId) throw new Error("Choose a workspace first.");
  const { data: member } = await supabase.from("business_members").select("role").eq("business_id", businessId).eq("user_id", user.id).maybeSingle();
  if (!member) throw new Error("You do not have access to this workspace.");
  if (!writers.includes(member.role)) throw new Error("You do not have permission to manage document templates.");
  return { supabase: supabase as any, user, businessId };
}

export async function saveDocumentTemplate(input: {
  id?: string;
  name: string;
  description?: string;
  documentType: "estimate" | "invoice" | "both";
  isDefault?: boolean;
  blocks: Array<{ id?: string; blockKey: string; blockType: string; title: string; defaultContent: Record<string, unknown>; isEnabled: boolean; isRequired: boolean; sortOrder: number }>;
}) {
  const { supabase, user, businessId } = await getContext();
  if (!input.name.trim()) throw new Error("Template name is required.");
  const templatePayload = {
    business_id: businessId, name: input.name.trim(), description: input.description?.trim() || null,
    document_type: input.documentType, is_default: !!input.isDefault, is_active: true, updated_at: new Date().toISOString(),
  };
  let templateId = input.id;
  if (templateId) {
    const { error } = await supabase.from("document_templates").update(templatePayload).eq("id", templateId).eq("business_id", businessId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("document_templates").insert({ ...templatePayload, created_by: user.id }).select("id").single();
    if (error) throw new Error(error.message);
    templateId = data.id;
  }
  if (input.isDefault) {
    const { error } = await supabase.from("document_templates").update({ is_default: false }).eq("business_id", businessId).neq("id", templateId);
    if (error) throw new Error(error.message);
  }
  const existing = await supabase.from("document_template_blocks").select("id").eq("template_id", templateId).eq("business_id", businessId);
  if (existing.error) throw new Error(existing.error.message);
  const incomingIds = input.blocks.flatMap(block => block.id ? [block.id] : []);
  const removed = (existing.data ?? []).filter((block: any) => !incomingIds.includes(block.id)).map((block: any) => block.id);
  if (removed.length) {
    const { error } = await supabase.from("document_template_blocks").delete().in("id", removed).eq("business_id", businessId);
    if (error) throw new Error(error.message);
  }
  for (const [index, block] of input.blocks.entries()) {
    const payload = {
      template_id: templateId, business_id: businessId, block_key: block.blockKey, block_type: block.blockType,
      title: block.title, default_content: block.defaultContent ?? {}, is_enabled: !!block.isEnabled,
      is_required: !!block.isRequired, sort_order: index,
    };
    const result = block.id
      ? await supabase.from("document_template_blocks").update(payload).eq("id", block.id).eq("business_id", businessId)
      : await supabase.from("document_template_blocks").insert(payload);
    if (result.error) throw new Error(result.error.message);
  }
  if (!templateId) throw new Error("Could not determine the saved template ID.");
  revalidatePath("/workspace/document-templates");
  revalidatePath("/workspace/estimates");
  revalidatePath("/workspace/invoices");
  return { id: templateId };
}

export async function deleteDocumentTemplate(id: string) {
  const { supabase, businessId } = await getContext();
  const { error } = await supabase.from("document_templates").delete().eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath("/workspace/document-templates");
}
