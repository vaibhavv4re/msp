"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
const WRITERS=["owner","admin","accountant","employee"];
export async function updateItcReview(expenseId:string, review:"eligible"|"ineligible"|"review"|"unsure") {
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user) throw new Error("Please sign in again.");
 const businessId=(await cookies()).get("backdrop_active_business_id")?.value;
 if(!businessId) throw new Error("Choose a workspace first.");
 const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",user.id).maybeSingle();
 if(!member||!WRITERS.includes(member.role)) throw new Error("You cannot update ITC reviews in this workspace.");
 const {error}=await supabase.from("expenses").update({itc_review:review}).eq("id",expenseId).eq("business_id",businessId);
 if(error) throw new Error(error.message);
 revalidatePath("/workspace/gst");
}
