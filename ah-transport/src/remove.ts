import type { DB } from "./types";
import { readExtra, packExtra } from "./tccExtra";
import { lrVehicleNo, packLR } from "./lrExtra";

/** Permanent delete. LR and TCC copies are always kept (the vehicle number / driver name is written onto them first). */
export const vehicleImpact = (db: DB, id: string) => ({
  papers: db.vehicleDocs.filter((x) => x.vehicleId === id).length,
  maintenance: db.maintenance.filter((x) => x.vehicleId === id).length,
  trips: db.trips.filter((x) => x.vehicleId === id).length,
  lrs: db.lrs.filter((x) => x.vehicleId === id).length,
  tccs: db.tccs.filter((x) => x.vehicleId === id).length,
});
export const driverImpact = (db: DB, id: string) => ({
  papers: db.driverDocs.filter((x) => x.driverId === id).length,
  salaries: db.salaries.filter((x) => x.driverId === id).length,
  trips: db.trips.filter((x) => x.driverId === id).length,
});

export function deleteVehicle(d: DB, id: string) {
  const v = d.vehicles.find((x) => x.id === id); if (!v) return;
  d.lrs.forEach((l) => { if (l.vehicleId === id) { l.value = packLR(l, lrVehicleNo(l, v.regNo)); l.vehicleId = ""; } });
  d.tccs.forEach((t) => { if (t.vehicleId === id) { const x = readExtra(t); t.declaration = packExtra({ ...x, vehicleNo: x.vehicleNo || v.regNo }); t.vehicleId = ""; } });
  d.expenses.forEach((e) => { if (e.vehicleId === id) e.vehicleId = ""; });
  d.drivers.forEach((x) => { if (x.vehicleId === id) x.vehicleId = ""; });
  d.trips = d.trips.filter((x) => x.vehicleId !== id);
  d.vehicleDocs = d.vehicleDocs.filter((x) => x.vehicleId !== id);
  d.maintenance = d.maintenance.filter((x) => x.vehicleId !== id);
  d.assignments = d.assignments.filter((x) => x.vehicleId !== id);
  d.vehicles = d.vehicles.filter((x) => x.id !== id);
}

export function deleteDriver(d: DB, id: string) {
  const dr = d.drivers.find((x) => x.id === id); if (!dr) return;
  d.tccs.forEach((t) => { if (t.driverId === id) { const x = readExtra(t); t.declaration = packExtra({ ...x, driverName: x.driverName || dr.name }); t.driverId = ""; } });
  d.lrs.forEach((l) => { if (l.driverId === id) l.driverId = ""; });
  d.trips.forEach((t) => { if (t.driverId === id) t.driverId = ""; });
  d.vehicles.forEach((v) => { if (v.driverId === id) v.driverId = ""; });
  d.users.forEach((u) => { if (u.driverId === id) u.driverId = ""; });
  d.salaries = d.salaries.filter((x) => x.driverId !== id);
  d.assignments = d.assignments.filter((x) => x.driverId !== id);
  d.driverDocs = d.driverDocs.filter((x) => x.driverId !== id);
  d.driverHistory = d.driverHistory.filter((x) => x.driverId !== id);
  d.locations = d.locations.filter((x) => x.driverId !== id);
  d.drivers = d.drivers.filter((x) => x.id !== id);
}
