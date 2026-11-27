import {redirect} from "next/navigation";
import {cookies} from "next/headers";
import {createClient} from "@/lib/supabase/server";
import {TaxSettings} from "./TaxSettings";
export default async function TaxSettingsPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/workspace");
 const {data:memberships}=await supabase.from("business_members").select("business_id,role").eq("user_id",user.id).order("joined_at",{ascending:true});
 if(!memberships?.length)redirect("/workspace");const requested=(await cookies()).get("backdrop_active_business_id")?.value;const membership=memberships.find(x=>x.business_id===requested)||memberships[0];
 const [{data:taxes,error:taxError},{data:settings,error:settingsError}]=await Promise.all([
  supabase.from("tax_rates").select("id,name,tax_type,rate,is_default").eq("business_id",membership.business_id).order("rate",{ascending:true}),
  supabase.from("tax_settings").select("cgst_rate,sgst_rate,igst_rate").eq("business_id",membership.business_id).maybeSingle()
 ]);
 if(taxError)throw new Error(taxError.message);if(settingsError)throw new Error(settingsError.message);
 return <TaxSettings taxes={taxes||[]} settings={settings} canManage={["owner","admin","accountant"].includes(membership.role)} canDelete={["owner","admin"].includes(membership.role)}/>;
}
