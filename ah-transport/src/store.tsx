import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DB, User, Role } from "./types";
import { seedDB } from "./seed";
import { uid, DEFAULT_FIRM, FIRMS, firmById, type Firm } from "./company";
import { DATA_MODE, supabase } from "./lib/supabase";
import { emptyDB, fetchProfile, pullAll, pushChanges, clearFileCache, type Patch, type SeqPatch } from "./lib/sync";

const KEY = "ah_tms_db_v1";
const SESSION = "ah_tms_session_v1";
const FIRM_KEY = "ah_tms_firm_v1";
const COLL_KEYS = ["vehicles", "vehicleDocs", "maintenance", "drivers", "assignments", "customers", "trips", "lrs", "tccs", "salaries", "expenses", "driverDocs", "driverHistory"] as const;
const inFirm = (r: { firm?: string }, f: string) => (r.firm || DEFAULT_FIRM) === f;
const blankSeq = () => ({ lr: 1, tcc: 1, trip: 1 });

/** Every firm gets its own number series; old single-firm data belongs to the default firm. */
function normalize(d: DB): DB {
  const seqs = { ...(d.seqs ?? { [DEFAULT_FIRM]: d.seq ?? blankSeq() }) };
  FIRMS.forEach((f) => { seqs[f.id] ||= blankSeq(); });
  return { ...d, seqs };
}
/** What pages see: only the active firm's records and number series. */
function viewOf(full: DB, firm: string): DB {
  const v: any = { ...full };
  for (const k of COLL_KEYS) v[k] = (full as any)[k].filter((r: any) => inFirm(r, firm));
  v.seq = full.seqs?.[firm] ?? blankSeq();
  return v;
}
/** Writes a page's changes back into the all-firms database, stamping new records with the active firm. */
function mergeInto(full: DB, view: DB, firm: string): DB {
  const out: any = { ...view };
  for (const k of COLL_KEYS) out[k] = [...(full as any)[k].filter((r: any) => !inFirm(r, firm)), ...(view as any)[k].map((r: any) => ({ ...r, firm }))];
  out.seqs = { ...full.seqs, [firm]: view.seq };
  out.seq = out.seqs[DEFAULT_FIRM] ?? view.seq;
  return out;
}
export const CLOUD = DATA_MODE === "supabase";

function load(): DB {
  try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw) as DB); } catch { /* ignore */ }
  return normalize(seedDB());
}

export const PERMISSIONS: Record<Role, string[]> = {
  "Super Admin": ["admin", "users", "dashboard", "vehicles", "documents", "maintenance", "expiry", "drivers", "assignments", "lr", "tcc", "trips", "customers", "salary", "expenses", "reports", "tracking", "users", "settings", "audit"],
  "Admin": ["admin", "users", "dashboard", "vehicles", "documents", "maintenance", "expiry", "drivers", "assignments", "lr", "tcc", "trips", "customers", "salary", "expenses", "reports", "tracking", "settings"],
  "Office Staff": ["dashboard", "vehicles", "documents", "maintenance", "expiry", "drivers", "assignments", "lr", "tcc", "trips", "customers", "reports"],
  "Accounts Staff": ["dashboard", "vehicles", "documents", "expiry", "salary", "expenses", "customers", "reports", "lr", "tcc"],
  "Driver": ["my"],
};

interface Ctx {
  db: DB;
  user: User | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  set: (fn: (d: DB) => void) => void;
  can: (perm: string) => boolean;
  toast: (msg: string, type?: "success" | "error") => void;
  toasts: { id: string; msg: string; type: string }[];
  reset: () => void;
  firm: Firm;
  firms: Firm[];
  switchFirm: (id: string) => void;
}

