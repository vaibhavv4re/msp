"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
const ACTIVE_WORKSPACE_COOKIE="backdrop_active_business_id";
async function context(){
 const supabase=await createClient(); const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return {error:"Please sign in again." as const};
 const businessId=(await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
 if(!businessId)return {error:"Choose a workspace first." as const};
 const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",user.id).maybeSingle();
 if(!member)return {error:"You do not have access to this workspace." as const};
 return {supabase,user,businessId,role:member.role};
}
const writers=["owner","admin","accountant","employee"];
export async function saveEstimate(input:{id?:string;businessId:string;clientId:string|null;estimateNumber?:string;date?:string;validUntil?:string;status:string;recipientName:string;recipientContact?:string;subtotal:number;total:number;notes:string;termsAndConditions:string;advanceIntent:number;requiresAdvance:boolean;advancePercentage:number;advanceDeadlineDays:number;lineItems:Array<{id?:string;description:string;quantity:number;rate:number;amount:number;itemType:string;serviceId:string|null;sacCode:string|null;sortOrder:number}>}){
 const c=await context();if("error"in c)return c;if(!writers.includes(c.role))return {error:"You do not have permission to manage estimates."};
 if(input.businessId!==c.businessId)return {error:"Estimates can only be saved in the active workspace."};
 if(!input.recipientName.trim())return {error:"Recipient name is required."};
 if(!["draft","shared","confirmed","expired"].includes(input.status))return {error:"Invalid estimate status."};
 const payload={id:input.id??null,business_id:c.businessId,client_id:input.clientId,estimate_number:input.estimateNumber??null,estimate_date:input.date||null,valid_until:input.validUntil||null,status:input.status,recipient_name:input.recipientName.trim(),recipient_contact:input.recipientContact||null,subtotal:input.subtotal,total:input.total,notes:input.notes,terms_and_conditions:input.termsAndConditions,advance_intent:input.advanceIntent,requires_advance:input.requiresAdvance,advance_percentage:input.advancePercentage,advance_deadline_days:input.advanceDeadlineDays,template_id:input.templateId??null,content_blocks:input.contentBlocks??[],document_version:input.documentVersion??1};
 const items=input.lineItems.map((x,i)=>({id:x.id||null,item_type:x.itemType,description:x.description,quantity:x.quantity,rate:x.rate,amount:x.amount,service_id:x.serviceId,sac_code:x.sacCode,sort_order:i}));
 const {data,error}=await c.supabase.rpc("save_estimate_with_items",{p_estimate:payload,p_items:items});
 if(error)return {error:error.message};
 const estimateId=data as string;
 revalidatePath("/workspace/estimates");return {success:true,id:estimateId};
}
export async function convertEstimateToInvoice(input:{estimateId:string;clientId?:string|null}){
 const c=await context();if("error"in c)return c;
 if(!writers.includes(c.role))return {error:"You do not have permission to convert estimates."};
 const {data:estimate,error:estimateError}=await c.supabase.from("estimates").select("id,business_id,status,client_id").eq("id",input.estimateId).eq("business_id",c.businessId).maybeSingle();
 if(estimateError)return {error:estimateError.message};if(!estimate)return {error:"Estimate not found in this workspace."};
 if(estimate.status!=="confirmed")return {error:"Only confirmed estimates can be converted."};
 const {data:business,error:businessError}=await c.supabase.from("businesses").select("invoice_prefix,invoice_separator,invoice_include_fy,invoice_fy_format,invoice_start_number,invoice_padding").eq("id",c.businessId).single();
 if(businessError)return {error:businessError.message};
 const {data:existing,error:invoiceError}=await c.supabase.from("invoices").select("invoice_number").eq("business_id",c.businessId);
 if(invoiceError)return {error:invoiceError.message};
 const prefix=business.invoice_prefix||"INV";const separator=business.invoice_separator||"/";
 const now=new Date();const fy=String(now.getFullYear()).slice(-2);
 const fyFormat=business.invoice_fy_format==="25"?fy:"FY"+fy;
 const pattern=prefix+separator+(business.invoice_include_fy?fyFormat+separator:"");
 let max=0;for(const row of existing??[]){const number=row.invoice_number||"";if(number.startsWith(pattern)){const n=parseInt(number.slice(pattern.length),10);if(Number.isFinite(n)&&n>max)max=n;}}
 const seq=Math.max(business.invoice_start_number||1,max+1);
 const invoiceNumber=pattern+String(seq).padStart(business.invoice_padding||4,"0");
 const {data:bank}=await c.supabase.from("bank_accounts").select("id").eq("business_id",c.businessId).eq("is_active",true).order("created_at",{ascending:true}).limit(1).maybeSingle();
 const {data,error}=await c.supabase.rpc("convert_estimate_to_invoice",{p_estimate_id:input.estimateId,p_client_id:input.clientId||estimate.client_id||null,p_invoice_number:invoiceNumber,p_invoice_date:new Date().toISOString().slice(0,10),p_bank_account_id:bank?.id??null});
 if(error)return {error:error.message};
 revalidatePath("/workspace/estimates");revalidatePath("/workspace/invoices");
 return {success:true,invoiceId:data as string,invoiceNumber};
}
export async function deleteEstimate(id:string){const c=await context();if("error"in c)return c;if(!["owner","admin","accountant"].includes(c.role))return {error:"You do not have permission to delete estimates."};const {error}=await c.supabase.from("estimates").delete().eq("id",id).eq("business_id",c.businessId);if(error)return {error:error.message};revalidatePath("/workspace/estimates");return {success:true};}
export async function updateEstimateStatus(id:string,status:string){const c=await context();if("error"in c)return c;if(!writers.includes(c.role))return {error:"You do not have permission to update estimates."};if(!["draft","shared","confirmed","expired"].includes(status))return {error:"Invalid estimate status."};const {data,error}=await c.supabase.from("estimates").update({status,updated_at:new Date().toISOString()}).eq("id",id).eq("business_id",c.businessId).select("id").maybeSingle();if(error)return {error:error.message};if(!data)return {error:"Estimate not found in this workspace."};revalidatePath("/workspace/estimates");return {success:true};}
