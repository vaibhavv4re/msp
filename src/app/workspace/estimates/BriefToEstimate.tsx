"use client";

import { useState } from "react";

export type ParsedEstimateBrief = {
  projectName: string;
  projectCategory: string;
  clientName: string;
  clientContact: string;
  location: string;
  summary: string;
  scopeItems: string[];
  deliverables: string[];
  timeline: string;
  milestones: string[];
  exclusions: string[];
  usageOrRights: string;
  budgetReference: number;
  suggestedLineItems: Array<{ description: string; quantity: number; rate: number; serviceId: string; rationale: string }>;
  selectedModules: string[];
  missingInformation: string[];
  assumptions: string[];
};

export function BriefToEstimate({ businessId, onApply }: { businessId: string; onApply: (result: ParsedEstimateBrief) => void }) {
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState<ParsedEstimateBrief | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/ai/parse-estimate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, businessId })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not analyse this brief.");
      setResult(payload.result);
    } catch (e: any) {
      setError(e.message || "Could not analyse this brief.");
    } finally { setLoading(false); }
  }

  return <section className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-4">
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-indigo-600 p-3 text-white"><span className="text-lg">✦</span></div>
      <div><h3 className="text-sm font-black text-gray-900">Brief to Estimate</h3><p className="mt-1 text-xs text-gray-500">Paste the client's WhatsApp message or project brief. Gemini will organise it into an editable estimate draft.</p></div>
    </div>
    <textarea value={brief} onChange={e=>setBrief(e.target.value)} rows={5} placeholder="Paste the client brief here… no formatting needed." className="w-full rounded-2xl border border-indigo-100 bg-white p-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-300"/>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[10px] text-gray-500">AI suggestions are drafts. Review scope and pricing before saving.</p>
      <button type="button" disabled={loading || brief.trim().length < 20} onClick={generate} className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40">{loading ? "Analysing brief…" : "✦ Generate estimate"}</button>
    </div>
    {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    {result && <div className="space-y-3 rounded-2xl border border-indigo-100 bg-white p-4">
      <div><p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Understood project</p><h4 className="mt-1 text-base font-black text-gray-900">{result.projectName || "Untitled project"}</h4><p className="mt-1 text-xs leading-relaxed text-gray-600">{result.summary}</p></div>
      {result.scopeItems.length > 0 && <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Scope</p><ul className="mt-1 list-disc pl-4 text-xs text-gray-700">{result.scopeItems.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      {result.deliverables.length > 0 && <div><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Deliverables</p><ul className="mt-1 list-disc pl-4 text-xs text-gray-700">{result.deliverables.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      {result.missingInformation.length > 0 && <div className="rounded-xl bg-amber-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-amber-700">Needs your confirmation</p><ul className="mt-1 list-disc pl-4 text-xs text-amber-800">{result.missingInformation.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
      {result.suggestedLineItems.length > 0 && <p className="text-xs text-gray-600">{result.suggestedLineItems.length} suggested line item(s). Unmatched services have a zero rate and need your pricing.</p>}
      <button type="button" onClick={()=>onApply(result)} className="w-full rounded-xl bg-gray-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white">Use this draft in my estimate</button>
    </div>}
  </section>;
}
