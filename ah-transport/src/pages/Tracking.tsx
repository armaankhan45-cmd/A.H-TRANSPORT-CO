import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Button, Badge, Stat, Table, Select, Field, Textarea, Modal } from "../ui";
import { MapPin, ShieldCheck, ShieldOff, Navigation, Info, Clock } from "lucide-react";
import { fmtDate, uid } from "../company";

export default function Tracking() {
  const { db, set, toast } = useStore();
  const [sel, setSel] = useState<string | null>(null);
  const [policy, setPolicy] = useState(db.settings.trackingPolicy);

  const consented = db.locations.filter((l) => l.consent);
  const activeTrips = db.trips.filter((t) => !["Completed", "Cancelled"].includes(t.status));

  // Consent must be granted by the driver on their own device. Admin can only stop an active share.
  const stopSharing = (driverId: string) => {
    set((d) => {
      const loc = d.locations.find((x) => x.driverId === driverId);
      if (loc) loc.consent = false;
      const dr = d.drivers.find((x) => x.id === driverId);
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Location share stopped by office", detail: dr?.name || driverId });
    });
    toast("Location sharing stopped");
  };

  return (
    <div>
      <PageHeader title="GPS Location Tracking" subtitle="Consent-based, policy-bound driver location — never silent collection" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Tracked drivers" value={consented.length} sub="With active consent" icon={<Navigation className="w-5 h-5" />} tone="green" />
        <Stat label="Consent pending" value={db.drivers.filter((d) => !db.locations.find((l) => l.driverId === d.id && l.consent)).length} icon={<ShieldOff className="w-5 h-5" />} tone="amber" />
        <Stat label="Active trips" value={activeTrips.length} icon={<MapPin className="w-5 h-5" />} tone="blue" />
        <Stat label="Retention" value="30 days" sub="Configurable" icon={<Clock className="w-5 h-5" />} tone="gray" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-green-700" /> Locations actively shared by drivers</h3>
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-[radial-gradient(circle_at_30%_20%,#dcfce7,transparent_60%),radial-gradient(circle_at_70%_80%,#dbeafe,transparent_55%)] h-72">
            <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 400 300">
              {Array.from({ length: 10 }).map((_, i) => <line key={"h" + i} x1="0" y1={i * 30} x2="400" y2={i * 30} stroke="#cbd5e1" strokeWidth="0.5" />)}
              {Array.from({ length: 14 }).map((_, i) => <line key={"v" + i} x1={i * 30} y1="0" x2={i * 30} y2="300" stroke="#cbd5e1" strokeWidth="0.5" />)}
            </svg>
            {consented.map((l, i) => {
              const dr = db.drivers.find((d) => d.id === l.driverId);
              const x = 40 + ((l.lng - 72.7) * 600) % 320;
              const y = 40 + ((19.2 - l.lat) * 600) % 220;
              return (
                <button key={l.driverId} onClick={() => setSel(l.driverId)} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{ left: x, top: y }}>
                  <span className="block w-4 h-4 rounded-full bg-green-600 border-2 border-white shadow-lg group-hover:scale-125 transition" />
                  <span className="absolute left-5 top-0 whitespace-nowrap text-[10px] font-semibold bg-white/90 px-1.5 rounded shadow">{dr?.name.split(" ")[0]} · {db.vehicles.find((v) => v.id === dr?.vehicleId)?.regNo || "—"}</span>
                </button>
              );
            })}
            {consented.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">No driver has granted consent yet.</p>}
            <span className="absolute bottom-1 right-2 text-[9px] text-gray-500">Illustrative map only · live shared points need authenticated backend sync</span>
          </div>
          <Table headers={["Driver", "Vehicle", "Latitude", "Longitude", "Last updated", "Consent", "Action"]}>
            {db.locations.map((l) => {
              const dr = db.drivers.find((d) => d.id === l.driverId);
              return (
                <tr key={l.driverId}>
                  <td className="px-3 py-2 text-xs font-semibold">{dr?.name}</td>
                  <td className="px-3 py-2 text-xs">{db.vehicles.find((v) => v.id === dr?.vehicleId)?.regNo || "—"}</td>
                  <td className="px-3 py-2 text-xs font-mono">{l.lat.toFixed(4)}</td>
                  <td className="px-3 py-2 text-xs font-mono">{l.lng.toFixed(4)}</td>
                  <td className="px-3 py-2 text-xs">{new Date(l.updated).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2"><Badge cls={l.consent ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{l.consent ? "Granted" : "Revoked"}</Badge></td>
                  <td className="px-3 py-2">{l.consent ? <Button size="sm" variant="secondary" onClick={() => stopSharing(l.driverId)}>Stop share</Button> : <span className="text-[11px] text-gray-400">Driver must consent</span>}</td>
                </tr>
              );
            })}
          </Table>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-700" /> Company tracking policy</h3>
            <Textarea rows={4} value={policy} onChange={(e) => setPolicy(e.target.value)} />
            <Button className="mt-2 w-full" size="sm" onClick={() => { set((d) => { d.settings.trackingPolicy = policy; }); toast("Tracking policy saved"); }}>Save policy</Button>
          </Card>
          <Card className="p-4 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-900 flex items-center gap-1"><Info className="w-4 h-4" /> Honest limitations</p>
            <p>• Continuous background GPS is <b>not</b> guaranteed in a browser/PWA. For reliable tracking, ship the Android app with a <b>foreground location service</b> (persistent notification, <code>ACCESS_BACKGROUND_LOCATION</code> handled per Play Store policy).</p>
            <p>• The office cannot grant consent on a driver's behalf. A driver must explicitly share from their own device; this demo's location share is one-time, not continuous tracking.</p>
            <p>• This demo uses browser-local storage, not a shared live location service. Live office visibility requires Supabase persistence/RLS integration and authenticated driver consent.</p>
            <p>• Retention: a database purge function is supplied, but must be scheduled/configured in the live backend (default policy 30 days).</p>
          </Card>
        </div>
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title="Driver location details">
        {sel && (() => {
          const l = db.locations.find((x) => x.driverId === sel);
          const dr = db.drivers.find((d) => d.id === sel);
          return l ? (
            <div className="text-sm space-y-1">
              <p><b>Driver:</b> {dr?.name}</p>
              <p><b>Vehicle:</b> {db.vehicles.find((v) => v.id === dr?.vehicleId)?.regNo || "—"}</p>
              <p><b>Coordinates:</b> {l.lat.toFixed(5)}, {l.lng.toFixed(5)}</p>
              <p><b>Updated:</b> {new Date(l.updated).toLocaleString("en-IN")}</p>
              <p><b>Consent:</b> {l.consent ? "Granted" : "Revoked"}</p>
              <Button size="sm" className="mt-2" variant="secondary" onClick={() => window.open(`https://www.google.com/maps?q=${l.lat},${l.lng}`, "_blank")}>Open in Maps</Button>
            </div>
          ) : <p>No location data.</p>;
        })()}
      </Modal>
    </div>
  );
}
