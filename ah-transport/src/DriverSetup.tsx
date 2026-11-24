import { useState } from "react";
import { COMPANY } from "./company";

/** First screen in the Android app: the driver pastes the link the office sent on WhatsApp, once. */
export default function DriverSetup({ onToken }: { onToken: (t: string) => void }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const go = () => {
    const m = v.match(/track=([A-Za-z0-9_-]{16,})/) || v.trim().match(/^([A-Za-z0-9_-]{16,})$/);
    if (m) onToken(m[1]); else setErr("This is not the right link. Copy the whole link from WhatsApp.");
  };
  return (
    <div className="min-h-dvh bg-green-50 grid place-items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-green-100 p-6 text-center">
        <p className="text-xs font-bold tracking-wide text-green-800 uppercase">{COMPANY.display}</p>
        <p className="text-xl font-bold mt-4">Paste the link the office sent you</p>
        <textarea value={v} onChange={(e) => { setV(e.target.value); setErr(""); }} rows={3} className="w-full mt-4 rounded-xl border border-slate-300 p-3 text-base" placeholder="Paste link here" />
        {err && <p className="text-red-700 font-bold mt-2">{err}</p>}
        <button onClick={go} className="w-full rounded-2xl bg-green-700 text-white font-extrabold py-4 text-xl mt-4">Continue</button>
      </div>
    </div>
  );
}
