import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, SearchBox, Select, Input, Field, FileField, Modal, Textarea, Stat, Tabs } from "../ui";
import { FileWarning, CalendarClock, Upload, ShieldCheck, Settings2 } from "lucide-react";
import { DOC_TYPES, daysLeft, expiryInfo, fmtDate, todayISO, uid, MONTHS } from "../company";
import type { VehicleDoc } from "../types";

export default function Documents({ mode }: { mode: "docs" | "expiry" }) {
  const { db, set, toast } = useStore();
  const [tab, setTab] = useState(mode === "expiry" ? "All documents" : "All documents");
  const [q, setQ] = useState("");
  const [vehicleF, setVehicleF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [monthF, setMonthF] = useState("");
  const [form, setForm] = useState<VehicleDoc | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [notifyDays, setNotifyDays] = useState(String(db.settings.notifyDays));

  const current = db.vehicleDocs.filter((d) => d.status !== "Superseded");
  const filtered = current.filter((d) => {
    const v = db.vehicles.find((x) => x.id === d.vehicleId);
    const dl = daysLeft(d.expiryDate);
    if (q && ![d.name, d.docNo, v?.regNo].join(" ").toLowerCase().includes(q.toLowerCase())) return false;
    if (vehicleF && d.vehicleId !== vehicleF) return false;
    if (typeF && d.name !== typeF) return false;
    if (monthF && d.expiryDate.slice(0, 7) !== monthF) return false;
    if (tab === "Expired") return dl < 0;
    if (tab === "Within 7 days") return dl >= 0 && dl <= 7;
    if (tab === "Within 15 days") return dl >= 0 && dl <= 15;
    if (tab === "Within 30 days") return dl >= 0 && dl <= 30;
    return true;
  });

  const stats = {
    expired: current.filter((d) => daysLeft(d.expiryDate) < 0).length,
    d7: current.filter((d) => { const x = daysLeft(d.expiryDate); return x >= 0 && x <= 7; }).length,
    d15: current.filter((d) => { const x = daysLeft(d.expiryDate); return x >= 0 && x <= 15; }).length,
    d30: current.filter((d) => { const x = daysLeft(d.expiryDate); return x >= 0 && x <= 30; }).length,
  };

  const blank = (): VehicleDoc => ({ id: "", vehicleId: db.vehicles[0]?.id || "", name: "Insurance", docNo: "", issueDate: todayISO(), expiryDate: "", fileName: "", fileData: "", remarks: "", status: "Current" });

  const save = () => {
    if (!form) return;
    if (!form.vehicleId) return toast("Select a vehicle", "error");
    if (!form.expiryDate) return toast("Expiry date is required", "error");
    set((d) => {
      if (form.id) { const i = d.vehicleDocs.findIndex((x) => x.id === form.id); if (i >= 0) d.vehicleDocs[i] = form; }
      else {
        d.vehicleDocs.filter((x) => x.vehicleId === form.vehicleId && x.name === form.name && x.status !== "Superseded").forEach((x) => { x.status = "Superseded"; });
        d.vehicleDocs.push({ ...form, id: uid(), status: "Current" });
      }
      const v = d.vehicles.find((x) => x.id === form.vehicleId);
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Paper expiry record saved", detail: `${v?.regNo} — ${form.name} till ${form.expiryDate}` });
    });
    toast("Document saved");
    setForm(null);
  };

  return (
    <div>
      <PageHeader title={mode === "expiry" ? "Vehicle Paper Expiry Dashboard" : "Vehicle Document Management"} subtitle="RC, insurance, fitness, PUC, permits, road tax, tanker inspection — colour-coded validity tracking"
        actions={<><Button variant="secondary" onClick={() => setShowSettings(true)}><Settings2 className="w-4 h-4" /> Alert periods</Button><Button onClick={() => setForm(blank())}><Upload className="w-4 h-4" /> Upload Paper</Button></>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Expired" value={stats.expired} icon={<FileWarning className="w-5 h-5" />} tone="red" sub="Immediate action" />
        <Stat label="Expiring ≤ 7 days" value={stats.d7} icon={<CalendarClock className="w-5 h-5" />} tone="orange" />
        <Stat label="Expiring ≤ 15 days" value={stats.d15} icon={<CalendarClock className="w-5 h-5" />} tone="orange" />
        <Stat label="Expiring ≤ 30 days" value={stats.d30} icon={<ShieldCheck className="w-5 h-5" />} tone="blue" />
      </div>

      <Tabs tabs={["All documents", "Expired", "Within 7 days", "Within 15 days", "Within 30 days"]} active={tab} onChange={setTab} />

      <Card className="p-3 mb-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search vehicle or document…" />
        <Select value={vehicleF} onChange={(e) => setVehicleF(e.target.value)}><option value="">All vehicles</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo}</option>)}</Select>
        <Select value={typeF} onChange={(e) => setTypeF(e.target.value)}><option value="">All document types</option>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
        <Select value={monthF} onChange={(e) => setMonthF(e.target.value)}><option value="">All expiry months</option>{MONTHS.map((m, i) => <option key={m} value={`${new Date().getFullYear()}-${String(i + 1).padStart(2, "0")}`}>{m} {new Date().getFullYear()}</option>)}</Select>
      </Card>

      <Card>
        <Table headers={["Vehicle", "Document", "Number", "Issue Date", "Expiry Date", "Validity", "File", "Actions"]}>
          {filtered.sort((a, b) => daysLeft(a.expiryDate) - daysLeft(b.expiryDate)).map((d) => {
            const v = db.vehicles.find((x) => x.id === d.vehicleId);
            const i = expiryInfo(d.expiryDate);
            return (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs font-semibold">{v?.regNo || "—"}</td>
                <td className="px-3 py-2 text-xs">{d.name}</td>
                <td className="px-3 py-2 text-xs">{d.docNo || "—"}</td>
                <td className="px-3 py-2 text-xs">{fmtDate(d.issueDate)}</td>
                <td className="px-3 py-2 text-xs font-medium">{fmtDate(d.expiryDate)}</td>
                <td className="px-3 py-2"><Badge cls={i.cls}>{i.label}</Badge></td>
                <td className="px-3 py-2 text-xs">{d.fileData ? <a href={d.fileData} target="_blank" rel="noreferrer" className="text-green-700 underline">View</a> : <span className="text-gray-400">—</span>}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button className="text-xs text-blue-700 hover:underline mr-2" onClick={() => setForm({ ...d })}>Edit</button>
                  <button className="text-xs text-green-700 hover:underline" onClick={() => setForm({ ...blank(), vehicleId: d.vehicleId, name: d.name, docNo: d.docNo, renewedFrom: d.id })}>Renew</button>
                </td>
              </tr>
            );
          })}
        </Table>
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No documents match these filters.</p>}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.renewedFrom ? "Renew Document (old copy kept in history)" : "Vehicle Document"}>
        {form && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Vehicle" required><Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo}</option>)}</Select></Field>
            <Field label="Document Type" required><Select value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Document Number"><Input value={form.docNo} onChange={(e) => setForm({ ...form, docNo: e.target.value })} /></Field>
            <Field label="Issue Date"><Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></Field>
            <Field label="Expiry Date" required><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
            <div className="flex items-end pb-1">{form.expiryDate && <Badge cls={expiryInfo(form.expiryDate).cls}>{expiryInfo(form.expiryDate).label}</Badge>}</div>
            <div className="sm:col-span-2"><FileField label="Upload document / photo / PDF" value={form.fileName} onChange={(n, data) => setForm({ ...form, fileName: n, fileData: data })} /></div>
            <Field label="Remarks" className="sm:col-span-2"><Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
            <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Notification Periods">
        <div className="space-y-3">
          <Field label="Notify me this many days before expiry" hint="Alerts also always fire at 30 / 15 / 7 days and after expiry.">
            <Input type="number" min={1} max={180} value={notifyDays} onChange={(e) => setNotifyDays(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={() => { set((d) => { d.settings.notifyDays = Math.max(1, Number(notifyDays) || 30); }); toast("Notification period updated"); setShowSettings(false); }}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
