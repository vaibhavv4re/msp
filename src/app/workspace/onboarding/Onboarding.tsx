"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessProfile } from "./actions";

type Business = {
  id:string; name:string; legal_name:string|null; business_type:string|null; address:string|null;
  city:string|null; state:string|null; pin:string|null; country:string|null; email:string|null;
  contact:string|null; pan:string|null; gstin:string|null; gst_type:string|null;
};
type Setup = { bank:boolean; service:boolean; tax:boolean };
const field = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const label = "block text-xs font-bold text-gray-600";

export function Onboarding({business,setup,role}:{business:Business;setup:Setup;role:string}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState(false);
  const initialStatus=business.gst_type==="Composition"?"composition":business.gstin?"registered":"unregistered";
  const [gstStatus,setGstStatus]=useState(initialStatus);
  const [form,setForm]=useState({
    name:business.name||"",legalName:business.legal_name||"",businessType:business.business_type||"",
    address:business.address||"",city:business.city||"",state:business.state||"",pin:business.pin||"",
    country:business.country||"India",email:business.email||"",contact:business.contact||"",
    pan:business.pan||"",gstin:business.gstin||"",
  });
  const update=(key:keyof typeof form,value:string)=>setForm(v=>({...v,[key]:value}));
  const tasks=[
    {title:"Business profile",detail:"Identity, address and contact details",done:!!(business.legal_name&&business.address&&business.city&&business.state&&business.email&&business.contact),href:"#business",required:true},
    {title:"PAN & GST registration",detail:"Tax identity and registration status",done:!!(business.pan&&(business.gst_type==="Unregistered"||business.gst_type==="Composition"||business.gstin)),href:"#tax",required:false},
    {title:"Bank account",detail:"Give clients a clear way to pay you",done:setup.bank,href:"/workspace/bank-accounts",required:false},
    {title:"Services & pricing",detail:"Add at least one service or offering",done:setup.service,href:"/workspace/services",required:false},
    {title:"Tax defaults",detail:"Configure GST rates for your invoices",done:setup.tax,href:"/workspace/tax-settings",required:false},
  ];
  const completed=tasks.filter(t=>t.done).length;
  const percent=Math.round(completed/tasks.length*100);
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError("");setSaved(false);
    const result=await saveBusinessProfile({...form,gstStatus});
    setBusy(false);
    if(result.error){setError(result.error);return;}
    setSaved(true);router.refresh();
  }
  const canEdit=["owner","admin"].includes(role);
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><Link href="/workspace" className="text-xs font-bold text-gray-500 hover:text-gray-900">← Dashboard</Link><p className="mt-4 text-[10px] font-black uppercase tracking-[.22em] text-blue-600">A better business starts here</p><h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950">Let’s set up your business.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">A few details help Backdrop create professional estimates and invoices. You can save now and finish the rest whenever you’re ready.</p></div>
      <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">{completed} of {tasks.length} complete</span>
    </div>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-end justify-between"><div><p className="text-xs font-bold text-gray-500">Setup progress</p><p className="mt-1 text-3xl font-black tabular-nums text-gray-950">{percent}%</p></div><p className="text-xs text-gray-400">Saved details count automatically</p></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:percent+"%"}}/></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {tasks.map(t=><a key={t.title} href={t.href} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${t.done?"bg-green-100 text-green-700":"bg-gray-100 text-gray-400"}`}>{t.done?"✓":"·"}</span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-gray-900">{t.title}</span><span className="mt-0.5 block text-[11px] text-gray-500">{t.detail}</span></span>
          <span className="text-gray-300">→</span>
        </a>)}
      </div>
    </section>
    <form onSubmit={submit} className="space-y-5">
      <section id="business" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">01 · Your business</p><h2 className="mt-1 text-lg font-black">Tell us who you are</h2><p className="mt-1 text-xs text-gray-500">These details appear on your business documents.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Business / trading name *<input required maxLength={160} value={form.name} onChange={e=>update("name",e.target.value)} className={field}/></label>
          <label className={label}>Legal name<input value={form.legalName} onChange={e=>update("legalName",e.target.value)} className={field} placeholder="As registered, if different"/></label>
          <label className={label}>Business type<select value={form.businessType} onChange={e=>update("businessType",e.target.value)} className={field}><option value="">Choose what describes you</option>{["Individual / Freelancer","Sole proprietorship","Partnership","LLP","Private Limited Company","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className={label}>Business email<input type="email" value={form.email} onChange={e=>update("email",e.target.value)} className={field} placeholder="you@studio.com"/></label>
          <label className={label}>Phone number<input value={form.contact} onChange={e=>update("contact",e.target.value)} className={field} placeholder="+91…"/></label>
          <label className={label}>Country<input value={form.country} onChange={e=>update("country",e.target.value)} className={field}/></label>
          <label className={label+" sm:col-span-2"}>Business address<textarea rows={2} value={form.address} onChange={e=>update("address",e.target.value)} className={field} placeholder="Street, building, area"/></label>
          <label className={label}>City<input value={form.city} onChange={e=>update("city",e.target.value)} className={field}/></label>
          <label className={label}>State<input value={form.state} onChange={e=>update("state",e.target.value)} className={field}/></label>
          <label className={label}>PIN code<input value={form.pin} onChange={e=>update("pin",e.target.value)} className={field}/></label>
        </div>
      </section>
      <section id="tax" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">02 · Tax identity</p><h2 className="mt-1 text-lg font-black">PAN & GST</h2><p className="mt-1 text-xs text-gray-500">Tell us your current registration status. This helps avoid incorrect tax defaults.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>PAN<input maxLength={10} value={form.pan} onChange={e=>update("pan",e.target.value.toUpperCase())} className={field+" uppercase"} placeholder="ABCDE1234F"/></label>
          <label className={label}>GST registration status<select value={gstStatus} onChange={e=>setGstStatus(e.target.value)} className={field}><option value="unregistered">Not registered</option><option value="registered">Regular GST registration</option><option value="composition">Composition scheme</option></select></label>
          {gstStatus==="registered"&&<label className={label+" sm:col-span-2"}>GSTIN<input maxLength={15} value={form.gstin} onChange={e=>update("gstin",e.target.value.toUpperCase())} className={field+" uppercase"} placeholder="27ABCDE1234F1Z5"/></label>}
        </div>
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">Backdrop stores the status you provide; it does not determine whether you are legally required to register or advise on tax eligibility. Confirm your position with your tax professional.</p>
      </section>
      {!canEdit&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Only workspace owners and admins can edit business identity. You can still complete services and other setup tasks from the links above.</p>}
      {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved&&<p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">Business profile saved. Your progress has been updated.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Your progress is saved when you save this section. Come back any time.</p><button disabled={busy||!canEdit} className="rounded-xl bg-gray-950 px-6 py-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:opacity-50">{busy?"Saving…":"Save business details"}</button></div>
    </form>
  </main>;
}
