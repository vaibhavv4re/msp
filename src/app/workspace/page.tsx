import Link from "next/link";
import {cookies} from "next/headers";
import {createClient} from "@/lib/supabase/server";
import {WorkspaceActions} from "./WorkspaceActions";
import {WorkspaceSwitcher} from "./WorkspaceSwitcher";
import {DashboardSupabase} from "./DashboardSupabase";
export const metadata={title:"Backdrop | Business Overview"};
const COOKIE="backdrop_active_business_id";
export default async function WorkspacePage(){
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();const cookie=await cookies();
 if(authError||!user)return <main className="min-h-screen bg-[#090b10] px-5 py-12 text-white"><div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/[0.03] p-8"><div className="mb-8 text-2xl font-black">Backdrop<span className="text-blue-500">.</span></div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Business management suite</p><h1 className="mt-3 text-3xl font-black">Welcome to Backdrop</h1><p className="mt-3 text-sm leading-6 text-neutral-400">Sign in to access your business workspace.</p><div className="mt-8"><WorkspaceActions isAuthenticated={false}/></div></div></main>;
 const [{data:profile},{data:memberships,error:memberError}]=await Promise.all([supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),supabase.from("business_members").select("business_id,role,joined_at").eq("user_id",user.id).order("joined_at",{ascending:true})]);
 if(memberError)return <main className="p-8 text-red-600">Unable to load your workspaces: {memberError.message}</main>;
 const ids=(memberships??[]).map(m=>m.business_id);
 if(!ids.length)return <main className="min-h-screen bg-[#090b10] px-5 py-12 text-white"><div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] p-8"><h1 className="text-3xl font-black">Create your workspace</h1><p className="mt-3 text-sm text-neutral-400">Set up your business to start managing clients, estimates, invoices and expenses.</p><div className="mt-8"><WorkspaceActions isAuthenticated/></div></div></main>;
 const [{data:businesses,error:businessError},{data:invoices,error:invoiceError},{data:clients},{data:expenses},{data:payments},{data:tds},{data:events}]=await Promise.all([
  supabase.from("businesses").select("id,name,legal_name,business_type,brand_color,gstin").in("id",ids).order("name"),
  supabase.from("invoices").select("id,business_id,client_id,invoice_number,invoice_date,due_date,status,total,subtotal,cgst,sgst,igst,advance_amount,tds_amount").in("business_id",ids).order("invoice_date",{ascending:false}),
  supabase.from("clients").select("id,business_id,display_name,first_name,company_name,phone,mobile,work_phone").in("business_id",ids),
  supabase.from("expenses").select("id,business_id,amount,expense_date,status,gst_amount").in("business_id",ids),
  supabase.from("payments").select("id,business_id,invoice_id,amount,payment_date,tds_amount").in("business_id",ids),
  supabase.from("tds_entries").select("id,business_id,amount,deduction_date,has_certificate").in("business_id",ids),
  supabase.from("calendar_events").select("id,business_id,title,starts_at,ends_at,status").in("business_id",ids).order("starts_at",{ascending:true})
 ]);
 const err=businessError||invoiceError;if(err)return <main className="p-8 text-red-600">Unable to load dashboard: {err.message}</main>;
 const workspaces=(businesses??[]).map(b=>({...b,role:memberships?.find(m=>m.business_id===b.id)?.role??"viewer"}));
 const activeId=workspaces.some(b=>b.id===cookie.get(COOKIE)?.value)?cookie.get(COOKIE)!.value!:workspaces[0]?.id;
 if(!activeId)return <main className="p-8">No business workspace found.</main>;
 const business=workspaces.find(b=>b.id===activeId)!;const filter=<T,>(rows:T[]|null|undefined):T[]=>rows??[];
 const nav=[["Clients","/workspace/clients"],["Services","/workspace/services"],["Estimates","/workspace/estimates"],["Invoices","/workspace/invoices"],["Expenses","/workspace/expenses"],["Bank Accounts","/workspace/bank-accounts"],["Tax Settings","/workspace/tax-settings"],["TDS Tracking","/workspace/tds"],["GST & ITC","/workspace/gst"],["CA Handover","/workspace/ca-handover"]];
 return <><header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur"><div className="mx-auto flex min-h-[68px] max-w-[1600px] items-center gap-5 px-4 py-3 sm:px-6"><Link href="/workspace" className="shrink-0 text-2xl font-black tracking-tight text-gray-900">B<span className="text-blue-600">.</span></Link><div className="hidden h-8 w-px bg-gray-200 md:block"/><WorkspaceSwitcher workspaces={workspaces.map(({id,name,role})=>({id,name,role}))} activeWorkspaceId={activeId}/><nav aria-label="Main navigation" className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:thin]">{nav.map(([name,href])=><Link key={href} href={href} className="shrink-0 rounded-lg px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-gray-500 transition hover:bg-gray-100 hover:text-gray-950">{name}</Link>)}</nav></div></header><DashboardSupabase business={business} profileName={profile?.full_name??""} role={business.role} invoices={filter(invoices).filter(x=>x.business_id===activeId)} clients={filter(clients).filter(x=>x.business_id===activeId)} expenses={filter(expenses).filter(x=>x.business_id===activeId)} payments={filter(payments).filter(x=>x.business_id===activeId)} tds={filter(tds).filter(x=>x.business_id===activeId)} events={filter(events).filter(x=>x.business_id===activeId)}/></>;
}
