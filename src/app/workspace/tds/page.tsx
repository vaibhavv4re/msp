import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TdsWorkspace } from "./TdsWorkspace";

export default async function WorkspaceTdsPage(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user) redirect("/workspace");
 const businessId=(await cookies()).get("backdrop_active_business_id")?.value;
 if(!businessId) redirect("/workspace");
 const {data:member}=await supabase.from("business_members").select("role,businesses(name)").eq("business_id",businessId).eq("user_id",user.id).maybeSingle();
 if(!member) redirect("/workspace");
 const [{data:entries,error:entriesError},{data:clients},{data:invoices}]=await Promise.all([
  supabase.from("tds_entries").select("*").eq("business_id",businessId).order("deduction_date",{ascending:false}),
  supabase.from("clients").select("id,display_name,first_name,company_name").eq("business_id",businessId).order("display_name"),
  supabase.from("invoices").select("id,invoice_number,client_id,invoice_date,total").eq("business_id",businessId).order("invoice_date",{ascending:false})
 ]);
 if(entriesError) return <main className="p-8">Unable to load TDS records: {entriesError.message}</main>;
 const clientById=new Map((clients??[]).map(c=>[c.id,c]));
 const invoiceById=new Map((invoices??[]).map(i=>[i.id,i]));
 const rows=(entries??[]).map(e=>({...e,clients:e.client_id?clientById.get(e.client_id)??null:null,invoices:e.invoice_id?invoiceById.get(e.invoice_id)??null:null}));
 const business=Array.isArray(member.businesses)?member.businesses[0]:member.businesses;
 return <TdsWorkspace entries={rows as any} clients={clients??[]} invoices={invoices??[]} role={member.role} businessName={business?.name??"Workspace"}/>;
}
