import { caps } from "./caps";
/**
 * Keeps the in-memory DB (what every page already uses) in sync with Supabase.
 *  - pullAll():      load everything the signed-in user is ALLOWED to see (Row Level Security decides)
 *  - pushChanges():  diff old vs new state and write only what changed
 * Pages are unchanged: they keep calling set((d) => ...).
 */
import type { DB, User } from "../types";
import { supabase, signedUrls, uploadDataUrl, nextDocumentNo, type Bucket } from "./supabase";
import { COLLS, FILE_FIELDS, ROLE_FROM_DB, ROLE_TO_DB, type CollKey } from "./mappers";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
export interface Patch { key: string; id: string; field: string; value: string }
export type SeqPatch = { seq: "lr" | "tcc" | "trip"; next: number; firm: string };

const sb = () => { if (!supabase) throw new Error("Supabase is not configured"); return supabase; };
const pathByUrl = new Map<string, string>();
export const clearFileCache = () => pathByUrl.clear();

export const emptyDB = (): DB => ({
  users: [], vehicles: [], vehicleDocs: [], maintenance: [], drivers: [], assignments: [], customers: [], trips: [], lrs: [], tccs: [],
  salaries: [], expenses: [], audits: [], driverDocs: [], driverHistory: [], seq: { lr: 1, tcc: 1, trip: 1 }, seqs: {},
  settings: { notifyDays: 30, trackingPolicy: "" }, locations: [],
});

