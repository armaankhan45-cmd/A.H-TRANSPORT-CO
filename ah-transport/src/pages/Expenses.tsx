import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Button, SearchBox, Select, Input, Field, Textarea, Modal, Stat, FileField, Tabs, Empty } from "../ui";
import { Plus, Pencil, Download, IndianRupee, Receipt } from "lucide-react";
import { EXP_CATS, fmtDate, fmtINR, todayISO, uid, MONTHS } from "../company";
import { downloadReport } from "../pdf";
import type { Expense } from "../types";

const blank = (): Expense => ({ id: "", vehicleId: "", date: todayISO(), amount: 0, category: "Diesel", description: "", receipt: "", method: "Cash" });

export default function Expenses() {
  const { db, set, toast } = useStore();
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState<Expense | null>(null);
  const [tab, setTab] = useState("Register");

  const list = db.expenses.filter((e) => {
    const v = db.vehicles.find((x) => x.id === e.vehicleId)?.regNo || "Office";
    if (catF && e.category !== catF) return false;
    if (tab === "This Month" && e.date.slice(0, 7) !== month) return false;
    return !q || [e.description, e.category, v].join(" ").toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    if (!form) return;
    if (!form.amount || form.amount <= 0) return toast("Enter a valid amount", "error");
    set((d) => {
      if (form.id) { const i = d.expenses.findIndex((x) => x.id === form.id); if (i >= 0) d.expenses[i] = form; }
      else d.expenses.push({ ...form, id: uid() });
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: form.id ? "Expense updated" : "Expense added", detail: `${form.category} ${fmtINR(form.amount)}` });
    });
    toast("Expense saved");
    setForm(null);
  };

  const monthExp = db.expenses.filter((e) => e.date.slice(0, 7) === month);
  const byVehicle = Object.entries(db.expenses.reduce((acc: Record<string, number>, e) => { const k = db.vehicles.find((v) => v.id === e.vehicleId)?.regNo || "Office / General"; acc[k] = (acc[k] || 0) + e.amount; return acc; }, {}));
  const byCat = Object.entries(db.expenses.reduce((acc: Record<string, number>, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {}));

  return (
    <div>
      <PageHeader title="Expense Management" subtitle="Diesel, toll, repairs, maintenance, permits, tax and office costs"
        actions={<><Button variant="secondary" onClick={() => { downloadReport("Expense Report", ["Date", "Vehicle", "Category", "Description", "Amount", "Method"], list.map((e) => [e.date, db.vehicles.find((v) => v.id === e.vehicleId)?.regNo || "Office", e.category, e.description, String(e.amount), e.method])); toast("PDF exported"); }}><Download className="w-4 h-4" /> Export PDF</Button><Button onClick={() => setForm(blank())}><Plus className="w-4 h-4" /> Add Expense</Button></>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="This month" value={fmtINR(monthExp.reduce((a, e) => a + e.amount, 0))} sub={`${monthExp.length} entries`} icon={<IndianRupee className="w-5 h-5" />} tone="red" />
        <Stat label="Total recorded" value={fmtINR(db.expenses.reduce((a, e) => a + e.amount, 0))} tone="orange" />
        <Stat label="Diesel spend" value={fmtINR(db.expenses.filter((e) => e.category === "Diesel").reduce((a, e) => a + e.amount, 0))} tone="blue" />
        <Stat label="Repairs & maintenance" value={fmtINR(db.expenses.filter((e) => ["Repair", "Maintenance", "Tyres"].includes(e.category)).reduce((a, e) => a + e.amount, 0))} tone="indigo" />
      </div>

      <Tabs tabs={["Register", "This Month", "Vehicle-wise", "Category-wise"]} active={tab} onChange={setTab} />

      {(tab === "Register" || tab === "This Month") && (
        <>
          <Card className="p-3 mb-3 flex flex-col sm:flex-row gap-2">
            <SearchBox value={q} onChange={setQ} placeholder="Search description, vehicle, category…" />
            <Select value={catF} onChange={(e) => setCatF(e.target.value)} className="sm:w-52"><option value="">All categories</option>{EXP_CATS.map((c) => <option key={c}>{c}</option>)}</Select>
            {tab === "This Month" && <Select value={month} onChange={(e) => setMonth(e.target.value)} className="sm:w-40">{Array.from({ length: 12 }).map((_, i) => { const d = new Date(); d.setMonth(d.getMonth() - i); const v = d.toISOString().slice(0, 7); return <option key={v} value={v}>{MONTHS[d.getMonth()]} {d.getFullYear()}</option>; })}</Select>}
          </Card>
          <Card>
            <Table headers={["Date", "Vehicle", "Category", "Description", "Receipt", "Method", "Amount", "Actions"]} empty={list.length === 0}>
              {list.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs">{fmtDate(e.date)}</td>
                  <td className="px-3 py-2 text-xs font-semibold">{db.vehicles.find((v) => v.id === e.vehicleId)?.regNo || "Office"}</td>
                  <td className="px-3 py-2 text-xs">{e.category}</td>
                  <td className="px-3 py-2 text-xs max-w-56 truncate">{e.description}</td>
                  <td className="px-3 py-2 text-xs">{e.receipt ? <span className="text-green-700 inline-flex items-center gap-1"><Receipt className="w-3.5 h-3.5" /> yes</span> : "—"}</td>
                  <td className="px-3 py-2 text-xs">{e.method}</td>
                  <td className="px-3 py-2 text-xs font-bold">{fmtINR(e.amount)}</td>
                  <td className="px-3 py-2"><button onClick={() => setForm({ ...e })} className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-blue-600" /></button></td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {tab === "Vehicle-wise" && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Expenses by vehicle</h3>
          <Table headers={["Vehicle", "Total expense", "Share"]}>
            {byVehicle.sort((a, b) => b[1] - a[1]).map(([k, v]) => {
              const total = db.expenses.reduce((a, e) => a + e.amount, 0) || 1;
              return <tr key={k}><td className="px-3 py-2 text-xsfont-semibold font-semibold">{k}</td><td className="px-3 py-2 text-xs">{fmtINR(v)}</td><td className="px-3 py-2"><div className="w-40 bg-gray-100 rounded h-2"><div className="bg-green-600 h-2 rounded" style={{ width: `${(v / total) * 100}%` }} /></div></td></tr>;
            })}
          </Table>
        </Card>
      )}

      {tab === "Category-wise" && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Expenses by category</h3>
          <Table headers={["Category", "Total", "Entries"]}>
            {byCat.sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td className="px-3 py-2 text-xs font-semibold">{k}</td><td className="px-3 py-2 text-xs">{fmtINR(v)}</td><td className="px-3 py-2 text-xs">{db.expenses.filter((e) => e.category === k).length}</td></tr>)}
          </Table>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Expense Entry">
        {form && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Vehicle"><Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}><option value="">Office / General</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo}</option>)}</Select></Field>
            <Field label="Date" required><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Category" required><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{EXP_CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Amount (₹)" required><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Payment Method"><Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{["Cash", "Bank Transfer", "UPI", "Cheque", "Credit"].map((m) => <option key={m}>{m}</option>)}</Select></Field>
            <FileField label="Receipt upload" value={form.receipt} onChange={(n, d) => setForm({ ...form, receipt: d ? n : "" })} />
            <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save Expense</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
