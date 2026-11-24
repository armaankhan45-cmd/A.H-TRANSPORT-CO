import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, ShieldCheck, Square } from "lucide-react";
import { COMPANY } from "./company";
import { DATA_MODE, supabase } from "./lib/supabase";
import { isNative, watchInBackground, stopBackground } from "./native";
import { shrinkPhoto, submitReport, type ReportKind } from "./reports";

/** Page a driver opens from the private link. No login. Nothing is sent until the driver taps Allow. */
type Info = { name: string; vehicle: string | null };
const DEMO_KEY = "ah_tms_db_v1";
const SEND_EVERY_MS = 10000;      // heartbeat while parked
const MOVE_METRES = 25;           // send straight away after moving this far
const GOOD_ACCURACY_M = 80;       // ignore fixes worse than this unless nothing better arrives
const dist = (a: GeolocationCoordinates, b: GeolocationCoordinates) => { const R = 6371000, r = Math.PI / 180, dLat = (b.latitude - a.latitude) * r, dLng = (b.longitude - a.longitude) * r; const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

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

function SendCard({ token }: { token: string }) {
  const [kind, setKind] = useState<ReportKind>("Trip photo");
  const [photo, setPhoto] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const kinds: ReportKind[] = ["Trip photo", "Toll receipt", "Breakdown"];
  const pick = async (f?: File | null) => { if (!f) return; try { setPhoto(await shrinkPhoto(f)); setMsg(null); } catch { setMsg({ ok: false, text: "Could not read that photo. Try again." }); } };
  const sendIt = async () => {
    if (!photo && !note.trim()) { setMsg({ ok: false, text: "Add a photo or write a short note." }); return; }
    setBusy(true);
    const ok = await submitReport(token, kind, note.trim(), photo);
    setBusy(false);
    if (ok) { setPhoto(""); setNote(""); setMsg({ ok: true, text: "Sent to the office. Thank you!" }); }
    else setMsg({ ok: false, text: "Not sent. Check your internet and try again." });
  };
  return (
    <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-green-100 p-6 mt-4">
      <p className="text-xl font-bold text-center">Send to the office</p>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {kinds.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-xl py-3 text-sm font-bold leading-tight ${kind === k ? "bg-green-700 text-white" : "bg-slate-100 text-slate-700"}`}>{k}</button>
        ))}
      </div>
      <label className="block mt-4 rounded-2xl border-2 border-dashed border-slate-300 text-center py-5 font-bold text-slate-700 active:scale-[0.98]">
        {photo ? <img src={photo} alt="" className="mx-auto max-h-48 rounded-lg" /> : "Take or choose a photo"}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} placeholder="Note (optional)" className="w-full mt-3 rounded-xl border border-slate-300 p-3 text-base" />
      {msg && <p className={`mt-3 text-center font-bold ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
      <button disabled={busy} onClick={sendIt} className="w-full rounded-2xl bg-green-700 text-white font-extrabold py-4 text-xl mt-3 disabled:opacity-60">{busy ? "Sending…" : "Send"}</button>
    </div>
  );
}

export default function TrackShare({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null | undefined>(undefined);
  const [phase, setPhase] = useState<"ask" | "declined" | "sharing" | "stopped" | "denied" | "nogps">("ask");
  const [lastSent, setLastSent] = useState<string>("");
  const [problem, setProblem] = useState("");
  const watch = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const latest = useRef<GeolocationPosition | null>(null);
  const lastSentPos = useRef<GeolocationPosition | null>(null);
  const lastGood = useRef(0);
  const bgId = useRef<string | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const flag = `ah_track_ok_${token}`;

  const push = useCallback(async () => {
    const p = latest.current; if (!p) return;
    const ok = await send(token, p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.speed);
    if (ok) { lastSentPos.current = p; setLastSent(new Date().toLocaleTimeString("en-IN")); setProblem(""); }
    else setProblem("Could not reach the office. Check your internet — will keep trying.");
  }, [token]);

  const start = useCallback(() => {
    if (isNative()) {   // Android app: keeps working with the screen off
      void watchInBackground((f) => {
        const p = { coords: { latitude: f.latitude, longitude: f.longitude, accuracy: f.accuracy, speed: f.speed } } as unknown as GeolocationPosition;
        latest.current = p; void push();
      }, () => setPhase("denied")).then((id) => { bgId.current = id; });
      try { localStorage.setItem(flag, "1"); } catch { /* ignore */ }
      setPhase("sharing");
      return;
    }
    if (!navigator.geolocation) { setPhase("nogps"); return; }
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        const good = p.coords.accuracy <= GOOD_ACCURACY_M;
        if (good) lastGood.current = Date.now();
        // keep only accurate fixes; accept a poor one only if no good fix for 60 s (e.g. inside a building)
        if (!good && latest.current && Date.now() - lastGood.current < 60000) return;
        const first = !latest.current; latest.current = p;
        if (first || (lastSentPos.current && dist(lastSentPos.current.coords, p.coords) >= MOVE_METRES)) void push();
      },
      (e) => { if (e.code === e.PERMISSION_DENIED) { setPhase("denied"); try { localStorage.removeItem(flag); } catch { /* ignore */ } } else setProblem("Waiting for GPS signal…"); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 });
    timer.current = window.setInterval(() => void push(), SEND_EVERY_MS);
    try { localStorage.setItem(flag, "1"); } catch { /* ignore */ }
    setPhase("sharing");
    try { void (navigator as any).wakeLock?.request("screen").then((w: any) => { wake.current = w; }).catch(() => undefined); } catch { /* ignore */ }
  }, [push, flag]);

  useEffect(() => {
    const f = () => { if (document.visibilityState === "visible" && watch.current != null) { void push(); try { void (navigator as any).wakeLock?.request("screen").then((w: any) => { wake.current = w; }).catch(() => undefined); } catch { /* ignore */ } } };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [push]);

  const halt = useCallback(() => {
    if (bgId.current) { void stopBackground(bgId.current).catch(() => undefined); bgId.current = null; }
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
    <div className="min-h-dvh bg-green-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-green-100 p-6 text-center">
        <p className="text-xs font-bold tracking-wide text-green-800 uppercase">{COMPANY.display}</p>
        {info === undefined && <p className="py-10 text-lg text-gray-500">…</p>}
        {info === null && <div className="py-8"><p className="text-lg font-bold">This link is not active</p><p className="text-sm text-gray-500 mt-2">Ask the office to send you a new link.</p></div>}
        {info && (
          <>
            <div className={`mx-auto my-5 w-24 h-24 rounded-full grid place-items-center ${phase === "sharing" ? "bg-green-600" : "bg-green-100"}`}>
              <MapPin className={`w-12 h-12 ${phase === "sharing" ? "text-white" : "text-green-700"}`} />
            </div>
            <p className="text-xl font-bold">{info.name.split(" ")[0]}{info.vehicle ? ` · ${info.vehicle}` : ""}</p>

            {phase === "ask" && (<>
              <p className="text-xl font-bold mt-4 leading-snug">Share your truck location with {COMPANY.display}?</p>
              <p className="text-sm text-gray-600 mt-2">You are only asked once. The office decides when sharing ends.</p>
              <button onClick={start} className={`${big} bg-green-700 mt-6`}>Yes, share</button>
              <button onClick={() => setPhase("declined")} className="w-full rounded-2xl border-2 border-slate-300 text-slate-700 font-bold py-4 text-xl mt-3">No</button>
            </>)}

            {phase === "sharing" && (<>
              <p className="text-2xl font-extrabold text-green-700 mt-4">Location sharing is on</p>
              <p className="text-sm text-gray-600 mt-2">Thank you. The office can see your truck{lastSent ? ` · last sent ${lastSent}` : ""}.</p>
              {problem && <p className="text-sm text-amber-700 mt-2">Waiting for GPS signal…</p>}
              <button onClick={stopNow} className="mt-8 text-sm text-slate-500 underline">Stop sharing</button>
            </>)}

            {phase === "declined" && <><p className="mt-4 text-xl font-bold">Nothing is shared</p><p className="text-sm text-gray-600 mt-2">You chose No. You can close this page.</p><button onClick={() => setPhase("ask")} className="mt-6 text-sm text-slate-500 underline">Change my answer</button></>}
            {phase === "stopped" && <><p className="mt-4 text-xl font-bold">Location sharing stopped</p><button onClick={() => setPhase("ask")} className={`${big} bg-green-700 mt-6`}>Share again</button></>}
            {phase === "denied" && <><p className="mt-4 text-lg font-bold text-red-700">Location permission is blocked</p><p className="text-sm text-gray-600 mt-2">Allow location for this site in your phone settings, then open this page again.</p></>}
            {phase === "nogps" && <p className="mt-4 text-lg font-bold text-red-700">This phone cannot share location</p>}
          </>
        )}
      </div>
      {info && <SendCard token={token} />}
    </div>
  );
}
