import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {Invoices as InvoicesSupabase} from "./InvoicesSupabase";
const ACTIVE_WORKSPACE_COOKIE="backdrop_active_business_id";
export default async function WorkspaceInvoicesPage(){
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)redirect("/workspace");
 const {data:memberships,error:membershipError}=await supabase.from("business_members").select("business_id,role,businesses(*)").eq("user_id",user.id).order("joined_at",{ascending:true});
 if(membershipError||!memberships?.length)redirect("/workspace");
 const cookieBusinessId=(await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
 const active=memberships.find(x=>x.business_id===cookieBusinessId)??memberships[0];
 const rawBusiness=Array.isArray(active.businesses)?active.businesses[0]:active.businesses;
 const bid=active.business_id;
 const [inv,items,clients,accounts,services,taxes,terms]=await Promise.all([
  supabase.from("invoices").select("*").eq("business_id",bid).order("invoice_date",{ascending:false}),
  supabase.from("invoice_items").select("*").eq("business_id",bid).order("sort_order"),
  supabase.from("clients").select("*").eq("business_id",bid).order("display_name"),
  supabase.from("bank_accounts").select("*").eq("business_id",bid).order("created_at"),
  supabase.from("services").select("*").eq("business_id",bid).order("name"),
  supabase.from("tax_rates").select("*").eq("business_id",bid),
  supabase.from("terms_templates").select("*").eq("business_id",bid)
 ]);
 if(inv.error)return <main className="p-8">Unable to load invoices: {inv.error.message}</main>;
 const business:any={id:bid,name:rawBusiness?.name??"Workspace",legalName:rawBusiness?.legal_name,address:rawBusiness?.address,city:rawBusiness?.city,state:rawBusiness?.state,pin:rawBusiness?.pin,country:rawBusiness?.country,email:rawBusiness?.email,gst:rawBusiness?.gstin,color:rawBusiness?.brand_color,signatureUrl:rawBusiness?.signature_url,invoiceTemplate:rawBusiness?.invoice_template,bankAccounts:(accounts.data??[]).map(a=>({id:a.id,label:a.label,bankName:a.bank_name,holderName:a.holder_name,accountNumber:a.account_number,ifsc:a.ifsc,upiId:a.upi_id,chequeName:a.cheque_name,isActive:a.is_active}))};
 const clientList:any[]=(clients.data??[]).map(c=>({id:c.id,displayName:c.display_name,firstName:c.first_name,lastName:c.last_name,email:c.email,phone:c.phone,address:c.address,gst:c.gstin,paymentTerms:c.payment_terms,customTermDays:c.custom_term_days}));
 const itemMap=new Map<string,any[]>();
 for(const x of items.data??[]){const a=itemMap.get(x.invoice_id)??[];a.push({id:x.id,itemType:x.item_type,description:x.description,sacCode:x.sac_code,quantity:x.quantity,rate:x.rate,amount:x.amount,serviceId:x.service_id});itemMap.set(x.invoice_id,a);}
 const invoiceList:any[]=(inv.data??[]).map(x=>({id:x.id,invoiceNumber:x.invoice_number,invoiceDate:x.invoice_date??"",orderNumber:x.order_number??"",paymentTerms:x.payment_terms??"",dueDate:x.due_date??"",subject:x.subject??"",status:x.status,subtotal:x.subtotal,cgst:x.cgst,sgst:x.sgst,igst:x.igst,total:x.total,notes:x.notes??"",termsAndConditions:x.terms_and_conditions??"",usageType:x.usage_type??"",usageOther:x.usage_other??"",usageDuration:x.usage_duration??"",usageGeography:x.usage_geography??"",usageExclusivity:x.usage_exclusivity??"",advanceAmount:x.advance_amount,isAdvanceReceived:x.is_advance_received,tdsDeducted:x.tds_deducted,tdsAmount:x.tds_amount,taxDetails:x.tax_details??[],sentAt:x.sent_at,paidAt:x.paid_at,client:x.client_id?{id:x.client_id}:undefined,business:{id:bid},bankAccount:x.bank_account_id?business.bankAccounts.find((a:any)=>a.id===x.bank_account_id):undefined,sourceEstimate:x.source_estimate_id?{id:x.source_estimate_id}:undefined,lineItems:itemMap.get(x.id)??[]}));
 const serviceList=(services.data??[]).map(x=>({id:x.id,name:x.name,sacCode:x.sac_code??"",rate:x.rate,isActive:x.is_active}));
 const taxList=(taxes.data??[]).map(x=>({id:x.id,name:x.name??"Tax",taxType:x.tax_type??"Other",rate:x.rate,isDefault:x.is_default}));
 const termList=(terms.data??[]).map(x=>({id:x.id,title:x.title,content:x.content??"",isDefault:x.is_default}));
 return <div className="min-h-screen bg-gray-100"><div className="border-b border-gray-200 bg-white px-5 py-4"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link href="/workspace" className="text-sm font-semibold text-gray-700 hover:text-black">← Workspace</Link><span className="text-xs font-bold uppercase tracking-widest text-gray-500">{business.name} · Invoices</span></div></div><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><InvoicesSupabase invoices={invoiceList} clients={clientList} userId={user.id} services={serviceList} taxes={taxList} termsTemplates={termList} businesses={[business]} activeBusinessId={bid} allInvoices={invoiceList}/></main></div>;
}
