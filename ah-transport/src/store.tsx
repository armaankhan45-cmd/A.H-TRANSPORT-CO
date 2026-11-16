import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DB, User, Role } from "./types";
import { seedDB } from "./seed";
import { uid } from "./company";

const KEY = "ah_tms_db_v1";
const SESSION = "ah_tms_session_v1";

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DB>;
      const defaults = seedDB();
      const keys = Object.keys(defaults) as (keyof DB)[];
      for (const key of keys) {
        if (Array.isArray(defaults[key]) && !Array.isArray(parsed[key])) (parsed as any)[key] = defaults[key];
      }
      return { ...defaults, ...parsed } as DB;
    }
  } catch { /* ignore */ }
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
  login: (email: string, password: string) => string | null;
  logout: () => void;
  set: (fn: (d: DB) => void) => void;
  can: (perm: string) => boolean;
  toast: (msg: string, type?: "success" | "error") => void;
  toasts: { id: string; msg: string; type: string }[];
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const [user, setUser] = useState<User | null>(() => {
    try { const s = localStorage.getItem(SESSION); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: string }[]>([]);
  const storageWarned = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); storageWarned.current = false; }
    catch {
      if (!storageWarned.current) {
        storageWarned.current = true;
        setToasts((t) => [...t, { id: uid(), msg: "Browser storage is full or unavailable. This change may not survive a reload; use smaller files or reset demo data.", type: "error" }]);
      }
    }
  }, [db]);

  const set = (fn: (d: DB) => void) => {
    setDb((prev) => { const copy: DB = JSON.parse(JSON.stringify(prev)); fn(copy); return copy; });
  };
  const audit = (action: string, detail: string, who?: string) => set((d) => {
    d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: who || "System", action, detail });
    d.audits = d.audits.slice(0, 300);
  });

  const login = (email: string, password: string) => {
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password && x.active);
    if (!u) return "Invalid email or password, or account inactive.";
    setUser(u); localStorage.setItem(SESSION, JSON.stringify(u));
    audit("Login", `${u.name} (${u.role}) logged in`, u.name);
    return null;
  };
  const logout = () => { setUser(null); localStorage.removeItem(SESSION); };
  const toast = (msg: string, type: "success" | "error" = "success") => {
    const id = uid(); setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  };
  const can = (perm: string) => !!user && PERMISSIONS[user.role].includes(perm);
  const reset = () => { localStorage.removeItem(KEY); setDb(seedDB()); toast("Demo data reset"); };

  const value = useMemo(() => ({ db, user, login, logout, set, can, toast, toasts, reset }), [db, user, toasts]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
