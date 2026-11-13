import React, { useEffect, useState } from "react";
import { X, Search, ChevronDown, Inbox } from "lucide-react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>{children}</div>;
}
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function Button({ children, onClick, variant = "primary", className = "", type = "button", disabled, size = "md" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost" | "success"; className?: string; type?: "button" | "submit"; disabled?: boolean; size?: "sm" | "md";
}) {
  const v: Record<string, string> = {
    primary: "bg-green-800 text-white hover:bg-green-900",
    success: "bg-green-600 text-white hover:bg-green-700",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-gray-600 hover:bg-gray-100",
  };
  const s = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${s} ${className}`}>{children}</button>;
}
export function Field({ label, children, required, hint, className = "" }: { label: string; children: React.ReactNode; required?: boolean; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}
const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:ring-2 focus:ring-green-100";
export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...p} className={`${inputCls} ${p.className || ""}`} />; }
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...p} className={`${inputCls} ${p.className || ""}`} />; }
export function Select({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...p} className={`${inputCls} appearance-none pr-8 ${p.className || ""}`}>{children}</select>
      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
    </div>
  );
}
export function Badge({ children, cls = "bg-gray-100 text-gray-700" }: { children: React.ReactNode; cls?: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cls}`}>{children}</span>;
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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-2 sm:p-4 overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${wide ? "max-w-5xl" : "max-w-3xl"} my-4`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
export function Confirm({ open, onCancel, onConfirm, message }: { open: boolean; onCancel: () => void; onConfirm: () => void; message: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5">
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
            {headers.map((h) => <th key={h} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
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
      <input type="file" accept={accept} className="block w-full text-xs text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-green-800 file:px-3 file:py-1.5 file:text-white"
        onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          if (f.size > 1.5 * 1024 * 1024) { alert("File larger than 1.5 MB — demo storage keeps files in the browser. In production use Supabase private storage."); }
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
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
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
