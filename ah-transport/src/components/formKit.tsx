import "@fontsource/caveat/500.css";
import "@fontsource/caveat/700.css";
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

/** Forms are laid out in the pixel space of the original scans and scaled to fit, so screen, print and PDF all match. */
export const INK = "#0b2a8a";
/** Filled-in text can print as handwriting or as a computer font. The choice is remembered on this device. */
export type FontMode = "hand" | "print";
const FKEY = "ah_form_font";
const subs = new Set<() => void>();
let mode: FontMode = (() => { try { return localStorage.getItem(FKEY) === "print" ? "print" : "hand"; } catch { return "hand"; } })();
export const setFontMode = (m: FontMode) => { mode = m; try { localStorage.setItem(FKEY, m); } catch { /* ignore */ } subs.forEach((f) => f()); };
export const useFontMode = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => mode);
export function FontToggle() {
  const m = useFontMode();
  const b = (v: FontMode, label: string) => <button type="button" onClick={() => setFontMode(v)} className={`px-3 py-1.5 text-sm font-medium ${m === v ? "bg-green-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>{label}</button>;
  return <div className="inline-flex rounded-md border border-slate-300 overflow-hidden no-print" role="group" aria-label="Text style">{b("hand", "Handwriting")}{b("print", "Computer font")}</div>;
}
export const HAND = "'Caveat','Reenie Beanie',cursive";
export const SERIF = "'AH Bookman','Bookman Old Style',Georgia,'Times New Roman',serif";

export const at = (x: number, y: number, w?: number, h?: number, extra: CSSProperties = {}): CSSProperties => ({
  position: "absolute", left: x, top: y, boxSizing: "border-box",
  ...(w !== undefined ? { width: w } : {}), ...(h !== undefined ? { height: h } : {}), ...extra,
});

/** Printed (fixed) text. */
export function T({ x, y, w, size = 24, bold, italic, align, ls, lh, children, style }: { x: number; y: number; w?: number; size?: number; bold?: boolean; italic?: boolean; align?: "left" | "center" | "right" | "justify"; ls?: number; lh?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={at(x, y, w, undefined, { fontSize: size, fontWeight: bold ? 700 : 400, fontStyle: italic ? "italic" : "normal", textAlign: align, letterSpacing: ls, lineHeight: lh ? `${lh}px` : 1.15, whiteSpace: w ? "normal" : "nowrap", ...style })}>{children}</div>;
}
/** Filled-in value (ink colour). */
export function V({ x, y, w, size = 32, align, bold = true, children, style }: { x: number; y: number; w?: number; size?: number; align?: "left" | "center" | "right"; bold?: boolean; children: ReactNode; style?: CSSProperties }) {
  const m = useFontMode();
  const font: CSSProperties = m === "hand"
    ? { fontFamily: HAND, fontSize: size * 1.2, marginTop: -size * 0.1, fontWeight: bold ? 700 : 500 }
    : { fontFamily: "Arial, Helvetica, sans-serif", fontSize: size * 0.82, fontWeight: bold ? 700 : 500 };
  return <div style={at(x, y, w, undefined, { color: INK, ...font, textAlign: align, lineHeight: 1.15, whiteSpace: "nowrap", ...style })}>{children}</div>;
}
export const H = ({ x, y, w, t = 2 }: { x: number; y: number; w: number; t?: number }) => <div style={at(x, y, w, 0, { borderTop: `${t}px solid #000` })} />;
export const Vl = ({ x, y, h, t = 2 }: { x: number; y: number; h: number; t?: number }) => <div style={at(x, y, 0, h, { borderLeft: `${t}px solid #000` })} />;
export const Box = ({ x, y, w, h, t = 2, bg, style }: { x: number; y: number; w: number; h: number; t?: number; bg?: string; style?: CSSProperties }) => <div style={at(x, y, w, h, { border: `${t}px solid #000`, background: bg, ...style })} />;

export function ScaledCanvas({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const f = () => setS(Math.min(1, el.clientWidth / w));
    f();
    const ro = new ResizeObserver(f); ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={ref} style={{ width: "100%", maxWidth: w, height: h * s, position: "relative", margin: "0 auto", background: "#fff", boxShadow: "0 0 0 1px #ddd" }}>
      <div data-canvas="1" style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `scale(${s})`, transformOrigin: "0 0", background: "#fff", color: "#000", fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

export const fmtDMY = (d: string) => { if (!d) return ""; const x = new Date(d); if (isNaN(x.getTime())) return d; return `${x.getDate()}/${x.getMonth() + 1}/${x.getFullYear()}`; };
export const fmtDT = (d: string) => (d ? new Date(d).toLocaleString("en-IN") : "");
