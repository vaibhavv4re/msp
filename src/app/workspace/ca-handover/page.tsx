import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {CaHandover} from "./CaHandover";
export default async function CaHandoverPage(){
 const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect("/workspace");
 const bid=(await cookies()).get("backdrop_active_business_id")?.value;if(!bid)redirect("/workspace");
 const {data:member}=await supabase.from("business_members").select("role,businesses(name,legal_name,gstin,pan,address,city,state)").eq("business_id",bid).eq("user_id",user.id).maybeSingle();if(!member)redirect("/workspace");
 const [inv,exp,tds,pay,att,banks,clients]=await Promise.all([
  supabase.from("invoices").select("*").eq("business_id",bid).order("invoice_date"),
  supabase.from("expenses").select("*").eq("business_id",bid).order("expense_date"),
  supabase.from("tds_entries").select("*").eq("business_id",bid).order("deduction_date"),
  supabase.from("payments").select("*").eq("business_id",bid).order("payment_date"),
  supabase.from("attachments").select("*").eq("business_id",bid),
  supabase.from("bank_accounts").select("id,label,bank_name,holder_name,account_number,ifsc,upi_id,is_active").eq("business_id",bid),
  supabase.from("clients").select("id,display_name,gstin,pan,tan").eq("business_id",bid)
 ]);
 const err=inv.error||exp.error||tds.error||pay.error||att.error||banks.error||clients.error;
 if(err)return <main className="p-8">Unable to load CA handover data: {err.message}</main>;
 const business=Array.isArray(member.businesses)?member.businesses[0]:member.businesses;
 return <CaHandover business={{name:business?.name??"Workspace",legal_name:business?.legal_name??"",gstin:business?.gstin??"",pan:business?.pan??"",address:business?.address??"",city:business?.city??"",state:business?.state??""}} invoices={inv.data??[]} expenses={exp.data??[]} tds={tds.data??[]} payments={pay.data??[]} attachments={att.data??[]} banks={banks.data??[]} clients={clients.data??[]}/>;
}