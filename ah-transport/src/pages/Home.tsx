import { useStore } from "../store";
import { Plate } from "../ui";
import { daysLeft, fmtDate } from "../company";
import { askNew } from "../launch";
import InstallApp from "../components/InstallApp";
import { FilePlus2, Droplets, Truck, Users, MapPin, FileText, ChevronRight, CircleCheck } from "lucide-react";

export default function Home({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { db, firm } = useStore();
  const nd = db.settings.notifyDays || 30;
  const live = db.locations.filter((l) => l.consent && Date.now() - new Date(l.updated).getTime() < 5 * 60000).length;

  const due = [
    ...db.vehicleDocs.map((d) => ({ left: daysLeft(d.expiryDate), what: `${db.vehicles.find((v) => v.id === d.vehicleId)?.regNo || "Vehicle"} · ${d.name}`, date: d.expiryDate })),
    ...db.drivers.map((d) => ({ left: daysLeft(d.licenceExpiry), what: `${d.name} · Driving licence`, date: d.licenceExpiry })),
  ].filter((x) => x.left <= nd).sort((a, b) => a.left - b.left);

  const lastBackup = (() => { try { return Number(localStorage.getItem("ah_last_backup")) || 0; } catch { return 0; } })();
  const snooze = (() => { try { return Number(localStorage.getItem("ah_bk_snooze")) || 0; } catch { return 0; } })();
  const backupDue = Date.now() - lastBackup > 7 * 86400000 && Date.now() > snooze;
  const go = (page: string, isNew = false) => () => { if (isNew) askNew(); onNavigate(page); };
  const links = [
    { page: "vehicles", label: "Vehicles", n: `${db.vehicles.length}`, icon: Truck },
    { page: "drivers", label: "Drivers", n: `${db.drivers.length}`, icon: Users },
    { page: "tracking", label: "Live location", n: live ? `${live} sharing` : "None sharing", icon: MapPin },
    { page: "expiry", label: "Papers and expiry", n: due.length ? `${due.length} need action` : "All valid", icon: FileText },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">{firm.display}</h1>
      <p className="text-slate-500 mt-1 mb-6">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}. What do you want to do?</p>

      <InstallApp />
      {backupDue && (
        <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 mb-4 font-medium items-center">
          <button onClick={go("admin")} className="flex-1 text-left">Backup due. Tap to download a copy of all your records.</button>
          <button aria-label="Hide for 3 days" onClick={() => { try { localStorage.setItem("ah_bk_snooze", String(Date.now() + 3 * 86400000)); } catch { /* ignore */ } location.reload(); }} className="px-2 text-xl">×</button>
        </div>
      )}

      {(() => {
        const trip = db.vehicles.filter((v) => v.status === "On Trip");
        const dn = (id: string) => db.drivers.find((d) => d.vehicleId === id)?.name || "No driver set";
        return (
          <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">{trip.length > 0 && <span className="live-dot" aria-hidden="true" />}On the road now <span className="text-slate-400 font-medium tabular-nums">{trip.length}</span></h2>
            {trip.length === 0 ? <p className="text-slate-500 mt-2">No truck is on a trip right now.</p> : (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
                {trip.map((v) => <div key={v.id} className="flex items-center gap-3"><Plate no={v.regNo} /><span className="text-sm text-slate-600">{dn(v.id)}</span></div>)}
              </div>)}
          </div>);
      })()}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 rise">
            <button onClick={go("lr", true)} className="group card-lift flex items-center gap-4 rounded-xl bg-signal text-slate-900 p-5 text-left hover:bg-signal-dark transition">
              <FilePlus2 className="w-10 h-10 shrink-0" strokeWidth={1.7} />
              <span><b className="block text-2xl font-display">New LR</b><span className="text-sm">Transport receipt</span></span>
            </button>
            <button onClick={go("tcc", true)} className="group flex items-center gap-4 rounded-xl bg-slate-900 text-white p-5 text-left hover:bg-slate-800 transition">
            <button onClick={go("tcc", true)} className="group card-lift flex items-center gap-4 rounded-xl bg-green-950 text-white p-5 text-left hover:bg-green-900 transition">
              <Droplets className="w-10 h-10 shrink-0 text-signal" strokeWidth={1.7} />
              <span><b className="block text-2xl font-display">New TCC</b><span className="text-sm text-slate-200">Tanker cleaning certificate</span></span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
            {links.map((l) => { const Icon = l.icon; return (
              <button key={l.page} onClick={go(l.page)} className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-slate-50">
                <Icon className="w-6 h-6 text-green-800 shrink-0" />
                <span className="flex-1 text-lg font-medium">{l.label}</span>
                <span className="text-sm text-slate-500 tabular-nums">{l.n}</span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>); })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="font-display text-xl font-bold mb-2">Needs attention</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
            {due.length === 0 && <p className="flex items-center gap-2 p-4 text-slate-600"><CircleCheck className="w-5 h-5 text-green-600" /> Nothing is due. All papers are valid.</p>}
            {due.slice(0, 7).map((x, i) => (
              <button key={i} onClick={go("expiry")} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${x.left < 0 ? "bg-red-600" : x.left <= 7 ? "bg-orange-500" : "bg-signal"}`} />
                <span className="flex-1 min-w-0"><span className="block font-medium truncate">{x.what}</span>
                  <span className="text-sm text-slate-600">{x.left < 0 ? `Expired ${Math.abs(x.left)} ${Math.abs(x.left) === 1 ? "day" : "days"} ago` : `Expires in ${x.left} ${x.left === 1 ? "day" : "days"}`} · {fmtDate(x.date)}</span></span>
              </button>))}
            {due.length > 7 && <button onClick={go("expiry")} className="w-full px-4 py-3 text-left text-sm font-semibold text-green-800 hover:bg-slate-50">See all {due.length}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
