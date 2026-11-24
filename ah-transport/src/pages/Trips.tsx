import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, SearchBox, Select, Input, Field, Textarea, Modal, Stat, statusBadge, Empty } from "../ui";
import { Plus, Pencil, Route, Truck, CheckCircle2, XCircle } from "lucide-react";
import { TRIP_STATUSES, fmtDate, fmtINR, todayISO, uid, nextSeq } from "../company";
import type { Trip } from "../types";

const blank = (tripNo: string): Trip => ({ id: "", tripNo, lrNo: "", vehicleId: "", driverId: "", customer: "", consignor: "", consignee: "", loadingLoc: "", unloadingLoc: "", material: "", quantity: "", loadingDT: "", reportingDT: "", unloadingDT: "", freightRate: 0, freightType: "Per Trip", totalFreight: 0, detentionDays: 0, detentionCharges: 0, addExpenses: 0, remarks: "", status: "Planned" });

export default function Trips() {
  const { db, set, toast, user } = useStore();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [form, setForm] = useState<Trip | null>(null);

  const list = db.trips.filter((t) => {
    if (statusF && t.status !== statusF) return false;
    const v = db.vehicles.find((x) => x.id === t.vehicleId)?.regNo || "";
    return !q || [t.tripNo, t.customer, t.material, v, t.loadingLoc, t.unloadingLoc].join(" ").toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => b.tripNo.localeCompare(a.tripNo));

  const save = () => {
    if (!form) return;
    if (!form.customer) return toast("Customer is required", "error");
    if (!form.vehicleId) return toast("Vehicle is required", "error");
    const veh = db.vehicles.find((v) => v.id === form.vehicleId);
    if (veh?.status === "Under Maintenance" && !["Planned", "Cancelled"].includes(form.status)) return toast("Vehicle is Under Maintenance — cannot start/continue a trip. Release the vehicle first or use an authorised override.", "error");
    const total = Number(form.freightRate || 0) * (form.freightType === "Per KL" ? Number(form.quantity.replace(/[^\d.]/g, "")) || 1 : 1) + Number(form.detentionCharges || 0);

    set((d) => {
      const rec = { ...form, totalFreight: total };
      if (form.id) { const i = d.trips.findIndex((x) => x.id === form.id); if (i >= 0) d.trips[i] = rec; }
      else { d.trips.push({ ...rec, id: uid() }); d.seq.trip += 1; }
      const v = d.vehicles.find((x) => x.id === rec.vehicleId);
      if (v && v.status !== "Under Maintenance") {
        if (["Loading", "In Transit", "Reported", "Waiting for Unloading"].includes(rec.status)) v.status = "On Trip";
        if (["Completed", "Cancelled", "Planned"].includes(rec.status)) {
          const other = d.trips.some((t) => t.id !== rec.id && t.vehicleId === rec.vehicleId && ["Loading", "In Transit", "Reported", "Waiting for Unloading"].includes(t.status));
          if (!other) v.status = "Available";
        }
      }
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: form.id ? "Trip updated" : "Trip created", detail: `${rec.tripNo} — ${rec.customer} (${rec.status})` });
    });
    toast("Trip saved");
    setForm(null);
  };

  const setStatus = (t: Trip, status: string) => {
    set((d) => {
      const tr = d.trips.find((x) => x.id === t.id); if (tr) tr.status = status;
      const v = d.vehicles.find((x) => x.id === t.vehicleId);
      if (v && v.status !== "Under Maintenance") v.status = ["Loading", "In Transit", "Reported", "Waiting for Unloading"].includes(status) ? "On Trip" : "Available";
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "Trip status changed", detail: `${t.tripNo} → ${status}` });
    });
    toast(`Trip ${t.tripNo} → ${status}`);
  };

  const active = db.trips.filter((t) => !["Completed", "Cancelled"].includes(t.status));

  return (
    <div>
      <PageHeader title="Trip Management" subtitle="Loading to unloading — full trip lifecycle"
        actions={<Button onClick={() => setForm(blank(nextSeq("TRIP", db.seq.trip)))}><Plus className="w-4 h-4" /> New Trip</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Active trips" value={active.length} icon={<Route className="w-5 h-5" />} tone="blue" />
        <Stat label="Completed" value={db.trips.filter((t) => t.status === "Completed").length} icon={<CheckCircle2 className="w-5 h-5" />} tone="green" />
        <Stat label="Awaiting unloading" value={db.trips.filter((t) => ["Reported", "Waiting for Unloading"].includes(t.status)).length} icon={<Truck className="w-5 h-5" />} tone="orange" />
        <Stat label="Total freight value" value={fmtINR(db.trips.reduce((a, t) => a + t.totalFreight, 0))} tone="indigo" />
      </div>

      <Card className="p-3 mb-3 flex flex-col sm:flex-row gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search trip, customer, vehicle, route…" />
        <Select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="sm:w-52"><option value="">All statuses</option>{TRIP_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
      </Card>

      <Card>
        <Table headers={["Trip / LR", "Customer", "Route", "Vehicle / Driver", "Material", "Freight", "Detention", "Status", "Actions"]} empty={list.length === 0}>
          {list.map((t) => {
            const v = db.vehicles.find((x) => x.id === t.vehicleId); const d = db.drivers.find((x) => x.id === t.driverId);
            return (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs"><span className="font-bold block">{t.tripNo}</span><span className="text-gray-500">{t.lrNo || "No LR"}</span></td>
                <td className="px-3 py-2 text-xs max-w-40 truncate">{t.customer}</td>
                <td className="px-3 py-2 text-xs">{t.loadingLoc || "—"} → {t.unloadingLoc || "—"}<span className="block text-[10px] text-gray-500">{fmtDate(t.loadingDT?.slice(0, 10) || "")}</span></td>
                <td className="px-3 py-2 text-xs">{v?.regNo || "—"}<span className="block text-[10px] text-gray-500">{d?.name || "—"}</span></td>
                <td className="px-3 py-2 text-xs">{t.material}<span className="block text-[10px] text-gray-500">{t.quantity}</span></td>
                <td className="px-3 py-2 text-xs font-semibold">{fmtINR(t.totalFreight)}</td>
                <td className="px-3 py-2 text-xs">{t.detentionDays}d<span className="block text-[10px] text-gray-500">{fmtINR(t.detentionCharges)}</span></td>
                <td className="px-3 py-2">{statusBadge(t.status)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <select aria-label="Trip status" value={t.status} onChange={(e) => setStatus(t, e.target.value)} className="text-[10px] border border-gray-300 rounded px-1 py-0.5 max-w-28">
                      {TRIP_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <button onClick={() => setForm({ ...t })} title="Edit" aria-label="Edit" className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-blue-600" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={`Trip ${form?.tripNo || ""}`} wide>
        {form && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Trip Number"><Input value={form.tripNo} onChange={(e) => setForm({ ...form, tripNo: e.target.value })} /></Field>
            <Field label="LR Number"><Select value={form.lrNo} onChange={(e) => setForm({ ...form, lrNo: e.target.value })}><option value="">No LR linked</option>{db.lrs.map((l) => <option key={l.id}>{l.lrNo}</option>)}</Select></Field>
            <Field label="Trip Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{TRIP_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Customer" required><Select value={form.customer} onChange={(e) => { const c = db.customers.find((x) => x.name === e.target.value); setForm({ ...form, customer: e.target.value, consignor: form.consignor || e.target.value, consignee: form.consignee || (c?.name || "") }); }}><option value="">Select customer</option>{db.customers.map((c) => <option key={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Vehicle" required><Select value={form.vehicleId} onChange={(e) => { const v = db.vehicles.find((x) => x.id === e.target.value); setForm({ ...form, vehicleId: e.target.value, driverId: v?.driverId || form.driverId }); }}><option value="">Select vehicle</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo} — {v.status}</option>)}</Select></Field>
            <Field label="Driver"><Select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}><option value="">Select driver</option>{db.drivers.filter((d) => d.status === "Active").map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="Consignor"><Input value={form.consignor} onChange={(e) => setForm({ ...form, consignor: e.target.value })} /></Field>
            <Field label="Consignee"><Input value={form.consignee} onChange={(e) => setForm({ ...form, consignee: e.target.value })} /></Field>
            <Field label="Material / Product"><Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} /></Field>
            <Field label="Loading Location"><Input value={form.loadingLoc} onChange={(e) => setForm({ ...form, loadingLoc: e.target.value })} /></Field>
            <Field label="Unloading Location"><Input value={form.unloadingLoc} onChange={(e) => setForm({ ...form, unloadingLoc: e.target.value })} /></Field>
            <Field label="Quantity"><Input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="24 KL" /></Field>
            <Field label="Loading Date &amp; Time"><Input type="datetime-local" value={form.loadingDT} onChange={(e) => setForm({ ...form, loadingDT: e.target.value })} /></Field>
            <Field label="Reporting Date &amp; Time"><Input type="datetime-local" value={form.reportingDT} onChange={(e) => setForm({ ...form, reportingDT: e.target.value })} /></Field>
            <Field label="Unloading Date &amp; Time"><Input type="datetime-local" value={form.unloadingDT} onChange={(e) => setForm({ ...form, unloadingDT: e.target.value })} /></Field>
            <Field label="Freight Type"><Select value={form.freightType} onChange={(e) => setForm({ ...form, freightType: e.target.value })}>{["Per Trip", "Per KL", "Per MT", "Per Tonne"].map((f) => <option key={f}>{f}</option>)}</Select></Field>
            <Field label="Freight Rate (₹)"><Input type="number" value={form.freightRate} onChange={(e) => setForm({ ...form, freightRate: Number(e.target.value) })} /></Field>
            <Field label="Total Freight (₹)" hint="Auto = rate (+ detention)"><Input type="number" value={form.totalFreight} onChange={(e) => setForm({ ...form, totalFreight: Number(e.target.value) })} /></Field>
            <Field label="Detention Days"><Input type="number" value={form.detentionDays} onChange={(e) => setForm({ ...form, detentionDays: Number(e.target.value) })} /></Field>
            <Field label="Detention Charges (₹)"><Input type="number" value={form.detentionCharges} onChange={(e) => setForm({ ...form, detentionCharges: Number(e.target.value) })} /></Field>
            <Field label="Additional Expenses (₹)"><Input type="number" value={form.addExpenses} onChange={(e) => setForm({ ...form, addExpenses: Number(e.target.value) })} /></Field>
            <Field label="Remarks" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save Trip</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
