import { useStore } from "../store";
import { daysLeft, fmtDate } from "../company";
import { askNew } from "../launch";
import { FilePlus2, Droplets, Truck, Users, MapPin, FileText, ChevronRight, CircleCheck } from "lucide-react";

export default function Home({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { db, firm } = useStore();
  const nd = db.settings.notifyDays || 30;
  const live = db.locations.filter((l) => l.consent && Date.now() - new Date(l.updated).getTime() < 5 * 60000).length;

  const due = [
    ...db.vehicleDocs.map((d) => ({ left: daysLeft(d.expiryDate), what: `${db.vehicles.find((v) => v.id === d.vehicleId)?.regNo || "Vehicle"} · ${d.name}`, date: d.expiryDate })),
    ...db.drivers.map((d) => ({ left: daysLeft(d.licenceExpiry), what: `${d.name} · Driving licence`, date: d.licenceExpiry })),
  ].filter((x) => x.left <= nd).sort((a, b) => a.left - b.left);

  const go = (page: string, isNew = false) => () => { if (isNew) askNew(); onNavigate(page); };
  const links = [
    { page: "vehicles", label: "Vehicles", n: `${db.vehicles.length}`, icon: Truck },
    { page: "drivers", label: "Drivers", n: `${db.drivers.length}`, icon: Users },
    { page: "tracking", label: "Live location", n: live ? `${live} sharing` : "None sharing", icon: MapPin },
    { page: "expiry", label: "Papers and expiry", n: due.length ? `${due.length} need action` : "All valid", icon: FileText },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold leading-tight">{firm.display}</h1>
      <p className="text-slate-600 mt-1 mb-6">What do you want to do?</p>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <button onClick={go("lr", true)} className="group flex items-center gap-4 rounded-lg bg-signal text-slate-900 p-5 text-left hover:bg-signal-dark transition">
              <FilePlus2 className="w-10 h-10 shrink-0" strokeWidth={1.7} />
              <span><b className="block text-2xl font-display">New LR</b><span className="text-sm">Transport receipt</span></span>
            </button>
            <button onClick={go("tcc", true)} className="group flex items-center gap-4 rounded-lg bg-green-900 text-white p-5 text-left hover:bg-green-800 transition">
              <Droplets className="w-10 h-10 shrink-0 text-signal" strokeWidth={1.7} />
              <span><b className="block text-2xl font-display">New TCC</b><span className="text-sm text-slate-200">Tanker cleaning certificate</span></span>
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-300/70 divide-y divide-slate-200">
            {links.map((l) => { const Icon = l.icon; return (
              <button key={l.page} onClick={go(l.page)} className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-slate-50">
                <Icon className="w-6 h-6 text-green-800 shrink-0" />
                <span className="flex-1 text-lg font-medium">{l.label}</span>
                <span className="text-sm text-slate-600">{l.n}</span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>); })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-2">Needs attention</h2>
          <div className="bg-white rounded-lg border border-slate-300/70 divide-y divide-slate-200">
            {due.length === 0 && <p className="flex items-center gap-2 p-4 text-slate-600"><CircleCheck className="w-5 h-5 text-green-600" /> Nothing is due. All papers are valid.</p>}
            {due.slice(0, 7).map((x, i) => (
              <button key={i} onClick={go("expiry")} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${x.left < 0 ? "bg-red-600" : x.left <= 7 ? "bg-orange-500" : "bg-signal"}`} />
                <span className="flex-1 min-w-0"><span className="block font-medium truncate">{x.what}</span>
                  <span className="text-sm text-slate-600">{x.left < 0 ? `Expired ${Math.abs(x.left)} days ago` : `Expires in ${x.left} days`} · {fmtDate(x.date)}</span></span>
              </button>))}
            {due.length > 7 && <button onClick={go("expiry")} className="w-full px-4 py-3 text-left text-sm font-semibold text-green-800 hover:bg-slate-50">See all {due.length}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
