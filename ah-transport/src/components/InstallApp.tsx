import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** One-tap "Install app" on Android/desktop Chrome; step-by-step Add to Home Screen on iPhone. Hidden once installed. */
export default function InstallApp() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [hide, setHide] = useState(() => { try { return localStorage.getItem("ah_install_hide") === "1"; } catch { return false; } });
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const f = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    window.addEventListener("beforeinstallprompt", f);
    window.addEventListener("appinstalled", () => setEvt(null));
    return () => window.removeEventListener("beforeinstallprompt", f);
  }, []);
  if (standalone() || hide || (!evt && !isIOS())) return null;
  const dismiss = () => { setHide(true); try { localStorage.setItem("ah_install_hide", "1"); } catch { /* ignore */ } };
  const go = async () => { if (evt) { await evt.prompt(); await evt.userChoice; setEvt(null); } else setHelp(true); };
  return (
    <div className="mb-4 rounded-lg border border-slate-300/70 bg-white p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-md bg-green-950 grid place-items-center shrink-0"><Download className="w-5 h-5 text-signal" /></div>
      <div className="flex-1 min-w-0"><p className="font-semibold leading-tight">Install the app</p><p className="text-sm text-slate-600">Opens full screen from your home screen, like any other app.</p></div>
      <button onClick={go} className="rounded-md bg-signal px-4 py-2 font-semibold text-slate-900 hover:bg-signal-dark">Install</button>
      <button onClick={dismiss} aria-label="Hide" className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
      {help && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center" onClick={() => setHelp(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold mb-3">Add to iPhone home screen</p>
            <ol className="space-y-2 text-slate-700 list-decimal pl-5">
              <li>Open this page in <b>Safari</b>.</li>
              <li>Tap the Share button <Share className="inline w-4 h-4" /> at the bottom.</li>
              <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
            </ol>
            <button onClick={() => setHelp(false)} className="mt-4 w-full rounded-md bg-green-900 text-white py-2.5 font-semibold">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
