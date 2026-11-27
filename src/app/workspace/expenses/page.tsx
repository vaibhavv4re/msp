import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Expenses } from "./Expenses";
export default async function WorkspaceExpensesPage(){
 const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect("/workspace");
 const bid=(await cookies()).get("backdrop_active_business_id")?.value;if(!bid)redirect("/workspace");
 const {data:member}=await supabase.from("business_members").select("role,businesses(name)").eq("business_id",bid).eq("user_id",user.id).maybeSingle();if(!member)redirect("/workspace");
 const [{data:expenses,error:expenseError},{data:attachments}]=await Promise.all([
  supabase.from("expenses").select("*").eq("business_id",bid).order("expense_date",{ascending:false}),
  supabase.from("attachments").select("*").eq("business_id",bid).not("expense_id","is",null)
 ]);
 if(expenseError)return <main className="p-8">Unable to load expenses: {expenseError.message}</main>;
 const attachmentByExpense=new Map((attachments??[]).map(a=>[a.expense_id,a]));
 const rows=(expenses??[]).map(x=>({...x,attachment:attachmentByExpense.get(x.id)??null}));
 const business=Array.isArray(member.businesses)?member.businesses[0]:member.businesses;
 return <Expenses businessId={bid} businessName={business?.name??"Workspace"} initialExpenses={rows as any}/>;
}