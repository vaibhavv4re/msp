import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GstWorkspace } from "./GstWorkspace";
export default async function GstPage(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user) redirect("/workspace");
 const businessId=(await cookies()).get("backdrop_active_business_id")?.value;
 if(!businessId) redirect("/workspace");
 const {data:member}=await supabase.from("business_members").select("role,businesses(name)").eq("business_id",businessId).eq("user_id",user.id).maybeSingle();
 if(!member) redirect("/workspace");
 const [{data:invoices,error:invoiceError},{data:expenses,error:expenseError}]=await Promise.all([
  supabase.from("invoices").select("id,invoice_number,invoice_date,status,subtotal,cgst,sgst,igst,total,client_id").eq("business_id",businessId).order("invoice_date",{ascending:false}),
  supabase.from("expenses").select("id,expense_date,display_id,category,description,vendor_name,vendor_gstin,amount,gst_charged,gst_amount,itc_review,status").eq("business_id",businessId).eq("status","confirmed").order("expense_date",{ascending:false})
 ]);
 if(invoiceError||expenseError) return <main className="p-8">Unable to load GST records: {invoiceError?.message??expenseError?.message}</main>;
 const {data:clients}=await supabase.from("clients").select("id,display_name").eq("business_id",businessId);
 const clientMap=new Map((clients??[]).map(c=>[c.id,c.display_name]));
 const invoiceRows=(invoices??[]).map(i=>({...i,client_name:i.client_id?clientMap.get(i.client_id)??"Client": "Unassigned"}));
 const business=Array.isArray(member.businesses)?member.businesses[0]:member.businesses;
 return <GstWorkspace businessName={business?.name??"Workspace"} invoices={invoiceRows} expenses={expenses??[]} />;
}
