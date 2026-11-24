import React, { useEffect, useRef, useState } from "react";
import { X, Search, ChevronDown, Inbox } from "lucide-react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

export function Plate({ no, large }: { no: string; large?: boolean }) {
  const t = (no || "").toUpperCase().replace(/\s+/g, "");
  const m = t.match(/^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{4})$/);
  return <span className={`plate ${large ? "plate-lg" : ""}`} translate="no"><span>{m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : t || "—"}</span></span>;
}
function useCountUp(n: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setV(n); return; }
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 700); setV(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [n]);
  return v;
}
export function CountUp({ value }: { value: string | number }) { const n = typeof value === "number" ? value : NaN; const v = useCountUp(isNaN(n) ? 0 : n); return <>{isNaN(n) ? value : v}</>; }
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>{children}</div>;
}
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-2xl sm:text-[28px] font-bold text-slate-900 leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function Button({ children, onClick, variant = "primary", className = "", type = "button", disabled, size = "md" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost" | "success"; className?: string; type?: "button" | "submit"; disabled?: boolean; size?: "sm" | "md";
}) {
  const v: Record<string, string> = {
    primary: "key bg-signal text-[#0b1017] font-semibold hover:bg-signal-dark",
    success: "bg-ink text-white hover:bg-ink-hover",
    secondary: "key bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-gray-600 hover:bg-gray-100",
  };
  const s = size === "sm" ? "px-2.5 py-1.5 text-xs min-h-8" : "px-4 py-2 text-sm min-h-10";
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${s} ${className}`}>{children}</button>;
}
const InField = React.createContext(false);
export function Field({ label, children, required, hint, className = "" }: { label: string; children: React.ReactNode; required?: boolean; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[13px] font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-600"> *</span>}</span>
      <InField.Provider value={true}>{children}</InField.Provider>
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-10 placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-signal/60 disabled:bg-slate-100 disabled:text-slate-500";
export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  const el = <input {...p} className={`${inputCls} ${p.className || ""}`} />;
  if (p.type !== "date") return el;
  const d = p.value ? new Date(String(p.value)) : null;   // phones show dates in the US order: spell it out so nobody mixes up day and month
  return <div>{el}{d && !isNaN(d.getTime()) && <p className="text-xs font-semibold text-gray-600 mt-1">{d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}</div>;
}
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { const named = React.useContext(InField); return <textarea aria-label={named ? undefined : p["aria-label"] ?? p.placeholder ?? "Notes"} {...p} className={`${inputCls} ${p.className || ""}`} />; }
export function Select({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const named = React.useContext(InField);
  return (
    <div className="relative">
      <select aria-label={named ? undefined : p["aria-label"] ?? p.title ?? "Filter"} {...p} className={`${inputCls} appearance-none pr-8 ${p.className || ""}`}>{children}</select>
      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
    </div>
  );
}
export function Badge({ children, cls = "bg-gray-100 text-gray-700" }: { children: React.ReactNode; cls?: string }) {
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:opacity-70 ${cls}`}>{children}</span>;
}
export function statusBadge(status: string) {
  const map: Record<string, string> = {
    Available: "bg-green-100 text-green-800", "On Trip": "bg-blue-100 text-blue-800", "Under Maintenance": "bg-orange-100 text-orange-800",
    "Temporarily Unavailable": "bg-amber-100 text-amber-800", Inactive: "bg-gray-200 text-gray-700",
    Active: "bg-green-100 text-green-800", Completed: "bg-green-100 text-green-800", Paid: "bg-green-100 text-green-800",
    Pending: "bg-amber-100 text-amber-800", "In Progress": "bg-orange-100 text-orange-800", Scheduled: "bg-blue-100 text-blue-800",
    Cancelled: "bg-red-100 text-red-800", Draft: "bg-gray-200 text-gray-700", Final: "bg-green-100 text-green-800",
    Planned: "bg-gray-100 text-gray-700", "Vehicle Assigned": "bg-blue-100 text-blue-800", Loading: "bg-amber-100 text-amber-800",
    "In Transit": "bg-blue-100 text-blue-800", Reported: "bg-indigo-100 text-indigo-800", "Waiting for Unloading": "bg-orange-100 text-orange-800",
    Unloaded: "bg-teal-100 text-teal-800", Resigned: "bg-red-100 text-red-800", Overdue: "bg-red-100 text-red-800",
  };
  return <Badge cls={map[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>;
}
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 p-0 sm:p-4 mwrap overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)]" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`bg-white sm:rounded-2xl shadow-2xl w-full ${wide ? "max-w-5xl" : "max-w-3xl"} sm:my-4 min-h-dvh sm:min-h-0`}>
        <div className="flex items-center justify-between px-4 py-3 mhead border-b border-slate-200 sticky top-0 bg-white sm:rounded-t-2xl z-10">
          <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 sm:max-h-[80dvh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
export function Confirm({ open, onCancel, onConfirm, message }: { open: boolean; onCancel: () => void; onConfirm: () => void; message: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5">
        <h3 className="font-semibold mb-2">Please confirm</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}
export function SearchBox({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} pl-9`} />
    </div>
  );
}
export function Table({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  const [bodyRef] = useAutoAnimate<HTMLTableSectionElement>({ duration: 200 });   // rows slide when added, removed or sorted
  const ref = useRef<HTMLTableElement>(null);
  // Phones show every row as a card: tag each cell with its column title so the card can print it as a label.
  useEffect(() => {
    ref.current?.querySelectorAll("tbody tr").forEach((tr) => {
      Array.from(tr.children).forEach((td, i) => { const l = headers[i] || ""; if (td.getAttribute("data-label") !== l) td.setAttribute("data-label", l); });
    });
  });
  return (
    <div className="overflow-x-auto">
      <table ref={ref} className="rtable w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-[13px] text-slate-500 border-b border-slate-200">
            {headers.map((h) => <th key={h} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody ref={bodyRef} className="divide-y divide-slate-100 [&_tr]:transition-colors [&_tr:hover]:bg-amber-50/40">{children}</tbody>
      </table>
      {empty && <Empty />}
    </div>
  );
}
export function Empty({ text = "No records found" }: { text?: string }) {
  return <div className="py-10 text-center text-gray-400 text-sm"><Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />{text}</div>;
}
export function FileField({ label, value, onChange, accept = "image/*,application/pdf" }: { label: string; value: string; onChange: (name: string, data: string) => void; accept?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Field label={label} hint="">
      <input type="file" accept={accept} className="block w-full text-xs text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-white"
        onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          if (f.size > 1.5 * 1024 * 1024) { alert("This file is larger than 1.5 MB. Choose a smaller file or take a lower-resolution photo."); }
          setBusy(true);
          const r = new FileReader();
          r.onload = () => { onChange(f.name, String(r.result || "")); setBusy(false); };
          r.readAsDataURL(f);
        }} />
      {value && <span className="block text-[11px] text-green-700 mt-1 truncate">✓ {value.slice(0, 40)} {busy && "…"}</span>}
    </Field>
  );
}
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-4">
      {tabs.map((t) => (
        <button key={t} onClick={() => onChange(t)} className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${active === t ? "border-green-700 text-green-800" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{t}</button>
      ))}
    </div>
  );
}
export function Stat({ label, value, icon, tone = "green", sub }: { label: string; value: string | number; icon?: React.ReactNode; tone?: string; sub?: string }) {
  const tones: Record<string, string> = { green: "bg-green-50 text-green-700", blue: "bg-blue-50 text-blue-700", orange: "bg-orange-50 text-orange-700", red: "bg-red-50 text-red-700", gray: "bg-gray-100 text-gray-700", indigo: "bg-indigo-50 text-indigo-700" };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-slate-500 leading-tight">{label}</p>
          <p className="font-display text-3xl font-bold text-slate-900 mt-1 tabular-nums"><CountUp value={value} /></p>
          {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {icon && <div className={`p-2 rounded-lg ${tones[tone]} shrink-0`}>{icon}</div>}
      </div>
    </Card>
  );
}
export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0"><span className="text-xs text-gray-500">{k}</span><span className="text-xs font-medium text-gray-900 text-right">{v}</span></div>;
}
