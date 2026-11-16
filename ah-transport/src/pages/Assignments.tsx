import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, Field, Select, Input, Textarea, Modal, Tabs, Empty, statusBadge } from "../ui";
import { Link2, Plus, ShieldAlert } from "lucide-react";
import { fmtDate, todayISO, uid } from "../company";
import { assignDriver } from "../assign";

export default function Assignments() {
  const { db, set, toast, user } = useStore();
  const [tab, setTab] = useState("Current Assignments");
  const [open, setOpen] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [override, setOverride] = useState(false);

  const current = db.assignments.filter((a) => !a.endDate);
  const past = db.assignments.filter((a) => a.endDate).sort((x, y) => y.endDate.localeCompare(x.endDate));

  const assign = () => {
    if (!driverId || !vehicleId) return toast("Select both driver and vehicle", "error");
    const err = assignDriver(set, db, { driverId, vehicleId, startDate, remarks, override, who: user?.name || "Admin" });
    if (err) return toast(err, "error");
    const v = db.vehicles.find((x) => x.id === vehicleId), dr = db.drivers.find((x) => x.id === driverId);
    toast(`${dr?.name} assigned to ${v?.regNo}`);
    setOpen(false); setDriverId(""); setVehicleId(""); setRemarks(""); setOverride(false);
  };

  const endAssignment = (id: string) => {
    set((d) => {
      const a = d.assignments.find((x) => x.id === id);
      if (a) { a.endDate = todayISO(); a.remarks += " (ended)"; const dr = d.drivers.find((x) => x.id === a.driverId); if (dr) dr.vehicleId = ""; const v = d.vehicles.find((x) => x.id === a.vehicleId); if (v) v.driverId = ""; }
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "Assignment ended", detail: id });
    });
    toast("Assignment ended — driver and vehicle released");
  };

  return (
    <div>
      <PageHeader title="Driver & Vehicle Assignment" subtitle="Current and historical assignments with dates"
        actions={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> New Assignment</Button>} />

      <Tabs tabs={["Current Assignments", "Assignment History", "Unassigned"]} active={tab} onChange={setTab} />

      {tab === "Current Assignments" && (
        <Card>
          <Table headers={["Driver", "Vehicle", "From", "To", "Remarks", "Action"]} empty={current.length === 0}>
            {current.map((a) => {
              const dr = db.drivers.find((x) => x.id === a.driverId); const v = db.vehicles.find((x) => x.id === a.vehicleId);
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs font-semibold">{dr?.name || "—"}<span className="block text-[10px] text-gray-500">{dr?.mobile}</span></td>
                  <td className="px-3 py-2 text-xs">{v?.regNo} <span className="block text-[10px] text-gray-500">{v && statusBadge(v.status)}</span></td>
                  <td className="px-3 py-2 text-xs">{fmtDate(a.startDate)}</td>
                  <td className="px-3 py-2 text-xs">Current</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{a.remarks || "—"}</td>
                  <td className="px-3 py-2"><Button size="sm" variant="secondary" onClick={() => endAssignment(a.id)}>Remove</Button></td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}

      {tab === "Assignment History" && (
        <Card>
          <Table headers={["Driver", "Vehicle", "Start", "End", "Duration", "Remarks"]} empty={past.length === 0}>
            {past.map((a) => {
              const dr = db.drivers.find((x) => x.id === a.driverId); const v = db.vehicles.find((x) => x.id === a.vehicleId);
              const days = Math.max(0, Math.round((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / 86400000));
              return <tr key={a.id}><td className="px-3 py-2 text-xs font-semibold">{dr?.name || "—"}</td><td className="px-3 py-2 text-xs">{v?.regNo || "—"}</td><td className="px-3 py-2 text-xs">{fmtDate(a.startDate)}</td><td className="px-3 py-2 text-xs">{fmtDate(a.endDate)}</td><td className="px-3 py-2 text-xs">{days}d</td><td className="px-3 py-2 text-xs text-gray-500">{a.remarks}</td></tr>;
            })}
          </Table>
        </Card>
      )}

      {tab === "Unassigned" && (
        <div className="grid md:grid-cols-2 gap-3">
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2">Drivers without vehicle</h3>
            {db.drivers.filter((d) => d.status === "Active" && !d.vehicleId).map((d) => (
              <div key={d.id} className="flex justify-between text-xs border-b border-gray-100 py-1.5"><span>{d.name} · {d.mobile}</span><button className="text-green-700 hover:underline" onClick={() => { setDriverId(d.id); setOpen(true); }}>Assign</button></div>
            ))}
            {db.drivers.filter((d) => d.status === "Active" && !d.vehicleId).length === 0 && <Empty text="All active drivers assigned" />}
          </Card>
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2">Vehicles without driver</h3>
            {db.vehicles.filter((v) => !v.driverId && v.status !== "Inactive").map((v) => (
              <div key={v.id} className="flex justify-between text-xs border-b border-gray-100 py-1.5"><span>{v.regNo} · {v.type}</span><button className="text-green-700 hover:underline" onClick={() => { setVehicleId(v.id); setOpen(true); }}>Assign</button></div>
            ))}
            {db.vehicles.filter((v) => !v.driverId && v.status !== "Inactive").length === 0 && <Empty text="All vehicles have drivers" />}
          </Card>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Assign Driver to Vehicle">
        <div className="space-y-3">
          <Field label="Driver" required><Select value={driverId} onChange={(e) => setDriverId(e.target.value)}><option value="">Select driver</option>{db.drivers.filter((d) => d.status === "Active").map((d) => <option key={d.id} value={d.id}>{d.name} — {d.mobile}</option>)}</Select></Field>
          <Field label="Vehicle" required><Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}><option value="">Select vehicle</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo} — {v.status}</option>)}</Select></Field>
          <Field label="Start Date" required><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="Remarks"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
          <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="mt-0.5" />
            <span><b>Authorised admin override</b> — allow assigning a vehicle that is Under Maintenance or already assigned. Every override is written to the audit log.</span>
          </label>
          {override && <p className="text-[11px] text-red-700 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Override will be recorded against your user account.</p>}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={assign}><Link2 className="w-4 h-4" /> Assign</Button></div>
        </div>
      </Modal>
    </div>
  );
}
