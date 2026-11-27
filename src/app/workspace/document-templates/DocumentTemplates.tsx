"use client";

import { useMemo, useState } from "react";
import { deleteDocumentTemplate, saveDocumentTemplate } from "./actions";

type Block = { id?: string; blockKey: string; blockType: string; title: string; defaultContent: Record<string, unknown>; isEnabled: boolean; isRequired: boolean; sortOrder: number };
type Template = { id: string; name: string; description?: string | null; documentType: "estimate" | "invoice" | "both"; isDefault: boolean; blocks: Block[] };

const catalog = [
  ["introduction", "Introduction", "text", "Both"], ["project_description", "Project description", "text", "Estimate"],
  ["scope_of_work", "Scope of work", "rich_text", "Estimate"], ["deliverables", "Deliverables", "rich_text", "Estimate"],
  ["milestones", "Milestones", "rich_text", "Estimate"], ["timeline", "Timeline", "text", "Estimate"],
  ["creative_direction", "Creative direction", "rich_text", "Both"], ["revisions_approvals", "Revisions & approvals", "rich_text", "Both"],
  ["image_licensing", "Image usage & licensing", "rich_text", "Both"], ["payment_schedule", "Payment schedule", "rich_text", "Both"],
  ["payment_instructions", "Payment instructions", "text", "Invoice"], ["notes", "Additional notes", "rich_text", "Both"],
  ["custom_clause", "Custom clause", "rich_text", "Both"], ["attachments", "Attachments", "attachments", "Both"],
] as const;

const starterBlocks = (type: Template["documentType"]): Block[] => catalog
  .filter(([, , , applies]) => applies === "Both" || applies === (type === "estimate" ? "Estimate" : "Invoice"))
  .filter(([key]) => ["introduction", "scope_of_work", "deliverables", "payment_schedule", "notes"].includes(key))
  .map(([key, title, kind], index) => ({ blockKey: key, blockType: kind, title, defaultContent: { text: "" }, isEnabled: true, isRequired: false, sortOrder: index }));

