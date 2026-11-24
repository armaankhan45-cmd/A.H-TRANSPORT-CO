import { useState } from "react";
import logoDark from "../assets/app-logo-dark.png";
import { useStore, CLOUD } from "../store";
import { COMPANY } from "../company";
import { Button, Input, Field } from "../ui";
import { Lock, Mail, Truck } from "lucide-react";
import Contours from "../components/Contours";

const DEMO = [
  { role: "Super Admin", email: "admin@ahtransportco.com", pass: "admin123" },
  { role: "Office Staff", email: "office@ahtransportco.com", pass: "office123" },
  { role: "Accounts", email: "accounts@ahtransportco.com", pass: "accounts123" },
  { role: "Driver", email: "driver@ahtransportco.com", pass: "driver123" },
];

export default function Login() {
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setErr(null);
    login(email, password).then((r) => setErr(r)).catch(() => setErr("Could not sign in. Check your connection.")).finally(() => setBusy(false));
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-gray-100">
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-10 relative overflow-hidden">
        <Contours className="absolute inset-0 w-full h-full" />
        <div className="relative">
          <div className="flex items-center gap-3 rise">
            <div className="h-14 px-3 rounded-xl bg-signal flex items-center justify-center shrink-0"><img src={logoDark} alt="A.H. Transport Co." className="h-8 w-auto" /></div>
            <div>
              <p className="font-bold text-lg leading-tight">{COMPANY.name}</p>
              <p className="text-slate-300 text-xs">{COMPANY.tagline}</p>
            </div>
          </div>
          <h2 className="font-display text-4xl font-bold mt-16 leading-tight max-w-md">Every trip, every paper, in one place.</h2>
          <p className="text-slate-300 mt-4 text-base max-w-md">Write LR and TCC, check vehicle papers, see where each truck is. Built for the A.H. team.</p>
        </div>
        <div className="road -mx-10 relative" aria-hidden="true"><div className="truck"><Truck className="w-14 h-14" strokeWidth={1.5} /></div></div>
        <div className="relative text-xs text-slate-400 space-y-0.5">
          <p>{COMPANY.address}</p>
          <p>GSTIN {COMPANY.gstin} · PAN {COMPANY.pan}</p>
          <p>{COMPANY.phones.join(" · ")}</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="h-11 px-2.5 rounded-xl bg-signal flex items-center justify-center shrink-0"><img src={logoDark} alt="A.H. Transport Co." className="h-7 w-auto" /></div>
            <div>
              <p className="font-bold text-sm text-gray-900">{COMPANY.name}</p>
              <p className="text-[11px] text-gray-500">Transport Management System</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
            <h1 className="font-display text-2xl font-bold text-slate-900">Sign in</h1>
            <p className="text-xs text-gray-500 mb-5">Use your office or driver account.</p>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Email" required>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <Input className="pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@ahtransportco.com" autoComplete="username" spellCheck={false} required />
                </div>
              </Field>
              <Field label="Password" required>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <Input className="pl-9" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" required />
                </div>
              </Field>
              {err && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
            </form>
            {!CLOUD && <div className="mt-5 border-t border-dashed pt-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Demo accounts. Tap one to fill the form.</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO.map((d) => (
                  <button key={d.email} onClick={() => { setEmail(d.email); setPassword(d.pass); }}
                    className="text-left rounded-lg border border-gray-200 px-2.5 py-2 hover:border-green-600 hover:bg-green-50">
                    <span className="block text-[11px] font-semibold text-gray-800">{d.role}</span>
                    <span className="block text-[10px] text-gray-500 truncate">{d.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Demo data only. Do not enter real Aadhaar/PAN/salary data until Supabase RLS & private storage are configured and tested.</p>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
