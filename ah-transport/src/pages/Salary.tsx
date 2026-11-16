import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, SearchBox, Select, Input, Field, Textarea, Modal, Stat, Tabs, Empty } from "../ui";
import { Plus, Pencil, CheckCircle2, Wallet, Download, FileText, Printer } from "lucide-react";
import { fmtDate, fmtINR, netSalary, todayISO, uid, MONTHS } from "../company";
import type { Salary as Sal } from "../types";
import { downloadReport } from "../pdf";

export default function Salary() {
  const { db, set, toast, firm } = useStore();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("Salary Sheet");
  const [form, setForm] = useState<Sal | null>(null);

  const monthList = Array.from({ length: 18 }).map((_, i) => { const d = new Date(); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); });
  const recs = db.salaries.filter((s) => s.month === month);
  const driver = (id: string) => db.drivers.find((d) => d.id === id);

  const blank = (): Sal => ({ id: "", driverId: db.drivers[0]?.id || "", month, base: driver(db.drivers[0]?.id)?.salary || 0, bonus: 0, additions: 0, advance: 0, deductions: 0, paymentDate: "", method: "Bank Transfer", reference: "", remarks: "", status: "Pending" });

  const save = () => {
    if (!form) return;
    if (!form.driverId) return toast("Select a driver", "error");
    if (form.advance > form.base + form.bonus + form.additions) return toast("Advance cannot exceed total earnings", "error");
    set((d) => {
      if (form.id) { const i = d.salaries.findIndex((x) => x.id === form.id); if (i >= 0) d.salaries[i] = form; }
      else d.salaries.push({ ...form, id: uid() });
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: form.id ? "Salary record updated" : "Salary record added", detail: `${driver(form.driverId)?.name} — ${form.month}` });
    });
    toast("Salary record saved");
    setForm(null);
  };

  const markPaid = (s: Sal) => {
    set((d) => {
      const r = d.salaries.find((x) => x.id === s.id);
      if (r) { r.status = "Paid"; r.paymentDate = todayISO(); r.reference = r.reference || "NEFT/" + Math.floor(1000 + Math.random() * 8999); }
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Salary paid", detail: `${driver(s.driverId)?.name} — ${s.month} ${fmtINR(netSalary(s))}` });
    });
    toast("Marked paid");
  };

  const exportSalary = () => {
    downloadReport(`Salary Sheet ${month}`, ["Driver", "Month", "Base", "Bonus", "Additions", "Advance", "Deductions", "Net", "Status"],
      recs.map((s) => [driver(s.driverId)?.name || "—", s.month, String(s.base), String(s.bonus), String(s.additions), String(s.advance), String(s.deductions), String(netSalary(s)), s.status]), firm);
    toast("Salary sheet PDF exported");
  };
  const exportExcel = () => {
    const rows = [["Driver", "Month", "Base", "Bonus", "Additions", "Advance", "Deductions", "Net", "Status", "Payment Date", "Method", "Reference"], ...recs.map((s) => [driver(s.driverId)?.name || "—", s.month, s.base, s.bonus, s.additions, s.advance, s.deductions, netSalary(s), s.status, s.paymentDate, s.method, s.reference])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `salary_${month}.csv`; a.click();
    toast("Salary sheet CSV downloaded (opens in Excel)");
  };

  const filtered = recs.filter((s) => !q || (driver(s.driverId)?.name || "").toLowerCase().includes(q.toLowerCase()));
  const pending = recs.filter((s) => s.status === "Pending");
  const advances = recs.filter((s) => s.advance > 0);

  return (
    <div>
      <PageHeader title="Driver Salary Management" subtitle="Net Salary = Base + Bonus + Additions − Advance − Deductions"
        actions={<><Button variant="secondary" onClick={exportExcel}><Download className="w-4 h-4" /> Excel</Button><Button variant="secondary" onClick={exportSalary}><Printer className="w-4 h-4" /> PDF</Button><Button onClick={() => setForm(blank())}><Plus className="w-4 h-4" /> Add Salary</Button></>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Month payroll" value={fmtINR(recs.reduce((a, s) => a + netSalary(s), 0))} sub={month} icon={<Wallet className="w-5 h-5" />} tone="green" />
        <Stat label="Pending salary" value={fmtINR(pending.reduce((a, s) => a + netSalary(s), 0))} sub={`${pending.length} entries`} tone="amber" />
        <Stat label="Paid" value={fmtINR(recs.filter((s) => s.status === "Paid").reduce((a, s) => a + netSalary(s), 0))} tone="blue" />
        <Stat label="Advance register" value={fmtINR(advances.reduce((a, s) => a + s.advance, 0))} sub={`${advances.length} advances`} tone="orange" />
      </div>

      <Card className="p-3 mb-3 flex flex-col sm:flex-row gap-2">
        <Select value={month} onChange={(e) => setMonth(e.target.value)} className="sm:w-44">{monthList.map((m) => { const d = new Date(m + "-01"); return <option key={m} value={m}>{MONTHS[d.getMonth()]} {d.getFullYear()}</option>; })}</Select>
        <SearchBox value={q} onChange={setQ} placeholder="Search driver…" />
      </Card>

      <Tabs tabs={["Salary Sheet", "Pending Salary", "Advance Register", "Driver-wise History"]} active={tab} onChange={setTab} />

      {tab === "Salary Sheet" && (
        <Card>
          <Table headers={["Driver", "Base", "Bonus", "Additions", "Advance", "Deductions", "Net Payable", "Status", "Payment", "Actions"]} empty={filtered.length === 0}>
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs font-semibold">{driver(s.driverId)?.name || "—"}</td>
                <td className="px-3 py-2 text-xs">{fmtINR(s.base)}</td>
                <td className="px-3 py-2 text-xs text-green-700">{s.bonus ? "+" + fmtINR(s.bonus) : "—"}</td>
                <td className="px-3 py-2 text-xs text-green-700">{s.additions ? "+" + fmtINR(s.additions) : "—"}</td>
                <td className="px-3 py-2 text-xs text-red-700">{s.advance ? "−" + fmtINR(s.advance) : "—"}</td>
                <td className="px-3 py-2 text-xs text-red-700">{s.deductions ? "−" + fmtINR(s.deductions) : "—"}</td>
                <td className="px-3 py-2 text-xs font-bold">{fmtINR(netSalary(s))}</td>
                <td className="px-3 py-2"><Badge cls={s.status === "Paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{s.status}</Badge></td>
                <td className="px-3 py-2 text-xs">{s.paymentDate ? fmtDate(s.paymentDate) : "—"}<span className="block text-[10px] text-gray-500">{s.method} {s.reference}</span></td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => setForm({ ...s })} className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-blue-600" /></button>
                  {s.status !== "Paid" && <button onClick={() => markPaid(s)} className="p-1.5 rounded hover:bg-gray-100"><CheckCircle2 className="w-4 h-4 text-green-600" /></button>}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "Pending Salary" && (
        <Card>
          <Table headers={["Driver", "Month", "Net payable", "Action"]} empty={db.salaries.filter((s) => s.status === "Pending").length === 0}>
            {db.salaries.filter((s) => s.status === "Pending").map((s) => (
              <tr key={s.id}><td className="px-3 py-2 text-xs font-semibold">{driver(s.driverId)?.name}</td><td className="px-3 py-2 text-xs">{s.month}</td><td className="px-3 py-2 text-xs font-bold">{fmtINR(netSalary(s))}</td><td className="px-3 py-2"><Button size="sm" onClick={() => markPaid(s)}>Mark paid</Button></td></tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "Advance Register" && (
        <Card>
          <Table headers={["Driver", "Month", "Advance", "Deductions", "Net", "Status"]} empty={advances.length === 0}>
            {db.salaries.filter((s) => s.advance > 0).map((s) => (
              <tr key={s.id}><td className="px-3 py-2 text-xs font-semibold">{driver(s.driverId)?.name}</td><td className="px-3 py-2 text-xs">{s.month}</td><td className="px-3 py-2 text-xs text-red-700">{fmtINR(s.advance)}</td><td className="px-3 py-2 text-xs">{fmtINR(s.deductions)}</td><td className="px-3 py-2 text-xs font-semibold">{fmtINR(netSalary(s))}</td><td className="px-3 py-2"><Badge cls={s.status === "Paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{s.status}</Badge></td></tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "Driver-wise History" && (
        <div className="grid md:grid-cols-2 gap-3">
          {db.drivers.map((d) => {
            const recs2 = db.salaries.filter((s) => s.driverId === d.id);
            const total = recs2.reduce((a, s) => a + netSalary(s), 0);
            return (
              <Card key={d.id} className="p-3">
                <div className="flex justify-between mb-1"><p className="text-sm font-semibold">{d.name}</p><Badge cls="bg-green-100 text-green-800">{fmtINR(total)}</Badge></div>
                {recs2.length === 0 && <p className="text-xs text-gray-400">No salary records.</p>}
                {recs2.map((s) => <div key={s.id} className="text-[11px] flex justify-between border-b border-gray-100 py-1"><span>{s.month}</span><span>{fmtINR(netSalary(s))} <Badge cls={s.status === "Paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{s.status}</Badge></span></div>)}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Salary Entry" wide>
        {form && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Driver" required><Select value={form.driverId} onChange={(e) => { const d0 = driver(e.target.value); setForm({ ...form, driverId: e.target.value, base: d0?.salary || form.base }); }}><option value="">Select driver</option>{db.drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="Salary Month" required><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>
            <Field label="Fixed Monthly Salary (₹)"><Input type="number" value={form.base} onChange={(e) => setForm({ ...form, base: Number(e.target.value) })} /></Field>
            <Field label="Bonus (₹)"><Input type="number" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })} /></Field>
            <Field label="Other Additions (₹)"><Input type="number" value={form.additions} onChange={(e) => setForm({ ...form, additions: Number(e.target.value) })} /></Field>
            <Field label="Advance (₹)"><Input type="number" value={form.advance} onChange={(e) => setForm({ ...form, advance: Number(e.target.value) })} /></Field>
            <Field label="Deductions (₹)"><Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })} /></Field>
            <Field label="Payment Date"><Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></Field>
            <Field label="Payment Method"><Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{["Bank Transfer", "Cash", "UPI", "Cheque"].map((m) => <option key={m}>{m}</option>)}</Select></Field>
            <Field label="Payment Reference"><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="NEFT/1234" /></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Pending</option><option>Paid</option></Select></Field>
            <Field label="Remarks"><Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
            <div className="sm:col-span-2 lg:col-span-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex flex-wrap justify-between items-center gap-2">
              <span className="text-sm text-green-900">Net payable: <b className="text-lg">{fmtINR(netSalary(form))}</b></span>
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}><FileText className="w-4 h-4" /> Save</Button></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