export function DocumentTemplates({ initialTemplates, businessName }: { initialTemplates: Template[]; businessName: string }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(initialTemplates[0]?.id ?? "");
  const selected = templates.find(t => t.id === selectedId);
  const [name, setName] = useState(selected?.name ?? "");
  const [description, setDescription] = useState(selected?.description ?? "");
  const [documentType, setDocumentType] = useState<Template["documentType"]>(selected?.documentType ?? "both");
  const [isDefault, setIsDefault] = useState(selected?.isDefault ?? false);
  const [blocks, setBlocks] = useState<Block[]>(selected?.blocks ?? starterBlocks("both"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");\n  const [customTitle, setCustomTitle] = useState("");
  const available = useMemo(() => catalog.filter(([key]) => !blocks.some(b => b.blockKey === key)), [blocks]);

  function load(template?: Template) {
    setSelectedId(template?.id ?? ""); setName(template?.name ?? ""); setDescription(template?.description ?? "");
    setDocumentType(template?.documentType ?? "both"); setIsDefault(template?.isDefault ?? false); setBlocks(template?.blocks?.map(b => ({...b})) ?? starterBlocks("both")); setError("");
  }
  function addBlock(key: string) {
    const item = catalog.find(x => x[0] === key); if (!item) return;
    setBlocks(prev => [...prev, { blockKey: item[0], blockType: item[2], title: item[1], defaultContent: { text: "" }, isEnabled: true, isRequired: false, sortOrder: prev.length }]);
  }
  async function save() {
    setSaving(true); setError("");
    try {
      const result = await saveDocumentTemplate({ id: selectedId || undefined, name, description, documentType, isDefault, blocks });
      const saved: Template = { id: result.id, name, description, documentType, isDefault, blocks: blocks.map((b, i) => ({...b, sortOrder:i})) };
      setTemplates(prev => selectedId ? prev.map(t => t.id === selectedId ? saved : t) : [...prev, saved]);
      load(saved);
    } catch (e: any) { setError(e.message || "Could not save template."); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!selected || !confirm("Delete this template? Documents already using it will prevent deletion.")) return;
    try { await deleteDocumentTemplate(selected.id); const next = templates.filter(t => t.id !== selected.id); setTemplates(next); load(next[0]); }
    catch (e: any) { setError(e.message || "Could not delete template."); }
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction; if (target < 0 || target >= blocks.length) return;
    const next = [...blocks]; [next[index], next[target]] = [next[target], next[index]]; setBlocks(next);
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-gray-400">{businessName}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">Document templates</h1><p className="mt-2 max-w-2xl text-sm text-gray-500">Build reusable estimate and invoice layouts from optional content modules. Pricing, tax and payment records stay structured separately.</p></div><button onClick={() => load()} className="rounded-xl bg-gray-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white">+ New template</button></div>
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-3xl border border-gray-200 bg-white p-4"><h2 className="mb-3 px-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Your templates</h2>{templates.map(t => <button key={t.id} onClick={() => load(t)} className={`mb-2 w-full rounded-xl px-3 py-3 text-left ${selectedId === t.id ? "bg-gray-900 text-white" : "hover:bg-gray-50 text-gray-700"}`}><span className="block text-sm font-bold">{t.name}</span><span className={`mt-1 block text-[10px] uppercase tracking-wider ${selectedId === t.id ? "text-white/60" : "text-gray-400"}`}>{t.documentType}{t.isDefault ? " · Default" : ""}</span></button>)}{templates.length === 0 && <p className="p-3 text-xs text-gray-400">No templates yet. Create your first one.</p>}</aside>
      <section className="rounded-3xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-bold text-gray-600">Template name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Creative project proposal" className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900"/></label><label className="text-xs font-bold text-gray-600">Document type<select value={documentType} onChange={e=>setDocumentType(e.target.value as any)} className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900"><option value="both">Estimates & invoices</option><option value="estimate">Estimates only</option><option value="invoice">Invoices only</option></select></label></div>
        <label className="mt-4 block text-xs font-bold text-gray-600">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} placeholder="When should this template be used?" className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900"/></label>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-black text-gray-900">Content modules</h2><p className="mt-1 text-xs text-gray-500">Add only the sections this profession or document needs.</p></div><select defaultValue="" onChange={e=>{if(e.target.value){addBlock(e.target.value);e.target.value="";}}} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700"><option value="">+ Add module</option>{available.map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></div>
        <div className="mt-3 flex gap-2"><input value={customTitle} onChange={e=>setCustomTitle(e.target.value)} placeholder="Name a new custom module..." className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800"/><button type="button" disabled={!customTitle.trim()} onClick={()=>{const title=customTitle.trim();setBlocks(prev=>[...prev,{blockKey:"custom_"+Date.now(),blockType:"rich_text",title,defaultContent:{text:""},isEnabled:true,isRequired:false,sortOrder:prev.length}]);setCustomTitle("");}} className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40">Add custom</button></div>\n        <div className="mt-4 space-y-3">{blocks.map((block,index)=><div key={block.id ?? block.blockKey} className="rounded-2xl border border-gray-200 p-4"><div className="flex flex-wrap items-center gap-3"><input value={block.title} onChange={e=>setBlocks(prev=>prev.map((b,i)=>i===index?{...b,title:e.target.value}:b))} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-900"/><label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={block.isEnabled} onChange={e=>setBlocks(prev=>prev.map((b,i)=>i===index?{...b,isEnabled:e.target.checked}:b))}/>Enabled</label><label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={block.isRequired} onChange={e=>setBlocks(prev=>prev.map((b,i)=>i===index?{...b,isRequired:e.target.checked}:b))}/>Required</label><button onClick={()=>move(index,-1)} className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">↑</button><button onClick={()=>move(index,1)} className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">↓</button><button onClick={()=>setBlocks(prev=>prev.filter((_,i)=>i!==index))} className="rounded-lg px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50">Remove</button></div><textarea value={String(block.defaultContent?.text ?? "")} onChange={e=>setBlocks(prev=>prev.map((b,i)=>i===index?{...b,defaultContent:{...b.defaultContent,text:e.target.value}}:b))} rows={3} placeholder="Optional default content for this module..." className="mt-3 w-full rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-900"/></div>)}</div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-8 flex justify-between"><button onClick={remove} disabled={!selected} className="rounded-xl px-4 py-3 text-xs font-bold text-red-500 disabled:opacity-30">Delete template</button><button onClick={save} disabled={saving || !name.trim()} className="rounded-xl bg-gray-900 px-6 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">{saving ? "Saving…" : "Save template"}</button></div>
      </section>
    </div>
  </main>;
}
