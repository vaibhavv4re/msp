"use client";

import { useState } from "react";
import { deleteBankAccount, saveBankAccount, setBankAccountActive } from "./actions";

type Account = {
  id: string; label: string | null; bank_name: string | null; holder_name: string | null;
  account_number: string | null; ifsc: string | null; upi_id: string | null;
  cheque_name: string | null; is_active: boolean;
};
const empty = { label: "Primary", bankName: "", holderName: "", accountNumber: "", ifsc: "", upiId: "", chequeName: "", isActive: true };

export function BankAccounts({ accounts, canManage, canDelete }: { accounts: Account[]; canManage: boolean; canDelete: boolean }) {
  const [rows, setRows] = useState(accounts);
  const [editing, setEditing] = useState<Account | null>(null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function open(account: Account | null = null) { setEditing(account); setError(""); setModal(true); }
  async function toggle(account: Account) {
    setBusy(true); const result = await setBankAccountActive(account.id, !account.is_active); setBusy(false);
    if (result.error) return alert(result.error);
    setRows(v => v.map(x => x.id === account.id ? { ...x, is_active: !x.is_active } : x));
  }
  async function remove(account: Account) {
    if (!confirm("Delete this bank account? Accounts used by invoices or payments cannot be deleted.")) return;
    const result = await deleteBankAccount(account.id);
    if (result.error) return alert(result.error);
    setRows(v => v.filter(x => x.id !== account.id));
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const data = new FormData(e.currentTarget);
    const input = {
      ...(editing ? { id: editing.id } : {}),
      label: String(data.get("label") || ""), bankName: String(data.get("bankName") || ""),
      holderName: String(data.get("holderName") || ""), accountNumber: String(data.get("accountNumber") || ""),
      ifsc: String(data.get("ifsc") || ""), upiId: String(data.get("upiId") || ""),
      chequeName: String(data.get("chequeName") || ""), isActive: data.get("isActive") === "on",
    };
    const result = await saveBankAccount(input); setBusy(false);
    if (result.error) { setError(result.error); return; }
    const account: Account = { id: editing?.id || crypto.randomUUID(), label: input.label, bank_name: input.bankName, holder_name: input.holderName, account_number: input.accountNumber, ifsc: input.ifsc, upi_id: input.upiId, cheque_name: input.chequeName, is_active: input.isActive };
    setRows(v => editing ? v.map(x => x.id === editing.id ? account : x) : [account, ...v]);
    setModal(false); setEditing(null);
  }
  return <main className="min-h-screen bg-gray-50">
    <header className="border-b bg-white px-5 py-4"><div className="mx-auto flex max-w-6xl items-center justify-between"><a href="/workspace" className="text-sm font-semibold">← Workspace</a><span className="text-xs font-bold uppercase tracking-widest text-gray-500">Finance · Bank Accounts</span></div></header>
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black tracking-tight">Bank Accounts</h1><p className="mt-1 text-sm text-gray-500">Manage the accounts shown on invoices and used to record payments.</p></div>{canManage && <button onClick={() => open()} className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white">＋ Add Bank Account</button>}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.length === 0 ? <div className="col-span-full rounded-2xl border-2 border-dashed bg-white p-12 text-center text-sm text-gray-500">No bank accounts added to this workspace yet.</div> : rows.map(account => <article key={account.id} className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{account.label || "Bank Account"}</p><h2 className="mt-1 text-lg font-black">{account.bank_name}</h2><p className="text-xs text-gray-500">{account.holder_name || "Account holder not specified"}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${account.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{account.is_active ? "Active" : "Inactive"}</span></div>
          <div className="mt-5 space-y-2 border-t pt-4 text-sm"><div className="flex justify-between gap-3"><span className="text-gray-500">Account number</span><span className="font-semibold">{account.account_number ? `•••• ${account.account_number.slice(-4)}` : "—"}</span></div><div className="flex justify-between gap-3"><span className="text-gray-500">IFSC</span><span className="font-semibold">{account.ifsc || "—"}</span></div><div className="flex justify-between gap-3"><span className="text-gray-500">UPI ID</span><span className="font-semibold">{account.upi_id || "—"}</span></div><div className="flex justify-between gap-3"><span className="text-gray-500">Cheque name</span><span className="font-semibold">{account.cheque_name || "—"}</span></div></div>
          {canManage && <div className="mt-5 flex flex-wrap gap-2 border-t pt-4"><button onClick={() => open(account)} className="rounded-lg border px-3 py-2 text-xs font-bold">Edit</button><button disabled={busy} onClick={() => toggle(account)} className="rounded-lg border px-3 py-2 text-xs font-bold">{account.is_active ? "Deactivate" : "Activate"}</button>{canDelete && <button onClick={() => remove(account)} className="rounded-lg border px-3 py-2 text-xs font-bold text-red-600">Delete</button>}</div>}
        </article>)}
      </div>
    </section>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{editing ? "Edit Bank Account" : "Add Bank Account"}</h2><button type="button" onClick={() => setModal(false)} className="rounded-lg border px-3 py-1">✕</button></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Account label<input name="label" defaultValue={editing?.label || "Secondary"} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-bold">Bank name *<input required name="bankName" defaultValue={editing?.bank_name || ""} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-bold">Account holder<input name="holderName" defaultValue={editing?.holder_name || ""} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-bold">Account number *<input required name="accountNumber" autoComplete="off" defaultValue={editing?.account_number || ""} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-bold">IFSC code<input name="ifsc" maxLength={11} defaultValue={editing?.ifsc || ""} className="mt-1 w-full rounded-xl border p-3 uppercase"/></label><label className="text-xs font-bold">UPI ID<input name="upiId" defaultValue={editing?.upi_id || ""} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-bold sm:col-span-2">Cheque name<input name="chequeName" defaultValue={editing?.cheque_name || ""} className="mt-1 w-full rounded-xl border p-3"/></label><label className="flex items-center gap-2 text-xs font-bold sm:col-span-2"><input type="checkbox" name="isActive" defaultChecked={editing?.is_active ?? true}/> Active and available for invoices</label></div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setModal(false)} className="rounded-xl border px-4 py-3 text-xs font-bold">Cancel</button><button disabled={busy} className="rounded-xl bg-gray-900 px-5 py-3 text-xs font-bold text-white">{busy ? "Saving…" : "Save Account"}</button></div>
    </form></div>}
  </main>;
}
