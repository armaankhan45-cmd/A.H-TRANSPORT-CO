import React, { useMemo, useState } from "react";
import { StoreProvider, useStore, PERMISSIONS, CLOUD } from "./store";
import { CONFIG_ERROR } from "./lib/supabase";
import {
  LayoutDashboard, Truck, FileText, Wrench, CalendarClock, Users, Link2, ReceiptText, Droplets,
  Route, Building2, Wallet, IndianRupee, BarChart3, MapPin, ShieldCheck, Bell, Menu, LogOut, Search, X, RefreshCw, UserCircle2,
} from "lucide-react";
import { daysLeft, fmtDate } from "./company";
import { Badge, Button } from "./ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Vehicles from "./pages/Vehicles";
import Documents from "./pages/Documents";
import Maintenance from "./pages/Maintenance";
import Drivers from "./pages/Drivers";
import Assignments from "./pages/Assignments";
import LRPage from "./pages/LR";
import TCCPage from "./pages/TCC";
import Trips from "./pages/Trips";
import Customers from "./pages/Customers";
import Salary from "./pages/Salary";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Tracking from "./pages/Tracking";
import Admin from "./pages/Admin";
import DriverPortal from "./pages/DriverPortal";

export const NAV: { key: string; label: string; icon: typeof Truck; core?: boolean }[] = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard, core: true },
  { key: "lr", label: "LR", icon: ReceiptText, core: true },
  { key: "tcc", label: "TCC", icon: Droplets, core: true },
  { key: "vehicles", label: "Vehicles", icon: Truck, core: true },
  { key: "drivers", label: "Drivers", icon: Users, core: true },
  { key: "tracking", label: "Live location", icon: MapPin, core: true },
  { key: "expiry", label: "Papers & Expiry", icon: CalendarClock },
  { key: "documents", label: "Vehicle Papers", icon: FileText },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "assignments", label: "Assignments", icon: Link2 },
  { key: "trips", label: "Trips", icon: Route },
  { key: "customers", label: "Customers", icon: Building2 },
  { key: "salary", label: "Salary", icon: Wallet },
  { key: "expenses", label: "Expenses", icon: IndianRupee },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "overview", label: "Detailed Dashboard", icon: BarChart3 },
  { key: "admin", label: "Users & Settings", icon: ShieldCheck },
];

const TITLES: Record<string, string> = Object.fromEntries(NAV.map((n) => [n.key, n.label]));

