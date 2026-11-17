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

  const big = "w-full rounded-2xl text-white font-extrabold py-5 text-2xl leading-tight active:scale-[0.98] transition";
  return (
    <div className="min-h-screen bg-green-50 grid place-items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-green-100 p-6 text-center">
        <p className="text-xs font-bold tracking-wide text-green-800 uppercase">{COMPANY.display}</p>
        {info === undefined && <p className="py-10 text-lg text-gray-500">…</p>}
        {info === null && <div className="py-8"><p className="text-lg font-bold">यह लिंक चालू नहीं है</p><p className="text-sm text-gray-500 mt-2">This link is not active. Ask the office for a new link.</p></div>}
        {info && (
          <>
            <div className={`mx-auto my-5 w-24 h-24 rounded-full grid place-items-center ${phase === "sharing" ? "bg-green-600" : "bg-green-100"}`}>
              <MapPin className={`w-12 h-12 ${phase === "sharing" ? "text-white" : "text-green-700"}`} />
            </div>
            <p className="text-xl font-bold">{info.name.split(" ")[0]}{info.vehicle ? ` · ${info.vehicle}` : ""}</p>

            {phase === "ask" && (<>
              <p className="text-lg font-semibold mt-4 leading-snug">आपकी गाड़ी की लोकेशन ऑफिस को दिखेगी</p>
              <p className="text-sm text-gray-500 mt-1">Office will see where your truck is</p>
              <button onClick={start} className={`${big} bg-green-700 mt-6`}>चालू करें<span className="block text-base font-semibold opacity-90">ALLOW</span></button>
              <p className="text-xs text-gray-500 mt-4 leading-relaxed">फ़ोन पूछे तो "Allow / अनुमति दें" दबाएं।<br />बंद करने के लिए कभी भी "बंद करें" दबाएं।</p>
            </>)}

            {phase === "sharing" && (<>
              <p className="text-2xl font-extrabold text-green-700 mt-4">✓ लोकेशन चालू है</p>
              <p className="text-sm text-gray-500 mt-1">Location is ON{lastSent ? ` · ${lastSent}` : ""}</p>
              {problem && <p className="text-sm text-amber-700 mt-2">GPS का इंतज़ार… / Waiting for GPS</p>}
              <p className="text-sm text-gray-600 mt-4 leading-relaxed">यह पेज खुला रखें<br /><span className="text-xs text-gray-500">Keep this page open</span></p>
              <button onClick={stopNow} className={`${big} bg-red-600 mt-6`}>बंद करें<span className="block text-base font-semibold opacity-90">STOP</span></button>
            </>)}

            {phase === "stopped" && <><p className="mt-4 text-xl font-bold">लोकेशन बंद हो गई</p><p className="text-sm text-gray-500">Stopped</p><button onClick={() => setPhase("ask")} className={`${big} bg-green-700 mt-6`}>फिर से चालू करें</button></>}
            {phase === "denied" && <><p className="mt-4 text-lg font-bold text-red-700">लोकेशन की अनुमति बंद है</p><p className="text-sm text-gray-600 mt-2">फ़ोन की Settings में इस साइट के लिए Location चालू करें, फिर यह पेज दोबारा खोलें।<br /><span className="text-xs text-gray-500">Allow location for this site in phone settings, then reopen.</span></p></>}
            {phase === "nogps" && <p className="mt-4 text-lg font-bold text-red-700">इस फ़ोन में लोकेशन नहीं चल सकती</p>}
          </>
        )}
      </div>
    </div>
  );
}
