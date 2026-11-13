import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, Field, Select, Input, Textarea, Modal, Tabs, Empty, statusBadge } from "../ui";
import { Link2, Plus, ShieldAlert } from "lucide-react";
import { fmtDate, todayISO, uid } from "../company";

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
    const veh = db.vehicles.find((v) => v.id === vehicleId);
    const drv = db.drivers.find((d) => d.id === driverId);
    if (!veh || !drv) return;
    if (drv.status !== "Active") return toast("Driver is not active", "error");
    const existing = db.assignments.find((a) => a.driverId === driverId && !a.endDate);
    if (existing && existing.vehicleId !== vehicleId && !override) return toast("Driver already assigned to another vehicle. Admin override required.", "error");
    if (veh.status === "Under Maintenance" && !override) return toast("Vehicle is Under Maintenance. Authorised admin override required.", "error");
    if (db.assignments.some((a) => a.vehicleId === vehicleId && !a.endDate) && !override) return toast("Vehicle already has an active driver. Override required.", "error");

    set((d) => {
      // close existing assignments
      d.assignments.filter((a) => (a.driverId === driverId || a.vehicleId === vehicleId) && !a.endDate).forEach((a) => { a.endDate = startDate; a.remarks += " (auto-closed)"; });
      d.assignments.unshift({ id: uid(), driverId, vehicleId, startDate, endDate: "", remarks });
      const dr = d.drivers.find((x) => x.id === driverId); if (dr) dr.vehicleId = vehicleId;
      const vv = d.vehicles.find((x) => x.id === vehicleId); if (vv) { vv.driverId = driverId; if (vv.status === "Available") vv.status = "Available"; }
      // clear other drivers assigned to same vehicle
      d.drivers.filter((x) => x.vehicleId === vehicleId && x.id !== driverId).forEach((x) => { x.vehicleId = ""; });
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: override ? "Driver assigned (override)" : "Driver assigned", detail: `${drv.name} → ${veh.regNo} from ${startDate}` });
    });
    toast(`${drv.name} assigned to ${veh.regNo}`);
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
