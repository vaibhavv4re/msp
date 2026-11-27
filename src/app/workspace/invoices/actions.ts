"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
const COOKIE="backdrop_active_business_id";
async function context(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user) throw new Error("Please sign in again.");
 const businessId=(await cookies()).get(COOKIE)?.value;
 if(!businessId) throw new Error("Choose a workspace first.");
 const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",user.id).maybeSingle();
 if(!member) throw new Error("You do not have access to this workspace.");
 return {supabase,user,businessId,role:member.role};
}
const writers=["owner","admin","accountant","employee"];
export async function saveInvoice(input:any){
 const {supabase,user,businessId,role}=await context();
 if(!writers.includes(role)) throw new Error("You do not have permission to edit invoices.");
 if(input.business_id!==businessId) throw new Error("Invoice workspace mismatch.");
 const payload={...input,template_id:input.template_id??null,content_blocks:input.content_blocks??[],document_version:input.document_version??1,created_by:user.id};
 const {data,error}=await supabase.rpc("save_invoice_with_items",{p_invoice:payload,p_items:input.items??[]});
 if(error) throw new Error(error.message);
 if(input.tax_details!==undefined){
  const {error:taxError}=await supabase.from("invoices").update({tax_details:input.tax_details}).eq("id",data).eq("business_id",businessId);
  if(taxError) throw new Error(taxError.message);
 }
 revalidatePath("/workspace/invoices");
 return data as string;
}
export async function deleteInvoice(id:string){
 const {supabase,businessId,role}=await context();
 if(!["owner","admin","accountant"].includes(role)) throw new Error("You do not have permission to delete invoices.");
 const {error}=await supabase.from("invoices").delete().eq("id",id).eq("business_id",businessId);
 if(error) throw new Error(error.message);
 revalidatePath("/workspace/invoices");
}
export async function updateInvoiceStatus(id:string,status:string){
 const {supabase,businessId,role}=await context();
 if(!writers.includes(role)) throw new Error("You do not have permission to update invoices.");
 const update:any={status,updated_at:new Date().toISOString()};
 if(status==="Sent") update.sent_at=new Date().toISOString();
 const {error}=await supabase.from("invoices").update(update).eq("id",id).eq("business_id",businessId);
 if(error) throw new Error(error.message);
 revalidatePath("/workspace/invoices");
}
export async function recordInvoicePayment(input:{invoiceId:string;cashAmount:number;tdsAmount:number;tdsSection?:string}){
 const {supabase,businessId,role}=await context();
 if(!writers.includes(role)) throw new Error("You do not have permission to record payments.");
 const {error}=await supabase.rpc("record_invoice_payment",{p_invoice_id:input.invoiceId,p_business_id:businessId,p_cash_amount:input.cashAmount,p_tds_amount:input.tdsAmount,p_tds_section:input.tdsSection??null});
 if(error) throw new Error(error.message);
 revalidatePath("/workspace/invoices");
}