const StoreCtx = createContext<Ctx | null>(null);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [full, setDb] = useState<DB>(() => normalize(CLOUD ? emptyDB() : load()));
  const dbRef = useRef<DB>(full);
  const [firmId, setFirmId] = useState<string>(() => { try { return firmById(localStorage.getItem(FIRM_KEY) || DEFAULT_FIRM).id; } catch { return DEFAULT_FIRM; } });
  const firmRef = useRef(firmId);
  const db = useMemo(() => viewOf(full, firmId), [full, firmId]);
  const switchFirm = (id: string) => { const f = firmById(id).id; firmRef.current = f; setFirmId(f); try { localStorage.setItem(FIRM_KEY, f); } catch { /* ignore */ } };
  // a driver account only ever sees its own firm
  const alignFirm = (u: User | null) => {
    if (u?.role !== "Driver" || !u.driverId) return;
    const dr = dbRef.current.drivers.find((x) => x.id === u.driverId);
    if (dr) switchFirm(dr.firm || DEFAULT_FIRM);
  };
  const [user, setUser] = useState<User | null>(() => {
    if (CLOUD) return null;
    try { const s = localStorage.getItem(SESSION); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const userRef = useRef<User | null>(user);
  const [booting, setBooting] = useState(CLOUD);
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: string }[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const replaceDb = (d: DB) => { const n = normalize(d); dbRef.current = n; setDb(n); };
  const toast = (msg: string, type: "success" | "error" = "success") => {
    const id = uid(); setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  };

  // ---- demo mode: persist to localStorage (never use real data) ----
  useEffect(() => { if (!CLOUD) localStorage.setItem(KEY, JSON.stringify(full)); }, [full]);

  // ---- cloud mode: restore session on load ----
  const loadCloud = async (userId: string): Promise<string | null> => {
    const profile = await fetchProfile(userId);
    if (!profile || !profile.active) { await supabase!.auth.signOut(); return "This account is inactive or not set up. Contact the administrator."; }
    userRef.current = profile; setUser(profile);
    replaceDb(await pullAll());
    alignFirm(profile);
    return null;
  };
  useEffect(() => {
    if (!CLOUD) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase!.auth.getSession();
        if (data.session && alive) await loadCloud(data.session.user.id);
      } catch (e) { console.error(e); } finally { if (alive) setBooting(false); }
    })();
    const { data: sub } = supabase!.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_OUT") wipe(); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wipe = () => { userRef.current = null; setUser(null); clearFileCache(); replaceDb(emptyDB()); };

  const applyPatches = ({ patches, seqs }: { patches: Patch[]; seqs: SeqPatch[] }) => {
    if (!patches.length && !seqs.length) return;
    const d = clone(dbRef.current);
    patches.forEach((p) => { const it = ((d as any)[p.key] as any[]).find((x) => x.id === p.id); if (it) it[p.field] = p.value; });
    seqs.forEach((s) => { d.seqs ||= {}; const q = (d.seqs[s.firm] ||= blankSeq()); q[s.seq] = Math.max(q[s.seq], s.next); });
    replaceDb(d);
  };

  const enqueue = (prev: DB, next: DB) => {
    queue.current = queue.current.then(async () => {
      try { applyPatches(await pushChanges(prev, next, userRef.current?.id)); }
      catch (e) {
        console.error(e);
        toast(`Could not save: ${(e as Error).message}`, "error");
        try { replaceDb(await pullAll()); } catch { /* keep screen as is */ }
      }
    });
  };

  const set = (fn: (d: DB) => void) => {
    const prev = dbRef.current; const view = clone(viewOf(prev, firmRef.current)); fn(view);
    const next = mergeInto(prev, view, firmRef.current);
    replaceDb(next);
    if (CLOUD) enqueue(prev, next);
  };
  const audit = (action: string, detail: string, who?: string) => set((d) => {
    d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: who || "System", action, detail });
    d.audits = d.audits.slice(0, 300);
  });

  const login = async (email: string, password: string): Promise<string | null> => {
    if (CLOUD) {
      const { data, error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) return "Invalid email or password.";
      try {
        const msg = await loadCloud(data.user.id);
        if (msg) return msg;
      } catch (e) { console.error(e); return "Signed in, but data could not be loaded. Check your connection and try again."; }
      audit("Login", `${userRef.current?.name} (${userRef.current?.role}) logged in`, userRef.current?.name);
      return null;
    }
    const u = dbRef.current.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password && x.active);
    if (!u) return "Invalid email or password, or account inactive.";
    userRef.current = u; setUser(u); localStorage.setItem(SESSION, JSON.stringify(u)); alignFirm(u);
    audit("Login", `${u.name} (${u.role}) logged in`, u.name);
    return null;
  };
  const logout = () => {
    if (CLOUD) { void supabase!.auth.signOut(); wipe(); return; }
    userRef.current = null; setUser(null); localStorage.removeItem(SESSION);
  };
  const can = (perm: string) => !!user && PERMISSIONS[user.role].includes(perm);
  const reset = () => {
    if (CLOUD) { toast("Reset is disabled on the live database", "error"); return; }
    localStorage.removeItem(KEY); replaceDb(seedDB()); toast("Demo data reset");
  };

  const value = useMemo(() => ({ db, user, booting, login, logout, set, can, toast, toasts, reset, firm: firmById(firmId), firms: FIRMS, switchFirm }), [db, user, booting, toasts, firmId]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
