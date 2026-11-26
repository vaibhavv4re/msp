import {cookies} from "next/headers";
import {createClient} from "@/lib/supabase/server";
import {WorkspaceShell} from "./WorkspaceShell";

const ACTIVE_WORKSPACE_COOKIE="backdrop_active_business_id";

export default async function WorkspaceLayout({children}:{children:React.ReactNode}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return <>{children}</>;
 const [{data:profile},{data:memberships}]=await Promise.all([
  supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
  supabase.from("business_members").select("business_id,role, businesses(id,name)").eq("user_id",user.id).order("joined_at",{ascending:true})
 ]);
 const list=(memberships??[]).map((m:any)=>({id:m.business_id,name:Array.isArray(m.businesses)?m.businesses[0]?.name??"Business":m.businesses?.name??"Business",role:m.role??"viewer"}));
 const requested=(await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
 const active=list.some((w:any)=>w.id===requested)?requested:list[0]?.id??null;
 return <WorkspaceShell workspaces={list} activeWorkspaceId={active} profileName={profile?.full_name??user.email?.split("@")[0]??"Account"}>{children}</WorkspaceShell>;
}
