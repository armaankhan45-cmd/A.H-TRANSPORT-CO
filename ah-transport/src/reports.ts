import { DATA_MODE, supabase } from "./lib/supabase";

export type ReportKind = "Trip photo" | "Toll receipt" | "Breakdown";
export type Report = { id: string; driverId: string; kind: ReportKind; note: string; photo: string; status: "New" | "Done"; at: string };
const KEY = "ah_reports_v1", DEMO_DB = "ah_tms_db_v1";
const cloud = () => DATA_MODE === "supabase" && !!supabase;
const demoAll = (): Report[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const demoSave = (r: Report[]) => localStorage.setItem(KEY, JSON.stringify(r));

/** Resize a phone photo to about 1200 px JPEG so it stays small (roughly 150–300 KB). */
export function shrinkPhoto(file: File, max = 1200, q = 0.72): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Could not read this photo")); };
    img.src = url;
  });
}

export async function submitReport(token: string, kind: ReportKind, note: string, photo: string): Promise<boolean> {
  if (cloud()) { const { data, error } = await supabase!.rpc("submit_driver_report", { p_token: token, p_kind: kind, p_note: note, p_photo: photo }); return !error && data === true; }
  try {
    const db = JSON.parse(localStorage.getItem(DEMO_DB) || "{}");
    const d = (db.drivers || []).find((x: { trackToken?: string }) => x.trackToken === token); if (!d) return false;
    demoSave([{ id: crypto.randomUUID(), driverId: d.id, kind, note, photo, status: "New", at: new Date().toISOString() }, ...demoAll()]); return true;
  } catch { return false; }
}
export async function listReports(): Promise<Report[]> {
  if (cloud()) {
    const { data, error } = await supabase!.from("driver_reports").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return (data || []).map((r) => ({ id: r.id, driverId: r.driver_id, kind: r.kind, note: r.note || "", photo: r.photo || "", status: r.status, at: r.created_at }));
  }
  return demoAll();
}
export async function setReportDone(id: string, done: boolean) {
  if (cloud()) { const { error } = await supabase!.from("driver_reports").update({ status: done ? "Done" : "New" }).eq("id", id); if (error) throw new Error(error.message); return; }
  demoSave(demoAll().map((r) => (r.id === id ? { ...r, status: done ? "Done" : "New" } : r)));
}
export async function removeReport(id: string) {
  if (cloud()) { const { error } = await supabase!.from("driver_reports").delete().eq("id", id); if (error) throw new Error(error.message); return; }
  demoSave(demoAll().filter((r) => r.id !== id));
}
export const newCount = async () => { try { return (await listReports()).filter((r) => r.status === "New").length; } catch { return 0; } };
