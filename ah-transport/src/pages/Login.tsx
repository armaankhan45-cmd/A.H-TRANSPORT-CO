import { useState } from "react";
import { useStore } from "../store";
import { COMPANY } from "../company";
import { Button, Input, Field } from "../ui";
import { Lock, Mail, Truck, ShieldCheck, Smartphone } from "lucide-react";

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
    setTimeout(() => { const r = login(email, password); setErr(r); setBusy(false); }, 250);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-100">
      <div className="hidden lg:flex flex-col justify-between bg-green-950 text-white p-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center font-black text-xl">AH</div>
            <div>
              <p className="font-bold text-lg leading-tight">{COMPANY.name}</p>
              <p className="text-green-300 text-xs">{COMPANY.tagline}</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold mt-12 leading-snug">Complete Transport<br />Management System</h2>
          <p className="text-green-200 mt-3 text-sm max-w-md">Vehicles, drivers, papers & expiry, maintenance, LR, TCC, trips, salary, expenses, reports and driver app — one secure application.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
            {[["Fleet & Documents", Truck], ["Maintenance", ShieldCheck], ["LR / TCC PDF", Mail], ["Driver App / PWA", Smartphone]].map(([t, I]) => {
              const Icon = I as typeof Truck;
              return <div key={t as string} className="flex items-center gap-2 bg-green-900/60 rounded-lg px-3 py-2 text-xs"><Icon className="w-4 h-4 text-green-400" />{t as string}</div>;
            })}
          </div>
        </div>
        <div className="text-[11px] text-green-400 space-y-0.5">
          <p>{COMPANY.address}</p>
          <p>GSTIN {COMPANY.gstin} · PAN {COMPANY.pan}</p>
          <p>{COMPANY.phones.join(" · ")}</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-800 flex items-center justify-center font-black text-white">AH</div>
            <div>
              <p className="font-bold text-sm text-gray-900">{COMPANY.name}</p>
              <p className="text-[11px] text-gray-500">Transport Management System</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <h1 className="text-xl font-bold text-gray-900">Sign in</h1>
            <p className="text-xs text-gray-500 mb-5">Use your office or driver account.</p>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Email" required>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <Input className="pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ahtransportco.com" required />
                </div>
              </Field>
              <Field label="Password" required>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <Input className="pl-9" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
              </Field>
              {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
            </form>
            <div className="mt-5 border-t border-dashed pt-4">
              <p className="text-[11px] font-semibold text-gray-500 mb-2">DEMO ACCOUNTS — click to fill</p>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
