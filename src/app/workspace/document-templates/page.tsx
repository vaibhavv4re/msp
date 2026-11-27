import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentTemplates } from "./DocumentTemplates";

const COOKIE = "backdrop_active_business_id";
export default async function DocumentTemplatesPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/workspace");
  const { data: memberships } = await supabase.from("business_members").select("business_id,businesses(name)").eq("user_id", user.id).order("created_at", { ascending: true });
  if (!memberships?.length) redirect("/workspace");
  const cookieId = (await cookies()).get(COOKIE)?.value;
  const active = memberships.find(x => x.business_id === cookieId) ?? memberships[0];
  const business = Array.isArray(active.businesses) ? active.businesses[0] : active.businesses;
  const db = supabase as any;
  const { data, error: loadError } = await db.from("document_templates").select("id,name,description,document_type,is_default,document_template_blocks(id,block_key,block_type,title,default_content,is_enabled,is_required,sort_order)").eq("business_id", active.business_id).order("created_at", { ascending: true });
  if (loadError) return <main className="p-8 text-sm text-red-600">Unable to load templates: {loadError.message}</main>;
  const templates = (data ?? []).map((t: any) => ({ id:t.id, name:t.name, description:t.description, documentType:t.document_type, isDefault:t.is_default, blocks:(t.document_template_blocks ?? []).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((b:any)=>({id:b.id,blockKey:b.block_key,blockType:b.block_type,title:b.title,defaultContent:b.default_content ?? {},isEnabled:b.is_enabled,isRequired:b.is_required,sortOrder:b.sort_order})) }));
  return <div className="min-h-screen bg-gray-50"><header className="border-b border-gray-200 bg-white px-5 py-4"><div className="mx-auto flex max-w-7xl justify-between"><Link href="/workspace" className="text-sm font-semibold text-gray-700">← Workspace</Link><Link href="/workspace/estimates" className="text-xs font-bold text-gray-500 hover:text-gray-900">Estimates</Link></div></header><DocumentTemplates initialTemplates={templates} businessName={business?.name ?? "Workspace"}/></div>;
}
