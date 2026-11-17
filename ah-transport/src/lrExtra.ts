import type { LR } from "./types";

/** A typed vehicle number (not necessarily in the vehicle list) is stored inside the existing `value` text column,
 *  next to the "declared / not declared" text, so no database upgrade is needed. */
const parse = (l: Pick<LR, "value">): { v?: string; d?: string } | null => { try { const j = JSON.parse(l.value || ""); return j && typeof j === "object" ? j : null; } catch { return null; } };
export const lrVehicleNo = (l: Pick<LR, "value">, regNo?: string) => parse(l)?.v || regNo || "";
export const lrValueText = (l: Pick<LR, "value">) => { const j = parse(l); return j ? (j.d || "") : (l.value || ""); };
export const packLR = (l: Pick<LR, "value">, vehicleNo: string) => JSON.stringify({ v: vehicleNo, d: lrValueText(l) });
export const normReg = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();
