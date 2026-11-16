import type { DB } from "./types";
import { todayISO, uid } from "./company";

type SetFn = (fn: (d: DB) => void) => void;

/** One rule-set for assigning a driver to a vehicle, used by the Assignments page, the vehicle screen and the driver screen. */
export function assignDriver(set: SetFn, db: DB, o: { driverId: string; vehicleId: string; startDate?: string; remarks?: string; override?: boolean; who: string }): string | null {
  const { driverId, vehicleId, override } = o;
  const startDate = o.startDate || todayISO();
  const veh = db.vehicles.find((v) => v.id === vehicleId);
  const drv = db.drivers.find((d) => d.id === driverId);
  if (!veh || !drv) return "Select both a driver and a vehicle";
  if (drv.status !== "Active") return `${drv.name} is not an active driver`;
  const mine = db.assignments.find((a) => a.driverId === driverId && !a.endDate);
  if (mine && mine.vehicleId !== vehicleId && !override) return `${drv.name} is already on another vehicle — tick "Admin override" to move them`;
  if (veh.status === "Under Maintenance" && !override) return `${veh.regNo} is under maintenance — tick "Admin override" to assign anyway`;
  const busy = db.assignments.find((a) => a.vehicleId === vehicleId && !a.endDate);
  if (busy && busy.driverId !== driverId && !override) return `${veh.regNo} already has a driver — tick "Admin override" to replace them`;
  if (busy && busy.driverId === driverId) return `${drv.name} is already assigned to ${veh.regNo}`;

  set((d) => {
    d.assignments.filter((a) => (a.driverId === driverId || a.vehicleId === vehicleId) && !a.endDate).forEach((a) => { a.endDate = startDate; a.remarks = (a.remarks || "") + " (auto-closed)"; });
    d.assignments.unshift({ id: uid(), driverId, vehicleId, startDate, endDate: "", remarks: o.remarks || "" });
    const dr = d.drivers.find((x) => x.id === driverId); if (dr) dr.vehicleId = vehicleId;
    d.drivers.filter((x) => x.vehicleId === vehicleId && x.id !== driverId).forEach((x) => { x.vehicleId = ""; });
    d.vehicles.filter((x) => x.driverId === driverId && x.id !== vehicleId).forEach((x) => { x.driverId = ""; });
    const vv = d.vehicles.find((x) => x.id === vehicleId); if (vv) vv.driverId = driverId;
    d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: o.who, action: override ? "Driver assigned (override)" : "Driver assigned", detail: `${drv.name} → ${veh.regNo} from ${startDate}` });
  });
  return null;
}

export function releaseDriver(set: SetFn, vehicleId: string, who: string) {
  set((d) => {
    d.assignments.filter((a) => a.vehicleId === vehicleId && !a.endDate).forEach((a) => { a.endDate = todayISO(); a.remarks = (a.remarks || "") + " (ended)"; });
    const v = d.vehicles.find((x) => x.id === vehicleId);
    if (v) { d.drivers.filter((x) => x.vehicleId === vehicleId).forEach((x) => { x.vehicleId = ""; }); d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: who, action: "Assignment ended", detail: `${v.regNo} driver released` }); v.driverId = ""; }
  });
}
