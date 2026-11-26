"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function context() {
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:"Please sign in again." as const};
 const businessId=(await cookies()).get("backdrop_active_business_id")?.value;
 if(!businessId)return {error:"Choose a workspace first." as const};
 const {data:membership}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",user.id).maybeSingle();
 if(!membership)return {error:"You do not have access to this workspace." as const};
 return {supabase,user,businessId,role:membership.role};
}
const EDIT=["owner","admin","accountant"];
export async function saveGstSettings(input:{cgst:number;sgst:number;igst:number}) {
 const c=await context(); if("error"in c)return c;
 if(!EDIT.includes(c.role))return {error:"Only owners, admins and accountants can change tax settings."};
 const rates=[input.cgst,input.sgst,input.igst];
 if(rates.some(x=>!Number.isFinite(x)||x<0||x>100))return {error:"Enter valid GST rates between 0 and 100."};
 const {error}=await c.supabase.from("tax_settings").upsert({business_id:c.businessId,cgst_rate:input.cgst,sgst_rate:input.sgst,igst_rate:input.igst,is_default:true},{onConflict:"business_id"});
 if(error)return {error:error.message};
 revalidatePath("/workspace/tax-settings");revalidatePath("/workspace/invoices");
 return {success:true};
}
export async function saveTaxRate(input:{id?:string;name:string;taxType:string;rate:number}) {
 const c=await context();if("error"in c)return c;
 if(!EDIT.includes(c.role))return {error:"Only owners, admins and accountants can manage tax rates."};
 const name=input.name.trim();if(!name||!Number.isFinite(input.rate)||input.rate<0||input.rate>100)return {error:"Enter a tax name and a rate between 0 and 100."};
 const payload={name,tax_type:input.taxType,rate:input.rate};
 const result=input.id?await c.supabase.from("tax_rates").update(payload).eq("id",input.id).eq("business_id",c.businessId):await c.supabase.from("tax_rates").insert({...payload,business_id:c.businessId,is_default:false});
 if(result.error)return {error:result.error.message};
 revalidatePath("/workspace/tax-settings");revalidatePath("/workspace/invoices");return {success:true};
}
export async function setDefaultTaxRate(id:string) {
 const c=await context();if("error"in c)return c;
 if(!EDIT.includes(c.role))return {error:"Only owners, admins and accountants can manage tax rates."};
 const {data:target,error:readError}=await c.supabase.from("tax_rates").select("id").eq("id",id).eq("business_id",c.businessId).maybeSingle();
 if(readError||!target)return {error:readError?.message||"Tax rate not found in this workspace."};
 const {error:clearError}=await c.supabase.from("tax_rates").update({is_default:false}).eq("business_id",c.businessId);
 if(clearError)return {error:clearError.message};
 const {error}=await c.supabase.from("tax_rates").update({is_default:true}).eq("id",id).eq("business_id",c.businessId);
 if(error)return {error:error.message};
 revalidatePath("/workspace/tax-settings");revalidatePath("/workspace/invoices");return {success:true};
}
export async function deleteTaxRate(id:string) {
 const c=await context();if("error"in c)return c;
 if(!["owner","admin"].includes(c.role))return {error:"Only workspace owners and admins can delete tax rates."};
 const {error}=await c.supabase.from("tax_rates").delete().eq("id",id).eq("business_id",c.businessId);
 if(error)return {error:error.message};
 revalidatePath("/workspace/tax-settings");revalidatePath("/workspace/invoices");return {success:true};
}
