"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClient, saveClient } from "./actions";

type ClientRecord = {
  id: string;
  client_type: string | null;
  salutation: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  work_phone: string | null;
  mobile: string | null;
  address: string | null;
  pan: string | null;
  tan: string | null;
  gstin: string | null;
  currency: string;
  payment_terms: string | null;
  custom_term_days: number | null;
  is_tds_deducting: boolean;
};

const emptyClient: Partial<ClientRecord> = {
  client_type: "Individual",
  currency: "INR",
  payment_terms: "net_30",
  is_tds_deducting: false,
};

export function ClientsWorkspace({
  businessName,
  clients,
}: {
  businessName: string;
  clients: ClientRecord[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<ClientRecord> | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) =>
      [client.display_name, client.company_name, client.email, client.phone, client.gstin]
        .some((field) => field?.toLowerCase().includes(q))
    );
  }, [clients, search]);

  function submit(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const result = await saveClient(formData);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      setEditing(null);
      setMessage("Client saved.");
      router.refresh();
    });
  }

  function remove(client: ClientRecord) {
    if (!window.confirm(`Delete ${client.display_name}? This may be blocked if financial records refer to this client.`)) return;
    const data = new FormData();
    data.set("id", client.id);
    startTransition(async () => {
      const result = await deleteClient(data);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      setMessage("Client deleted.");
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">Supabase module preview</p>
            <h1 className="mt-2 text-3xl font-bold">Clients</h1>
            <p className="mt-2 text-sm text-neutral-400">Workspace: {businessName}</p>
          </div>
          <button onClick={() => setEditing(emptyClient)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500">
            Add client
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone or GSTIN…" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-400" />
          <span className="whitespace-nowrap text-sm text-neutral-400">{filtered.length} clients</span>
        </div>

        {message && <p role="status" className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-neutral-200">{message}</p>}

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <span className="col-span-4">Client</span><span className="col-span-3">Contact</span><span className="col-span-2">Type</span><span className="col-span-3 text-right">Actions</span>
          </div>
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-400">{search ? "No matching clients." : "No clients in this workspace yet. Add your first client."}</div>
          ) : filtered.map((client) => (
            <div key={client.id} className="grid grid-cols-12 items-center gap-3 border-b border-white/5 px-5 py-4 last:border-0">
              <div className="col-span-4 min-w-0"><p className="truncate text-sm font-semibold">{client.display_name}</p>{client.company_name && <p className="truncate text-xs text-neutral-500">{client.company_name}</p>}</div>
              <div className="col-span-3 min-w-0"><p className="truncate text-sm">{client.email || "—"}</p><p className="truncate text-xs text-neutral-500">{client.phone || client.mobile || "—"}</p></div>
              <span className="col-span-2 text-xs text-neutral-400">{client.client_type || "Individual"}</span>
              <div className="col-span-3 flex justify-end gap-2"><button onClick={() => setEditing(client)} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10">Edit</button><button onClick={() => remove(client)} disabled={isPending} className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50">Delete</button></div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <form action={submit} className="max-h-[92vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#151518] p-6 shadow-2xl">
              <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing.id ? "Edit client" : "Add client"}</h2><button type="button" onClick={() => setEditing(null)} className="text-sm text-neutral-400">Close</button></div>
              {editing.id && <input type="hidden" name="id" value={editing.id} />}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Client type"><select name="client_type" defaultValue={editing.client_type || "Individual"} className={fieldClass}><option>Individual</option><option>Business</option></select></Field>
                <Field label="Salutation"><input name="salutation" defaultValue={editing.salutation || ""} className={fieldClass} placeholder="Mr, Ms, Dr…" /></Field>
                <Field label="First name"><input name="first_name" defaultValue={editing.first_name || ""} className={fieldClass} /></Field>
                <Field label="Last name"><input name="last_name" defaultValue={editing.last_name || ""} className={fieldClass} /></Field>
                <Field label="Company name"><input name="company_name" defaultValue={editing.company_name || ""} className={fieldClass} /></Field>
                <Field label="Display name *"><input name="display_name" defaultValue={editing.display_name || ""} className={fieldClass} placeholder="Auto-generated if blank" /></Field>
                <Field label="Email"><input name="email" type="email" defaultValue={editing.email || ""} className={fieldClass} /></Field>
                <Field label="Phone"><input name="phone" defaultValue={editing.phone || ""} className={fieldClass} /></Field>
                <Field label="Work phone"><input name="work_phone" defaultValue={editing.work_phone || ""} className={fieldClass} /></Field>
                <Field label="Mobile"><input name="mobile" defaultValue={editing.mobile || ""} className={fieldClass} /></Field>
                <Field label="PAN"><input name="pan" defaultValue={editing.pan || ""} className={fieldClass} /></Field>
                <Field label="TAN"><input name="tan" defaultValue={editing.tan || ""} className={fieldClass} /></Field>
                <Field label="GSTIN"><input name="gstin" defaultValue={editing.gstin || ""} className={fieldClass} /></Field>
                <Field label="Currency"><input name="currency" defaultValue={editing.currency || "INR"} className={fieldClass} /></Field>
                <Field label="Payment terms"><select name="payment_terms" defaultValue={editing.payment_terms || "net_30"} className={fieldClass}><option value="due_on_receipt">Due on receipt</option><option value="net_15">Net 15</option><option value="net_30">Net 30</option><option value="net_45">Net 45</option><option value="net_60">Net 60</option><option value="custom">Custom</option></select></Field>
                <Field label="Custom term days"><input name="custom_term_days" type="number" min="1" defaultValue={editing.custom_term_days || ""} className={fieldClass} /></Field>
                <Field label="Address"><textarea name="address" defaultValue={editing.address || ""} className={fieldClass} rows={2} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="is_tds_deducting" defaultChecked={editing.is_tds_deducting || false} /> Client deducts TDS</label>
              <div className="flex justify-end gap-3 border-t border-white/10 pt-4"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Cancel</button><button disabled={isPending} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold disabled:opacity-50">{isPending ? "Saving…" : "Save client"}</button></div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

const fieldClass = "mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-neutral-400">{label}{children}</label>;
}
