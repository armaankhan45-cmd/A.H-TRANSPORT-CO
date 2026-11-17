import type { TCC } from "./types";

/** Typed-in TCC details (material, vehicle no., driver name) are packed into the existing `declaration` text column,
 *  so no database upgrade is needed. Older certificates simply read back as empty. */
export type TccExtra = { material: string; vehicleNo: string; driverName: string };
export const readExtra = (t: Pick<TCC, "declaration">): TccExtra => {
  try { const j = JSON.parse(t.declaration || ""); if (j && typeof j === "object") return { material: j.m || "", vehicleNo: j.v || "", driverName: j.d || "" }; } catch { /* old free-text declaration */ }
  return { material: "", vehicleNo: "", driverName: "" };
};
export const packExtra = (e: TccExtra) => JSON.stringify({ m: e.material, v: e.vehicleNo, d: e.driverName });
export const normReg = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();
