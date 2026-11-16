import { useEffect, useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Button, Stat, Table, Textarea, Badge } from "../ui";
import { MapPin, ShieldCheck, Navigation, Info, RefreshCw, Users } from "lucide-react";
import TrackActions from "../components/TrackActions";
import { ago } from "../tracking";

/** Live driver locations. Drivers share only after opening their private link and tapping Allow — there is no admin "grant". */
export default function Tracking() {
  const { db, set, toast, reload } = useStore();
  const [sel, setSel] = useState<string | null>(null);
  const [policy, setPolicy] = useState(db.settings.trackingPolicy);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setInterval(() => { void reload(); }, 15000); return () => clearInterval(t); }, [reload]);

  const drivers = db.drivers.filter((d) => d.status === "Active");
  const locOf = (id: string) => db.locations.find((l) => l.driverId === id && l.consent);
  const live = drivers.filter((d) => { const l = locOf(d.id); return l && ago(l.updated).live; }).length;
  const sharing = drivers.filter((d) => locOf(d.id)).length;
  const first = drivers.find((d) => locOf(d.id));
  const selDriver = db.drivers.find((d) => d.id === (sel || first?.id));
  const selLoc = selDriver ? locOf(selDriver.id) : undefined;
  const veh = (id: string) => db.vehicles.find((v) => v.id === id)?.regNo || "—";

  return (
    <div>
      <PageHeader title="Driver Location Tracking" subtitle="Drivers share only after they open their link and tap Allow — no login needed"
        actions={<Button variant="secondary" onClick={async () => { setBusy(true); await reload(); setBusy(false); toast("Refreshed"); }}><RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} /> Refresh</Button>} />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Sharing live" value={live} sub="Updated in last 5 min" icon={<Navigation className="w-5 h-5" />} tone="green" />
        <Stat label="Have shared" value={sharing} sub="Location on file" icon={<MapPin className="w-5 h-5" />} tone="blue" />
        <Stat label="Active drivers" value={drivers.length} icon={<Users className="w-5 h-5" />} tone="gray" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-3">
            {selLoc && selDriver ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold">{selDriver.name} · {veh(selDriver.vehicleId)} <span className="text-xs font-normal text-gray-500">— {ago(selLoc.updated).text}</span></p>
                  <Button size="sm" variant="secondary" onClick={() => window.open(`https://www.google.com/maps?q=${selLoc.lat},${selLoc.lng}`, "_blank")}>Open in Google Maps</Button>
                </div>
                <iframe title="map" className="w-full h-72 rounded-lg border border-gray-200" loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${selLoc.lng - 0.02},${selLoc.lat - 0.012},${selLoc.lng + 0.02},${selLoc.lat + 0.012}&layer=mapnik&marker=${selLoc.lat},${selLoc.lng}`} />
              </>
            ) : <p className="text-sm text-gray-500 py-10 text-center">No driver has shared a location yet. Use <b>Send link</b> below — the driver opens it and taps Allow.</p>}
          </Card>

          <Card className="p-0 overflow-hidden">
            <Table headers={["Driver", "Vehicle", "Location", "Last update", "Actions"]} empty={drivers.length === 0}>
              {drivers.map((d) => {
                const l = locOf(d.id);
                return (
                  <tr key={d.id} onClick={() => l && setSel(d.id)} className={`${l ? "cursor-pointer" : ""} ${selDriver?.id === d.id ? "bg-green-50" : "hover:bg-gray-50"}`}>
                    <td className="px-3 py-2 text-xs font-semibold">{d.name}<span className="block text-[10px] font-normal text-gray-500">{d.mobile}</span></td>
                    <td className="px-3 py-2 text-xs">{veh(d.vehicleId)}</td>
                    <td className="px-3 py-2 text-xs font-mono">{l ? `${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}` : "—"}</td>
                    <td className="px-3 py-2 text-xs">{l ? <Badge cls={ago(l.updated).live ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{ago(l.updated).text}</Badge> : "—"}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><TrackActions driver={d} compact /></td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-700" /> Company tracking policy</h3>
            <Textarea rows={4} value={policy} onChange={(e) => setPolicy(e.target.value)} />
            <Button className="mt-2 w-full" size="sm" onClick={() => { set((d) => { d.settings.trackingPolicy = policy; }); toast("Tracking policy saved"); }}>Save policy</Button>
          </Card>
          <Card className="p-4 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-900 flex items-center gap-1"><Info className="w-4 h-4" /> How it works</p>
            <p>1. Tap <b>Send link</b> — WhatsApp opens with a private link for that driver.</p>
            <p>2. The driver opens it, reads what is shared and taps <b>Allow</b>. No login or password.</p>
            <p>3. Their phone sends its position about every 15 seconds while the page is open.</p>
            <p>4. <b>Stop</b> disables the link and deletes their saved points. The driver can also stop from their phone.</p>
            <p className="pt-1 border-t border-gray-100"><b>Limit:</b> a web page can only share while it stays open on the phone (screen on). Switching apps or locking the phone can pause it. Tracking that keeps running in the background needs a small Android app.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
