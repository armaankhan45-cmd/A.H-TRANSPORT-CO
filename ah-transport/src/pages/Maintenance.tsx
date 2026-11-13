import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, SearchBox, Select, Input, Field, Textarea, Modal, FileField, Stat, Tabs, Confirm, Empty } from "../ui";
import { Plus, Pencil, Trash2, Wrench, CalendarDays, List, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MAINT_CATS, MAINT_STATUSES, daysLeft, durationDays, fmtDate, fmtINR, todayISO, uid, MONTHS } from "../company";
import type { Maintenance as M } from "../types";

const blank = (vId = ""): M => ({ id: "", vehicleId: vId, title: "", category: "General servicing", description: "", startDate: todayISO(), expectedEnd: "", actualEnd: "", garage: "", mechanic: "", estCost: 0, actualCost: 0, invoice: "", beforePhotos: "", afterPhotos: "", remarks: "", status: "Scheduled", createdBy: "Admin" });

export default function Maintenance() {
  const { db, set, toast } = useStore();
  const [tab, setTab] = useState("List");
  const [q, setQ] = useState("");
  const [vehF, setVehF] = useState("");
  const [statF, setStatF] = useState("");
  const [form, setForm] = useState<M | null>(null);
  const [del, setDel] = useState<M | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().toISOString().slice(0, 7));

  const list = db.maintenance.filter((m) => {
    const v = db.vehicles.find((x) => x.id === m.vehicleId);
    if (q && ![m.title, m.category, m.garage, v?.regNo].join(" ").toLowerCase().includes(q.toLowerCase())) return false;
    if (vehF && m.vehicleId !== vehF) return false;
    if (statF && m.status !== statF) return false;
    return true;
  }).sort((a, b) => b.startDate.localeCompare(a.startDate));

  const inProgress = db.maintenance.filter((m) => m.status === "In Progress");
  const overdue = db.maintenance.filter((m) => m.status === "In Progress" && m.expectedEnd && daysLeft(m.expectedEnd) < 0);
  const upcoming = db.maintenance.filter((m) => m.status === "Scheduled");
  const totalDays = db.maintenance.reduce((a, m) => a + durationDays(m.startDate, m.actualEnd), 0);
  const totalCost = db.maintenance.reduce((a, m) => a + (m.actualCost || m.estCost || 0), 0);

  const save = () => {
    if (!form) return;
    if (!form.vehicleId) return toast("Select a vehicle", "error");
    if (!form.title.trim()) return toast("Maintenance title is required", "error");
    if (!form.startDate) return toast("Maintenance start date is required", "error");
    if (form.actualEnd && form.expectedEnd && form.actualEnd < form.startDate) return toast("Actual end date cannot be before start date", "error");
    if (form.expectedEnd && form.expectedEnd < form.startDate) return toast("Expected end date cannot be before start date", "error");

    set((d) => {
      const v = d.vehicles.find((x) => x.id === form.vehicleId);
      if (form.id) {
        const i = d.maintenance.findIndex((x) => x.id === form.id);
        const old = i >= 0 ? { ...d.maintenance[i] } : null;
        if (i >= 0) d.maintenance[i] = form;
        if (old && (old.startDate !== form.startDate || old.actualEnd !== form.actualEnd || old.expectedEnd !== form.expectedEnd)) {
          d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Maintenance dates edited", detail: `${v?.regNo} — ${form.title}: ${old.startDate}/${old.expectedEnd || "-"}/${old.actualEnd || "open"} → ${form.startDate}/${form.expectedEnd || "-"}/${form.actualEnd || "open"}` });
        } else {
          d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Maintenance updated", detail: `${v?.regNo} — ${form.title}` });
        }
      } else {
        d.maintenance.push({ ...form, id: uid() });
        d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Maintenance created", detail: `${v?.regNo} — ${form.title} (${form.startDate} → ${form.expectedEnd || "open"})` });
      }
      // Auto vehicle status rules
      if (v) {
        const activeMaint = d.maintenance.some((m) => m.vehicleId === v.id && m.status === "In Progress");
        if (activeMaint) v.status = "Under Maintenance";
        else if (v.status === "Under Maintenance") {
          const onTrip = d.trips.some((t) => t.vehicleId === v.id && !["Completed", "Cancelled"].includes(t.status));
          v.status = onTrip ? "On Trip" : "Available";
        }
      }
    });
    toast(form.id ? "Maintenance record updated" : "Maintenance record created — vehicle blocked for trips");
    setForm(null);
  };

  const release = (m: M) => {
    set((d) => {
      const rec = d.maintenance.find((x) => x.id === m.id);
      if (rec) { rec.status = "Completed"; rec.actualEnd = todayISO(); }
      const v = d.vehicles.find((x) => x.id === m.vehicleId);
      if (v) {
        const stillActive = d.maintenance.some((x) => x.vehicleId === v.id && x.status === "In Progress");
        if (!stillActive) v.status = "Available";
      }
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Vehicle released from maintenance", detail: `${d.vehicles.find((x) => x.id === m.vehicleId)?.regNo} — ${m.title}` });
    });
    toast("Vehicle released — marked Available");
  };

  const remove = () => {
    if (!del) return;
    set((d) => {
      const rec = d.maintenance.find((x) => x.id === del.id);
      if (rec) rec.status = "Cancelled";
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Maintenance cancelled", detail: del.title + " (record retained)" });
    });
    toast("Maintenance cancelled (record retained)");
    setDel(null);
  };

  return (
    <div>
      <PageHeader title="Vehicle Maintenance & Expiry Management" subtitle="Manual start/end dates, duration auto-calculated, vehicle blocked while under maintenance"
        actions={<Button onClick={() => setForm(blank())}><Plus className="w-4 h-4" /> New Maintenance</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="In Progress" value={inProgress.length} sub="Vehicles currently in workshop" icon={<Wrench className="w-5 h-5" />} tone="orange" />
        <Stat label="Overdue" value={overdue.length} sub="Past expected completion" icon={<AlertTriangle className="w-5 h-5" />} tone="red" />
        <Stat label="Upcoming / Scheduled" value={upcoming.length} icon={<CalendarDays className="w-5 h-5" />} tone="blue" />
        <Stat label="Total cost / days" value={fmtINR(totalCost)} sub={`${totalDays} vehicle-days in workshop`} icon={<Clock className="w-5 h-5" />} tone="indigo" />
      </div>

      <Tabs tabs={["List", "Calendar", "Vehicle History", "Workshops"]} active={tab} onChange={setTab} />

      {tab !== "Calendar" && (
        <Card className="p-3 mb-3 grid sm:grid-cols-3 gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search title, garage, vehicle…" />
          <Select value={vehF} onChange={(e) => setVehF(e.target.value)}><option value="">All vehicles</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo}</option>)}</Select>
          <Select value={statF} onChange={(e) => setStatF(e.target.value)}><option value="">All statuses</option>{MAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
        </Card>
      )}

      {tab === "List" && (
        <Card>
          <Table headers={["Vehicle", "Maintenance", "Start", "Expected End", "Actual End", "Duration", "Cost (Est/Act)", "Status", "Actions"]}>
            {list.map((m) => {
              const v = db.vehicles.find((x) => x.id === m.vehicleId);
              const dur = durationDays(m.startDate, m.actualEnd);
              const over = m.status === "In Progress" && m.expectedEnd && daysLeft(m.expectedEnd) < 0;
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs font-bold">{v?.regNo || "—"}</td>
                  <td className="px-3 py-2 text-xs"><span className="font-semibold">{m.title}</span><span className="block text-[10px] text-gray-500">{m.category} · {m.garage || "—"}</span></td>
                  <td className="px-3 py-2 text-xs">{fmtDate(m.startDate)}</td>
                  <td className="px-3 py-2 text-xs">{m.expectedEnd ? fmtDate(m.expectedEnd) : <span className="text-gray-400">Not set</span>}</td>
                  <td className="px-3 py-2 text-xs">{m.actualEnd ? fmtDate(m.actualEnd) : <span className="text-amber-700 font-medium">Still open</span>}</td>
                  <td className="px-3 py-2 text-xs font-semibold">{dur}d</td>
                  <td className="px-3 py-2 text-xs">{fmtINR(m.estCost)}<span className="block text-[10px] text-gray-500">Act: {m.actualCost ? fmtINR(m.actualCost) : "—"}</span></td>
                  <td className="px-3 py-2"><div className="flex flex-col gap-1">{over && <Badge cls="bg-red-100 text-red-800">Overdue</Badge>}<Badge cls={m.status === "In Progress" ? "bg-orange-100 text-orange-800" : m.status === "Completed" ? "bg-green-100 text-green-800" : m.status === "Scheduled" ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-700"}>{m.status}</Badge></div></td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => setForm({ ...m })} className="p-1.5 rounded hover:bg-gray-100" title="Edit"><Pencil className="w-4 h-4 text-blue-600" /></button>
                    {m.status === "In Progress" && <button onClick={() => release(m)} className="p-1.5 rounded hover:bg-gray-100" title="Release vehicle (set end date today)"><CheckCircle2 className="w-4 h-4 text-green-600" /></button>}
                    <button onClick={() => setDel(m)} className="p-1.5 rounded hover:bg-gray-100" title="Cancel"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </td>
                </tr>
              );
            })}
          </Table>
          {list.length === 0 && <Empty text="No maintenance records" />}
        </Card>
      )}

      {tab === "Calendar" && <CalendarView month={calMonth} setMonth={setCalMonth} onPick={(m) => setForm({ ...m })} />}

      {tab === "Vehicle History" && (
        <div className="grid md:grid-cols-2 gap-3">
          {db.vehicles.map((v) => {
            const recs = db.maintenance.filter((m) => m.vehicleId === v.id);
            const days = recs.reduce((a, m) => a + durationDays(m.startDate, m.actualEnd), 0);
            const cost = recs.reduce((a, m) => a + (m.actualCost || m.estCost || 0), 0);
            return (
              <Card key={v.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm">{v.regNo}</p>
                  <div className="flex gap-1"><Badge cls="bg-gray-100 text-gray-700">{recs.length} records</Badge><Badge cls="bg-indigo-100 text-indigo-800">{days}d</Badge><Badge cls="bg-green-100 text-green-800">{fmtINR(cost)}</Badge></div>
                </div>
                {recs.length === 0 && <p className="text-xs text-gray-400">No maintenance history.</p>}
                <div className="space-y-1">
                  {recs.map((m) => (
                    <button key={m.id} onClick={() => setForm({ ...m })} className="w-full text-left text-[11px] flex justify-between border-b border-gray-100 pb-1 hover:bg-gray-50">
                      <span className="truncate">{m.title}</span>
                      <span className="text-gray-500 shrink-0 ml-2">{fmtDate(m.startDate)} · {durationDays(m.startDate, m.actualEnd)}d</span>
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "Workshops" && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Workshop / Garage history</h3>
          <Table headers={["Garage", "Jobs", "Vehicles", "Total cost", "Last job"]}>
            {Object.entries(db.maintenance.reduce((acc: Record<string, M[]>, m) => { const k = m.garage || "Not specified"; (acc[k] ||= []).push(m); return acc; }, {})).map(([garage, recs]) => (
              <tr key={garage}>
                <td className="px-3 py-2 text-xs font-semibold">{garage}</td>
                <td className="px-3 py-2 text-xs">{recs.length}</td>
                <td className="px-3 py-2 text-xs">{[...new Set(recs.map((r) => db.vehicles.find((v) => v.id === r.vehicleId)?.regNo))].join(", ")}</td>
                <td className="px-3 py-2 text-xs">{fmtINR(recs.reduce((a, r) => a + (r.actualCost || r.estCost || 0), 0))}</td>
                <td className="px-3 py-2 text-xs">{fmtDate(recs.map((r) => r.startDate).sort().pop() || "")}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit Maintenance Record" : "New Maintenance Record"} wide>
        {form && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Vehicle Number" required><Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}><option value="">Select vehicle</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo} — {v.status}</option>)}</Select></Field>
            <Field label="Maintenance Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Engine overhaul" /></Field>
            <Field label="Category"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{MAINT_CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Start Date" required hint="Manually entered"><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Expected Completion Date" hint="Leave blank if unknown"><Input type="date" value={form.expectedEnd} onChange={(e) => setForm({ ...form, expectedEnd: e.target.value })} /></Field>
            <Field label="Actual End Date" hint="Blank = vehicle still under maintenance"><Input type="date" value={form.actualEnd} onChange={(e) => setForm({ ...form, actualEnd: e.target.value })} /></Field>
            <Field label="Garage / Workshop"><Input value={form.garage} onChange={(e) => setForm({ ...form, garage: e.target.value })} placeholder="Shree Auto Garage" /></Field>
            <Field label="Mechanic / Contact"><Input value={form.mechanic} onChange={(e) => setForm({ ...form, mechanic: e.target.value })} /></Field>
            <Field label="Status" hint="In Progress blocks the vehicle"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{MAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Estimated Cost (₹)"><Input type="number" value={form.estCost} onChange={(e) => setForm({ ...form, estCost: Number(e.target.value) })} /></Field>
            <Field label="Actual Cost (₹)"><Input type="number" value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: Number(e.target.value) })} /></Field>
            <div />
            <Field label="Description / Work Performed" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <FileField label="Invoice upload" value={form.invoice} onChange={(n, d) => setForm({ ...form, invoice: d ? n : "" })} />
            <FileField label="Before-maintenance photos" value={form.beforePhotos ? "uploaded" : ""} onChange={(_n, d) => setForm({ ...form, beforePhotos: d })} accept="image/*" />
            <FileField label="After-maintenance photos" value={form.afterPhotos ? "uploaded" : ""} onChange={(_n, d) => setForm({ ...form, afterPhotos: d })} accept="image/*" />
            <Field label="Remarks" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-xs text-green-900">Auto-calculated duration: <b>{durationDays(form.startDate, form.actualEnd)} day(s)</b>{!form.actualEnd && " (ongoing — counted to today)"}</span>
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save Record</Button></div>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!del} onCancel={() => setDel(null)} onConfirm={remove} message={`Cancel maintenance "${del?.title}"? The record is retained with status Cancelled for audit purposes.`} />
    </div>
  );
}

function CalendarView({ month, setMonth, onPick }: { month: string; setMonth: (m: string) => void; onPick: (m: M) => void }) {
  const { db } = useStore();
  const [y, mo] = month.split("-").map(Number);
  const first = new Date(y, mo - 1, 1);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const startPad = first.getDay();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const recsForDay = (day: number) => {
    const dateStr = `${month}-${String(day).padStart(2, "0")}`;
    return db.maintenance.filter((m) => {
      const end = m.actualEnd || m.expectedEnd || todayISO();
      return dateStr >= m.startDate && dateStr <= end && m.status !== "Cancelled";
    });
  };

  const monthsList = useMemo(() => {
    const arr: string[] = [];
    for (let i = -6; i <= 6; i++) { const d = new Date(y, mo - 1 + i, 1); arr.push(d.toISOString().slice(0, 7)); }
    return arr;
  }, [y, mo]);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-green-700" /> Maintenance Calendar</h3>
        <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-44 !py-1 !text-xs">
          {monthsList.map((m) => { const d = new Date(m + "-01"); return <option key={m} value={m}>{MONTHS[d.getMonth()]} {d.getFullYear()}</option>; })}
        </Select>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-[10px] font-bold uppercase text-gray-400 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-20 rounded bg-gray-50/50" />;
          const recs = recsForDay(day);
          return (
            <div key={i} className="min-h-20 rounded border border-gray-200 p-1">
              <p className="text-[10px] font-bold text-gray-500">{day}</p>
              <div className="space-y-0.5">
                {recs.slice(0, 3).map((m) => {
                  const v = db.vehicles.find((x) => x.id === m.vehicleId);
                  return (
                    <button key={m.id} onClick={() => onPick(m)} className={`block w-full text-left text-[9px] px-1 py-0.5 rounded truncate ${m.status === "Completed" ? "bg-green-100 text-green-800" : m.status === "In Progress" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}`}>
                      {v?.regNo} <span className="hidden sm:inline">· {m.category}</span>
                    </button>
                  );
                })}
                {recs.length > 3 && <p className="text-[9px] text-gray-400">+{recs.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-blue-100 inline-block" /> Scheduled</span>
        <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-orange-100 inline-block" /> In Progress</span>
        <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-green-100 inline-block" /> Completed</span>
      </div>
    </Card>
  );
}
