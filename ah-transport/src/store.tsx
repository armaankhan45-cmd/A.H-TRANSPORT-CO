import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DB, User, Role } from "./types";
import { seedDB } from "./seed";
import { uid } from "./company";
import { DATA_MODE, supabase } from "./lib/supabase";
import { emptyDB, fetchProfile, pullAll, pushChanges, clearFileCache, type Patch, type SeqPatch } from "./lib/sync";

const KEY = "ah_tms_db_v1";
const SESSION = "ah_tms_session_v1";
export const CLOUD = DATA_MODE === "supabase";

function load(): DB {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as DB; } catch { /* ignore */ }
  return seedDB();
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
}

const StoreCtx = createContext<Ctx | null>(null);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => (CLOUD ? emptyDB() : load()));
  const dbRef = useRef<DB>(db);
  const [user, setUser] = useState<User | null>(() => {
    if (CLOUD) return null;
    try { const s = localStorage.getItem(SESSION); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const userRef = useRef<User | null>(user);
  const [booting, setBooting] = useState(CLOUD);
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: string }[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const replaceDb = (d: DB) => { dbRef.current = d; setDb(d); };
  const toast = (msg: string, type: "success" | "error" = "success") => {
    const id = uid(); setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  };

  // ---- demo mode: persist to localStorage (never use real data) ----
  useEffect(() => { if (!CLOUD) localStorage.setItem(KEY, JSON.stringify(db)); }, [db]);

  // ---- cloud mode: restore session on load ----
  const loadCloud = async (userId: string): Promise<string | null> => {
    const profile = await fetchProfile(userId);
    if (!profile || !profile.active) { await supabase!.auth.signOut(); return "This account is inactive or not set up. Contact the administrator."; }
    userRef.current = profile; setUser(profile);
    replaceDb(await pullAll());
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
    seqs.forEach((s) => { d.seq[s.seq] = Math.max(d.seq[s.seq], s.next); });
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
    const prev = dbRef.current; const next = clone(prev); fn(next);
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
    userRef.current = u; setUser(u); localStorage.setItem(SESSION, JSON.stringify(u));
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

  const value = useMemo(() => ({ db, user, booting, login, logout, set, can, toast, toasts, reset }), [db, user, booting, toasts]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
