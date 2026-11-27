"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {LayoutDashboard,BriefcaseBusiness,WalletCards,ReceiptText,Database} from "lucide-react";
import {WorkspaceSwitcher} from "./WorkspaceSwitcher";
import {WorkspaceLogout} from "./WorkspaceLogout";

type Workspace={id:string;name:string;role:string};
const items=[
 {label:"Dashboard",href:"/workspace",icon:LayoutDashboard,match:["/workspace"]},
 {label:"Work",href:"/workspace/clients",icon:BriefcaseBusiness,match:["/workspace/clients","/workspace/services","/workspace/estimates","/workspace/invoices"]},
 {label:"Money",href:"/workspace/expenses",icon:WalletCards,match:["/workspace/expenses","/workspace/bank-accounts"]},
 {label:"Tax Zone",href:"/workspace/gst",icon:ReceiptText,match:["/workspace/gst","/workspace/tds","/workspace/tax-settings"]},
 {label:"Data",href:"/workspace/ca-handover",icon:Database,match:["/workspace/ca-handover"]},
];
export function WorkspaceShell({children,workspaces,activeWorkspaceId,profileName}:{children:React.ReactNode;workspaces:Workspace[];activeWorkspaceId:string|null;profileName:string}){
 const pathname=usePathname();
 return <div className="min-h-screen bg-[#f5f6f8] text-gray-900">
  <header className="sticky top-0 z-50 border-b border-gray-200/90 bg-white/95 shadow-[0_2px_12px_rgba(15,23,42,.035)] backdrop-blur-xl">
   <div className="mx-auto flex h-[68px] max-w-[1600px] items-center gap-5 px-4 sm:px-6">
    <Link href="/workspace" aria-label="Backdrop home" className="shrink-0 text-[30px] font-black leading-none tracking-[-.09em] text-[#111827]">B<span className="text-blue-600">.</span></Link>
    <div className="hidden h-8 w-px bg-gray-200 lg:block"/>
    <div className="hidden min-w-0 md:block"><WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId}/></div>
    <nav aria-label="Primary navigation" className="ml-auto hidden h-full items-center gap-1 lg:flex">
     {items.map(item=>{const active=item.match.includes(pathname)||(item.href!=="/workspace"&&pathname.startsWith(item.href+"/"));const Icon=item.icon;return <Link key={item.label} href={item.href} aria-current={active?"page":undefined} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[11px] font-extrabold tracking-wide transition-all duration-200 ${active?"bg-[#111827] text-white shadow-md shadow-slate-900/10":"text-gray-500 hover:bg-gray-100 hover:text-gray-950"}`}><Icon size={15} strokeWidth={2.2}/>{item.label}</Link>})}
    </nav>
    <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-3">
     <div className="hidden max-w-[150px] truncate text-right sm:block"><p className="truncate text-[11px] font-extrabold uppercase tracking-wide">{profileName||"Your account"}</p><p className="text-[10px] text-gray-400">Backdrop workspace</p></div>
     <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-xs font-black text-white">{(profileName||"U").trim().charAt(0).toUpperCase()}</div>
     <WorkspaceLogout/>
    </div>
   </div>
   <div className="border-t border-gray-100 px-4 py-2 md:hidden"><WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId}/></div>
  </header>
  <div className="pb-24 lg:pb-0">{children}</div>
  <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_28px_rgba(15,23,42,.08)] backdrop-blur-xl lg:hidden">
   <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">{items.filter(x=>x.label!=="Settings").map(item=>{const active=item.match.includes(pathname)||(item.href!=="/workspace"&&pathname.startsWith(item.href+"/"));const Icon=item.icon;return <Link key={item.label} href={item.href} aria-current={active?"page":undefined} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-extrabold transition ${active?"text-blue-700":"text-gray-400 hover:text-gray-700"}`}><span className={`flex h-7 w-10 items-center justify-center rounded-xl ${active?"bg-blue-50":"bg-transparent"}`}><Icon size={19} strokeWidth={2.1}/></span>{item.label}</Link>})}</div>
  </nav>
 </div>;
}
