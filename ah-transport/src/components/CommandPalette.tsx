import { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";

export type Cmd = { label: string; sub?: string; run: () => void };

/** Ctrl/Cmd+K or "/" opens it. Type to jump to any page, record or action; arrows + Enter. */
export default function CommandPalette({ open, onClose, commands, find }: { open: boolean; onClose: () => void; commands: Cmd[]; find: (q: string) => Cmd[] }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setI(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? commands.filter((c) => c.label.toLowerCase().includes(t)) : commands;
    return [...base, ...(t ? find(t) : [])].slice(0, 30);
  }, [q, commands, find]);
  if (!open) return null;
  const go = (c?: Cmd) => { if (!c) return; onClose(); c.run(); };
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-start justify-center p-3 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-[12vh]" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Quick search">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400" aria-hidden="true" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} aria-label="Search pages, records and actions"
            placeholder="Jump to a page, vehicle, driver, LR or action…" spellCheck={false} autoComplete="off"
            className="flex-1 py-4 text-base outline-none focus-visible:outline-none bg-transparent"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, list.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
              else if (e.key === "Enter") go(list[i]);
              else if (e.key === "Escape") onClose();
            }} />
          <kbd className="hidden sm:block text-xs text-slate-500 border border-slate-300 rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-1" role="listbox">
          {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No match. Try a vehicle number, driver name or LR number.</li>}
          {list.map((c, n) => (
            <li key={n} role="option" aria-selected={n === i}>
              <button onClick={() => go(c)} onMouseEnter={() => setI(n)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${n === i ? "bg-signal/20" : ""}`}>
                <span className="flex-1 min-w-0"><span className="block font-medium truncate">{c.label}</span>{c.sub && <span className="block text-xs text-slate-500 truncate">{c.sub}</span>}</span>
                {n === i && <CornerDownLeft className="w-4 h-4 text-slate-500" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