async function fetchAll(table: string, orderCol = "created_at"): Promise<Any[]> {
  const out: Any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb().from(table).select("*").order(orderCol, { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function fetchProfile(userId: string): Promise<User | null> {
  const { data } = await sb().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!data) return null;
  return { id: data.id, name: data.full_name || data.email, email: data.email, password: "", role: ROLE_FROM_DB[data.role] ?? "Driver", driverId: data.driver_id ?? undefined, active: !!data.is_active };
}

export async function pullAll(): Promise<DB> {
  const db = emptyDB();
  const results = await Promise.all(COLLS.map((c) => fetchAll(c.table)));
  COLLS.forEach((c, i) => { (db as Any)[c.key] = results[i].map(c.fromRow); });

  // newest first, like the app expects
  db.driverHistory.reverse(); 

  // users (admins see all profiles; everyone else sees only themselves)
  const profiles = await fetchAll("profiles");
  db.users = profiles.map((p) => ({ id: p.id, name: p.full_name || p.email, email: p.email, password: "", role: ROLE_FROM_DB[p.role] ?? "Driver", driverId: p.driver_id ?? undefined, active: !!p.is_active }));

  // audit log: latest 300
  const au = await sb().from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
  db.audits = (au.data || []).map((a: Any) => ({ id: String(a.id), time: a.created_at, user: a.actor_name || "System", action: a.action, detail: a.detail?.text ?? "" }));

  // latest consented location per driver
  const lo = await sb().from("driver_locations").select("*").order("recorded_at", { ascending: false }).limit(2000);
  const seen = new Set<string>();
  (lo.data || []).forEach((l: Any) => {
    if (seen.has(l.driver_id)) return; seen.add(l.driver_id);
    db.locations.push({ driverId: l.driver_id, lat: l.lat, lng: l.lng, updated: l.recorded_at, consent: !!l.consent });
  });

  // settings + sequence counters
  const st = await sb().from("app_settings").select("key,value");
  (st.data || []).forEach((r: Any) => {
    if (r.key === "notify_days") db.settings.notifyDays = Number(r.value) || 30;
    if (r.key === "tracking_policy") db.settings.trackingPolicy = String(r.value ?? "");
  });
  const sq = await sb().from("document_sequences").select("*");
  (sq.data || []).forEach((r: Any) => {
    const q = ((db.seqs ||= {})[r.firm || "ah-transport"] ||= { lr: 1, tcc: 1, trip: 1 });
    if (r.prefix === "LR") q.lr = r.last_number + 1;
    if (r.prefix === "TCC") q.tcc = r.last_number + 1;
    if (r.prefix === "TRIP") q.trip = r.last_number + 1;
  });

  // derived link: driver.vehicleId comes from vehicle.driverId
  db.vehicles.forEach((v) => { const d = db.drivers.find((x) => x.id === v.driverId); if (d) d.vehicleId = v.id; });

  await resolveFiles(db);
  return db;
}

/** Replace storage paths with short-lived signed URLs so existing pages can show them. */
async function resolveFiles(db: DB) {
  const want: Record<string, Set<string>> = {};
  for (const [key, fields] of Object.entries(FILE_FIELDS)) for (const f of fields!) for (const item of (db as Any)[key]) {
    if (item[f.field]) (want[f.bucket] ||= new Set()).add(item[f.field]);
  }
  const maps: Record<string, Record<string, string>> = {};
  await Promise.all(Object.entries(want).map(async ([b, set]) => { maps[b] = await signedUrls(b as Bucket, [...set]); }));
  for (const [key, fields] of Object.entries(FILE_FIELDS)) for (const f of fields!) for (const item of (db as Any)[key]) {
    const p = item[f.field]; if (!p) continue;
    const url = maps[f.bucket]?.[p];
    if (url) { pathByUrl.set(url, p); item[f.field] = url; } else item[f.field] = "";
  }
}

/** data: URL -> uploaded path; signed URL -> its path; "" -> "" */
async function toPath(item: Any, key: CollKey, patches: Patch[]): Promise<Any> {
  const fields = FILE_FIELDS[key]; if (!fields) return item;
  const out = { ...item };
  for (const f of fields) {
    const v: string = out[f.field];
    if (!v) { out[f.field] = ""; continue; }
    if (v.startsWith("data:")) {
      const path = await uploadDataUrl(f.bucket, f.folder(item), v);
      out[f.field] = path;
      const url = (await signedUrls(f.bucket, [path]))[path];
      if (url) { pathByUrl.set(url, path); patches.push({ key, id: item.id, field: f.field, value: url }); }
    } else if (v.startsWith("http")) {
      out[f.field] = pathByUrl.get(v) ?? "";
    }
  }
  return out;
}

const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

export async function pushChanges(prev: DB, next: DB, userId?: string): Promise<{ patches: Patch[]; seqs: SeqPatch[] }> {
  const patches: Patch[] = []; const seqs: SeqPatch[] = [];
  const client = sb();
  const fail = (t: string, e: { message: string } | null) => { if (e) throw new Error(`${t}: ${e.message}`); };

  // profile edits (users can only be CREATED from the Supabase dashboard)
  for (const u of next.users) {
    const p = prev.users.find((x) => x.id === u.id);
    if (p && changed(p, u)) {
      const r = await client.from("profiles").update({ full_name: u.name, role: ROLE_TO_DB[u.role], is_active: u.active, driver_id: u.driverId || null }).eq("id", u.id);
      fail("profiles", r.error);
    }
  }

  // settings
  if (changed(prev.settings, next.settings)) {
    const r = await client.from("app_settings").upsert([
      { key: "notify_days", value: next.settings.notifyDays, updated_by: userId },
      { key: "tracking_policy", value: next.settings.trackingPolicy, updated_by: userId },
    ], { onConflict: "key" });
    fail("settings", r.error);
  }

  for (const c of COLLS) {
    const before = new Map<string, Any>(((prev as Any)[c.key] as Any[]).map((x) => [x.id, x]));
    const after = (next as Any)[c.key] as Any[];
    const afterIds = new Set(after.map((x) => x.id));

    for (const item of after) {
      const old = before.get(item.id);
      if (old && !changed(old, item)) continue;
      const row = c.toRow(await toPath(item, c.key, patches));
      if (!old) {
        const typed = String(item[c.seq?.field || ""] || "").trim();
        const custom = !!typed && !/^(LR|TCC|TRIP)\/\d+$/i.test(typed);   // a number the user typed by hand is kept as is
        if (c.seq && !custom) {                        // server hands out LR/TCC/TRIP numbers atomically
          const firm = item.firm || "ah-transport";
          const no = await nextDocumentNo(c.seq.prefix, firm);
          row[c.seq.col] = no;
          if (no !== item[c.seq.field]) patches.push({ key: c.key, id: item.id, field: c.seq.field, value: no });
          seqs.push({ seq: c.seq.seqKey, next: parseInt(no.split("/")[1], 10) + 1, firm });
        }
        if (c.createdBy && userId) row.created_by = userId;
        const r = await client.from(c.table).insert(row); fail(c.table, r.error);
      } else {
        const r = await client.from(c.table).update(row).eq("id", item.id); fail(c.table, r.error);
      }
    }
    for (const [id] of before) if (!afterIds.has(id)) { const r = await client.from(c.table).delete().eq("id", id); fail(c.table, r.error); }
  }

  // audit log (insert only)
  const knownAudit = new Set(prev.audits.map((a) => a.id));
  const newAudits = next.audits.filter((a) => !knownAudit.has(a.id)).reverse();
  if (newAudits.length) {
    const r = await client.from("audit_logs").insert(newAudits.map((a) => ({ actor_id: userId, actor_name: a.user, action: a.action, detail: { text: a.detail } })));
    fail("audit_logs", r.error);
  }

  // locations: insert on change; delete all own rows when consent is withdrawn
  for (const l of next.locations) {
    const p = prev.locations.find((x) => x.driverId === l.driverId);
    if (p && !changed(p, l)) continue;
    if (l.consent) {
      const r = await client.from("driver_locations").insert({ driver_id: l.driverId, lat: l.lat, lng: l.lng, consent: true }); fail("driver_locations", r.error);
    } else if (p?.consent) {
      const r = await client.from("driver_locations").delete().eq("driver_id", l.driverId); fail("driver_locations", r.error);
    }
  }
  return { patches, seqs };
}

/** Checks which database upgrades have been run. Returns the SQL files that are still missing. */
export async function probeSchema(): Promise<string[]> {
  const miss: string[] = [];
  const c = sb();
  if ((await c.from("trips").select("lr_no").limit(1)).error) miss.push("0005_app_integration.sql");
  const f = !(await c.from("vehicles").select("firm").limit(1)).error; caps.firm = f; if (!f) miss.push("0006_firms.sql");
  const k = !(await c.from("drivers").select("track_token").limit(1)).error; caps.track = k; if (!k) miss.push("0007_tracking.sql");
  return miss;
}
