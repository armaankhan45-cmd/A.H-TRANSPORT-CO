import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, ShieldCheck, Square } from "lucide-react";
import { COMPANY } from "./company";
import { DATA_MODE, supabase } from "./lib/supabase";

/** Page a driver opens from the private link. No login. Nothing is sent until the driver taps Allow. */
type Info = { name: string; vehicle: string | null };
const DEMO_KEY = "ah_tms_db_v1";
const SEND_EVERY_MS = 15000;

async function getInfo(token: string): Promise<Info | null> {
  if (DATA_MODE === "supabase" && supabase) {
    const { data, error } = await supabase.rpc("tracking_info", { p_token: token });
    return error || !data ? null : (data as Info);
  }
  try {   // demo mode: the data lives in this browser only
    const db = JSON.parse(localStorage.getItem(DEMO_KEY) || "{}");
    const d = (db.drivers || []).find((x: any) => x.trackToken === token);
    return d ? { name: d.name, vehicle: (db.vehicles || []).find((v: any) => v.id === d.vehicleId)?.regNo || null } : null;
  } catch { return null; }
}
async function send(token: string, lat: number, lng: number, acc?: number, speed?: number | null): Promise<boolean> {
  if (DATA_MODE === "supabase" && supabase) {
    const { data, error } = await supabase.rpc("share_location", { p_token: token, p_lat: lat, p_lng: lng, p_acc: acc ?? null, p_speed: speed != null ? Math.round(speed * 3.6) : null });
    return !error && data === true;
  }
  try {
    const db = JSON.parse(localStorage.getItem(DEMO_KEY) || "{}");
    const d = (db.drivers || []).find((x: any) => x.trackToken === token); if (!d) return false;
    db.locations = (db.locations || []).filter((l: any) => l.driverId !== d.id);
    db.locations.push({ driverId: d.id, lat, lng, updated: new Date().toISOString(), consent: true });
    localStorage.setItem(DEMO_KEY, JSON.stringify(db)); return true;
  } catch { return false; }
}
async function stop(token: string) {
  if (DATA_MODE === "supabase" && supabase) { await supabase.rpc("stop_sharing", { p_token: token }); return; }
  try {
    const db = JSON.parse(localStorage.getItem(DEMO_KEY) || "{}");
    const d = (db.drivers || []).find((x: any) => x.trackToken === token);
    if (d) { db.locations = (db.locations || []).filter((l: any) => l.driverId !== d.id); localStorage.setItem(DEMO_KEY, JSON.stringify(db)); }
  } catch { /* ignore */ }
}