function Shell() {
  const { user, db, logout, can, toasts, reset, booting, firm, firms, switchFirm, issues } = useStore();
  const [page, setPage] = useState("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globalQ, setGlobalQ] = useState("");

  const notifications = useMemo(() => {
    const out: { title: string; sub: string; tone: string; page: string }[] = [];
    const nd = db.settings.notifyDays || 30;
    db.vehicleDocs.forEach((d) => {
      const left = daysLeft(d.expiryDate);
      const v = db.vehicles.find((x) => x.id === d.vehicleId);
      if (left < 0) out.push({ title: `${v?.regNo}: ${d.name} EXPIRED`, sub: `${Math.abs(left)} days overdue`, tone: "bg-red-100 text-red-800", page: "expiry" });
      else if (left <= nd) out.push({ title: `${v?.regNo}: ${d.name} expiring`, sub: `${left} days left — ${fmtDate(d.expiryDate)}`, tone: left <= 7 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800", page: "expiry" });
    });
    db.drivers.forEach((dr) => {
      [["Driving licence", dr.licenceExpiry], ["Hazmat training card", dr.trainingExpiry]].forEach(([label, exp]) => {
        const left = daysLeft(exp as string);
        if (left <= nd) out.push({ title: `${dr.name}: ${label}`, sub: left < 0 ? `Expired ${Math.abs(left)} days ago` : `${left} days left`, tone: left <= 7 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800", page: "drivers" });
      });
    });
    db.maintenance.filter((m) => m.status !== "Completed" && m.status !== "Cancelled").forEach((m) => {
      const v = db.vehicles.find((x) => x.id === m.vehicleId);
      const overdue = m.status === "In Progress" && m.expectedEnd && daysLeft(m.expectedEnd) < 0;
      out.push({ title: `${overdue ? "OVERDUE: " : ""}${v?.regNo} — ${m.title}`, sub: overdue ? `Expected ${fmtDate(m.expectedEnd)}` : `${m.status} · due ${fmtDate(m.expectedEnd)}`, tone: overdue ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800", page: "maintenance" });
    });
    const pendingSal = db.salaries.filter((s) => s.status === "Pending");
    if (pendingSal.length) out.push({ title: `${pendingSal.length} salary payments pending`, sub: "Open salary register", tone: "bg-amber-100 text-amber-800", page: "salary" });
    const pendingUnload = db.trips.filter((t) => ["Reported", "Waiting for Unloading"].includes(t.status));
    if (pendingUnload.length) out.push({ title: `${pendingUnload.length} trips pending unloading`, sub: "Open trips register", tone: "bg-blue-100 text-blue-800", page: "trips" });
    return out;
  }, [db]);

  const searchResults = useMemo(() => {
    const q = globalQ.trim().toLowerCase();
    if (!q) return [];
    const r: { label: string; sub: string; page: string }[] = [];
    db.vehicles.filter((v) => v.regNo.toLowerCase().includes(q)).slice(0, 6).forEach((v) => r.push({ label: v.regNo, sub: `${v.type} · ${v.status}`, page: "vehicles" }));
    db.drivers.filter((d) => d.name.toLowerCase().includes(q) || d.mobile.includes(q)).slice(0, 6).forEach((d) => r.push({ label: d.name, sub: `Driver · ${d.mobile}`, page: "drivers" }));
    db.lrs.filter((l) => l.lrNo.toLowerCase().includes(q) || l.consignor.toLowerCase().includes(q)).slice(0, 6).forEach((l) => r.push({ label: l.lrNo, sub: `LR · ${l.consignor}`, page: "lr" }));
    db.tccs.filter((t) => t.tccNo.toLowerCase().includes(q)).slice(0, 6).forEach((t) => r.push({ label: t.tccNo, sub: `TCC · ${t.recipient}`, page: "tcc" }));
    db.trips.filter((t) => t.tripNo.toLowerCase().includes(q)).slice(0, 6).forEach((t) => r.push({ label: t.tripNo, sub: `Trip · ${t.customer}`, page: "trips" }));
    db.customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6).forEach((c) => r.push({ label: c.name, sub: "Customer", page: "customers" }));
    return r;
  }, [globalQ, db]);

  if (booting) return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Loading…</div>;
  if (!user) return <Login />;

  const allowed = PERMISSIONS[user.role];
  const nav = NAV.filter((n) => allowed.includes(n.key === "overview" ? "dashboard" : n.key));
  const core = nav.filter((n) => n.core);
  const more = nav.filter((n) => !n.core);

  const render = () => {
    if (user.role === "Driver") return <DriverPortal />;
    switch (page) {
      case "vehicles": return <Vehicles />;
      case "documents": return <Documents mode="docs" />;
      case "expiry": return <Documents mode="expiry" />;
      case "maintenance": return <Maintenance />;
      case "drivers": return <Drivers />;
      case "assignments": return <Assignments />;
      case "lr": return <LRPage />;
      case "tcc": return <TCCPage />;
      case "trips": return <Trips />;
      case "customers": return <Customers />;
      case "salary": return <Salary />;
      case "expenses": return <Expenses />;
      case "reports": return <Reports />;
      case "tracking": return <Tracking />;
      case "admin": return <Admin />;
      case "overview": return <Dashboard onNavigate={setPage} />;
      default: return <Home onNavigate={setPage} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#eef1f4]">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-green-950 text-white transform transition-transform lg:translate-x-0 ${sidebar ? "translate-x-0" : "-translate-x-full"} flex flex-col`}>
        <div className="px-4 py-4 border-b border-green-900 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-md bg-signal flex items-center justify-center font-display font-bold text-lg text-slate-900">AH</div>
          <div className="min-w-0">
            <p className="font-display font-bold text-lg leading-tight truncate">{firm.display}</p>
            <p className="text-xs text-slate-300 truncate">Fleet management</p>
          </div>
          <button className="lg:hidden ml-auto" onClick={() => setSidebar(false)}><X className="w-5 h-5" /></button>
        </div>
        {user?.role !== "Driver" && (
          <div className="px-3 py-2 border-b border-green-900">
            <label className="block text-xs text-slate-300 mb-1">Company</label>
            <select value={firm.id} onChange={(e) => { switchFirm(e.target.value); setPage("dashboard"); }}
              className="w-full rounded-md bg-green-900 text-white text-sm font-semibold px-2 py-1.5 border border-green-700 focus:outline-none">
              {firms.map((f) => <option key={f.id} value={f.id}>{f.display}</option>)}
            </select>
            {firm.placeholder && <p className="mt-1 text-[10px] text-amber-300">Firm details are placeholders - update them in company.ts.</p>}
          </div>
        )}
        <nav className="flex-1 overflow-y-auto py-2">
          {core.map((n) => {
            const Icon = n.icon;
            const activeItem = page === n.key;
            return (
              <button key={n.key} onClick={() => { setPage(n.key); setSidebar(false); }}
                className={`w-full flex items-center gap-3 pl-5 pr-4 py-3 text-base transition border-l-4 ${activeItem ? "bg-green-900 text-white font-semibold border-signal" : "border-transparent text-slate-300 hover:bg-green-900/60 hover:text-white"}`}>
                <Icon className="w-5 h-5 shrink-0" /> <span className="truncate">{n.label}</span>
              </button>
            );
          })}
          <details className="mt-2 border-t border-green-900" open={more.some((n) => n.key === page)}>
            <summary className="px-5 py-3 text-sm text-slate-300 cursor-pointer select-none hover:text-white">More</summary>
            {more.map((n) => {
              const Icon = n.icon;
              const activeItem = page === n.key;
              return (
                <button key={n.key} onClick={() => { setPage(n.key); setSidebar(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${activeItem ? "bg-green-800 text-white font-semibold" : "text-green-100 hover:bg-green-900"}`}>
                  <Icon className="w-4 h-4 shrink-0" /> <span className="truncate">{n.label}</span>
                  {n.key === "expiry" && notifications.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 rounded-full">{notifications.length}</span>}
                </button>
              );
            })}
          </details>
        </nav>
        <div className="p-3 border-t border-green-900 text-[11px] text-green-300">
          <p className="truncate">{firm.email}</p>
          <p>{firm.phones[0]}</p>
        </div>
      </aside>
      {sidebar && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebar(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-300/70">
          <div className="hazard" />
          <div className="flex items-center gap-2 px-3 sm:px-5 py-2.5">
            <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebar(true)}><Menu className="w-5 h-5" /></button>
            <div className="hidden md:block font-display font-semibold text-lg text-slate-900">{user.role === "Driver" ? "Driver app" : (TITLES[page] || "Home")}</div>
            <div className="relative ml-auto w-40 sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input value={globalQ} onChange={(e) => setGlobalQ(e.target.value)} placeholder="Search vehicle, driver, LR…"
                className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-green-600" />
              {globalQ && (
                <div className="absolute mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto z-30">
                  {searchResults.length === 0 && <p className="p-3 text-xs text-gray-400">No matches</p>}
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => { setPage(r.page); setGlobalQ(""); }} className="block w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50">
                      <span className="text-sm font-medium text-gray-900">{r.label}</span>
                      <span className="block text-[11px] text-gray-500">{r.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setNotifOpen((v) => !v)} className="relative p-2 rounded-lg hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-600" />
                {notifications.length > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{notifications.length > 99 ? "99+" : notifications.length}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-1 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-40 max-h-[70vh] overflow-y-auto">
                  <div className="px-3 py-2 border-b flex items-center justify-between sticky top-0 bg-white">
                    <span className="font-semibold text-sm">Notifications</span>
                    <Badge cls="bg-red-100 text-red-800">{notifications.length}</Badge>
                  </div>
                  {notifications.length === 0 && <p className="p-4 text-sm text-gray-400">All clear — nothing needs attention.</p>}
                  {notifications.slice(0, 40).map((n, i) => (
                    <button key={i} onClick={() => { setPage(n.page); setNotifOpen(false); }} className="w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.tone.split(" ")[0].replace("bg-", "bg-").replace("-100", "-500")}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                          <p className="text-[11px] text-gray-500">{n.sub}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
              <UserCircle2 className="w-7 h-7 text-green-800" />
              <div className="leading-tight">
                <p className="text-xs font-semibold text-gray-900 max-w-28 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-500">{user.role}</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100" title="Logout"><LogOut className="w-5 h-5 text-gray-600" /></button>
          </div>
        </header>

        <main className="p-3 sm:p-5 pb-24 lg:pb-5 flex-1 min-w-0">{!CLOUD && <div className="mb-3 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900"><b>Demo mode.</b> Data here is sample data saved only in this browser. To make this the real app, add the Supabase settings in Vercel (VITE_DATA_MODE=supabase, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and redeploy.</div>}{issues && issues.length > 0 && <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"><b>Database setup incomplete.</b> Run these files in Supabase → SQL Editor (in order): {issues.join(", ")}. Also make sure your login has role super_admin, otherwise saving vehicles/drivers will be refused.</div>}{render()}</main>
        <footer className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <span>{firm.name} — {firm.address}</span>
          {!CLOUD && <button onClick={() => { if (confirm("Reset all data to demo seed?")) reset(); }} className="inline-flex items-center gap-1 hover:text-gray-600"><RefreshCw className="w-3 h-3" /> Reset demo data</button>}
        </footer>
      </div>

      {/* toasts */}
      <div className="fixed bottom-4 right-4 z-[70] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${t.type === "error" ? "bg-red-600" : "bg-green-700"}`}>{t.msg}</div>
        ))}
      </div>
      {user.role !== "Driver" && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 grid grid-cols-6 no-print">
          {core.map((n) => { const Icon = n.icon; const on = page === n.key; return (
            <button key={n.key} onClick={() => setPage(n.key)} className={`flex flex-col items-center gap-0.5 py-2 border-t-4 ${on ? "border-signal text-green-900" : "border-transparent text-slate-500"}`}>
              <Icon className="w-6 h-6" strokeWidth={on ? 2.4 : 1.8} /><span className="text-[11px] font-semibold leading-none">{n.key === "tracking" ? "Live" : n.label}</span>
            </button>); })}
        </nav>
      )}
    </div>
  );
}

function Problem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-gray-100 p-6">
      <div className="max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-lg font-bold text-red-700">{title}</h1>
        <p className="text-sm text-gray-700 mt-2 break-words">{detail}</p>
        <button onClick={() => location.reload()} className="mt-4 px-4 py-2 rounded-lg bg-green-800 text-white text-sm">Reload</button>
      </div>
    </div>
  );
}

class Boundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { return this.state.err ? <Problem title="Something went wrong" detail={this.state.err.message} /> : this.props.children; }
}

export default function App() {
  if (CONFIG_ERROR) return <Problem title="App is not configured" detail={CONFIG_ERROR} />;
  return <Boundary><StoreProvider><Shell /></StoreProvider></Boundary>;
}