export default function TrackShare({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null | undefined>(undefined);
  const [phase, setPhase] = useState<"ask" | "sharing" | "stopped" | "denied" | "nogps">("ask");
  const [lastSent, setLastSent] = useState<string>("");
  const [problem, setProblem] = useState("");
  const watch = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const latest = useRef<GeolocationPosition | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const flag = `ah_track_ok_${token}`;

  const push = useCallback(async () => {
    const p = latest.current; if (!p) return;
    const ok = await send(token, p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.speed);
    if (ok) { setLastSent(new Date().toLocaleTimeString("en-IN")); setProblem(""); }
    else setProblem("Could not reach the office. Check your internet — will keep trying.");
  }, [token]);

  const start = useCallback(() => {
    if (!navigator.geolocation) { setPhase("nogps"); return; }
    watch.current = navigator.geolocation.watchPosition(
      (p) => { const first = !latest.current; latest.current = p; if (first) void push(); },
      (e) => { if (e.code === e.PERMISSION_DENIED) { setPhase("denied"); try { localStorage.removeItem(flag); } catch { /* ignore */ } } else setProblem("Waiting for GPS signal…"); },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
    timer.current = window.setInterval(() => void push(), SEND_EVERY_MS);
    try { localStorage.setItem(flag, "1"); } catch { /* ignore */ }
    setPhase("sharing");
    try { void (navigator as any).wakeLock?.request("screen").then((w: any) => { wake.current = w; }).catch(() => undefined); } catch { /* ignore */ }
  }, [push, flag]);

  const halt = useCallback(() => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    if (timer.current != null) clearInterval(timer.current);
    watch.current = null; timer.current = null; latest.current = null;
    void wake.current?.release().catch(() => undefined);
  }, []);

  useEffect(() => { void getInfo(token).then(setInfo); return halt; }, [token, halt]);
  // The driver already tapped Allow earlier on this phone: carry on (they can still stop at any time).
  useEffect(() => { if (info) { try { if (localStorage.getItem(flag) === "1") start(); } catch { /* ignore */ } } }, [info, flag, start]);

  const stopNow = async () => { halt(); try { localStorage.removeItem(flag); } catch { /* ignore */ } await stop(token); setPhase("stopped"); };

  return (
    <div className="min-h-screen bg-green-50 grid place-items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-green-100 p-5 text-center">
        <p className="text-xs font-bold tracking-wide text-green-800 uppercase">{COMPANY.display}</p>
        {info === undefined && <p className="py-10 text-sm text-gray-500">Loading…</p>}
        {info === null && <div className="py-8"><p className="font-semibold">This link is not active</p><p className="text-sm text-gray-500 mt-2">Ask the office to send you a new link.</p></div>}
        {info && (
          <>
            <div className="mx-auto my-4 w-14 h-14 rounded-full bg-green-100 grid place-items-center">{phase === "sharing" ? <MapPin className="w-7 h-7 text-green-700" /> : <ShieldCheck className="w-7 h-7 text-green-700" />}</div>
            <h1 className="text-lg font-bold">Hello {info.name.split(" ")[0]}</h1>
            {info.vehicle && <p className="text-sm text-gray-500">Vehicle {info.vehicle}</p>}

            {phase === "ask" && (<>
              <p className="text-sm text-gray-700 mt-3">The office would like to see where your truck is during trips.</p>
              <ul className="text-xs text-gray-600 text-left mt-3 space-y-1.5 bg-gray-50 rounded-lg p-3">
                <li>• Your location is shared <b>only after you tap Allow</b>.</li>
                <li>• Only your position is shared — nothing else on your phone.</li>
                <li>• Keep this page open while driving.</li>
                <li>• You can tap <b>Stop sharing</b> any time; your saved locations are deleted.</li>
              </ul>
              <button onClick={start} className="mt-4 w-full rounded-xl bg-green-700 text-white font-semibold py-3 text-base active:bg-green-800">Allow &amp; share my location</button>
            </>)}

            {phase === "sharing" && (<>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-700"><span className="w-2.5 h-2.5 rounded-full bg-green-600 animate-pulse" /> Sharing your location</p>
              <p className="text-xs text-gray-500 mt-1">{lastSent ? `Last sent at ${lastSent}` : "Getting your position…"}</p>
              {problem && <p className="text-xs text-amber-700 mt-2">{problem}</p>}
              <p className="text-xs text-gray-500 mt-3">Keep this page open. Switching to another app may pause sharing.</p>
              <button onClick={stopNow} className="mt-4 w-full rounded-xl border border-red-300 text-red-700 font-semibold py-3 flex items-center justify-center gap-2"><Square className="w-4 h-4" /> Stop sharing</button>
            </>)}

            {phase === "stopped" && <p className="mt-4 text-sm text-gray-700">Sharing stopped and your saved locations were deleted.<br /><button onClick={() => setPhase("ask")} className="mt-3 underline text-green-700 text-sm">Share again</button></p>}
            {phase === "denied" && <p className="mt-4 text-sm text-red-700">Location permission was blocked. Allow location for this site in your phone/browser settings, then reload this page.</p>}
            {phase === "nogps" && <p className="mt-4 text-sm text-red-700">This phone/browser cannot share location.</p>}
          </>
        )}
      </div>
    </div>
  );
}
