import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";
import { createElement, type ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { COMPANY, type Firm } from "./company";
import LRPreview, { LR_H, LR_W } from "./components/LRPreview";
import TCCPreview, { TCC_H, TCC_W } from "./components/TCCPreview";
import type { LR, TCC, Vehicle, Driver } from "./types";

function header(doc: jsPDF, title: string, firm: Firm = COMPANY) {
  // Green top band
  doc.setFillColor(20, 83, 45); doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text(firm.name, 105, 13, { align: "center" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(firm.tagline, 105, 19, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(firm.address, 105, 24, { align: "center" });
  doc.text(`Mob: ${firm.phones.join("  |  ")}   Email: ${firm.email}   Web: ${firm.website}`, 105, 29, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(220, 252, 231); doc.rect(0, 34, 210, 10, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(title, 105, 41, { align: "center" });
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text(`GSTIN: ${firm.gstin}    PAN: ${firm.pan}`, 105, 46, { align: "center" });
}
function footer(doc: jsPDF, firm: Firm = COMPANY) {
  doc.setFontSize(7); doc.setTextColor(100, 100, 100);
  doc.text(`${firm.name}  |  ${firm.address}  |  GSTIN: ${firm.gstin}  |  PAN: ${firm.pan}`, 105, 287, { align: "center" });
  doc.text("This is a computer generated document. E&OE.", 105, 292, { align: "center" });
  doc.setTextColor(0, 0, 0);
}
function row(doc: jsPDF, y: number, label: string, value: string, x2 = 105) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.text(label, 12, y);
  doc.setFont("helvetica", "normal"); doc.text(value || "—", x2, y);
  doc.setDrawColor(200, 200, 200); doc.line(12, y + 1.5, 198, y + 1.5);
  return y + 8;
}
function box(doc: jsPDF, y: number, h: number) { doc.setDrawColor(20, 83, 45); doc.setLineWidth(0.4); doc.rect(10, y, 190, h); }

/** Renders a form component off-screen at full size and returns it as a canvas (what you see is what is saved). */
async function capture(el: ReactElement, w: number): Promise<HTMLCanvasElement> {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;background:#fff`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(el));
    await document.fonts.load('800 40px "AH Bookman"').catch(() => undefined);
    await new Promise((r) => setTimeout(r, 120));
    const node = host.querySelector("[data-canvas]") as HTMLElement;
    await Promise.all([...host.querySelectorAll("img")].map((i) => i.decode().catch(() => undefined)));
    // The browser itself draws the text (exact positions), unlike html2canvas which shifts text.
    const opts = { pixelRatio: 2, backgroundColor: "#fff", cacheBust: false, width: w, style: { transform: "none" } };
    await toCanvas(node, opts).catch(() => undefined);   // first pass warms fonts/images (needed on iPhone Safari)
    return await toCanvas(node, opts);
  } finally { root.unmount(); host.remove(); }
}
async function formDoc(el: ReactElement, w: number, h: number) {
  const c = await capture(el, w);
  const pw = 200, ph = (pw * h) / w;   // page = exactly the form, no blank A4 space
  const doc = new jsPDF({ unit: "mm", format: [pw, ph], orientation: pw >= ph ? "landscape" : "portrait" });
  doc.addImage(c.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pw, ph);
  return doc;
}
async function formPdf(el: ReactElement, w: number, h: number, file: string) { (await formDoc(el, w, h)).save(file); }

/** The LR / TCC as a PDF file object, ready for the phone's share sheet (WhatsApp, email…). */
export async function lrPdfFile(lr: LR, vehicle: Vehicle | undefined, driver: Driver | undefined, firm: Firm) {
  const doc = await formDoc(createElement(LRPreview, { lr, vehicle, driver, firm }), LR_W, LR_H);
  return new File([doc.output("blob")], `LR_${lr.lrNo.replace(/[^\w-]/g, "_")}.pdf`, { type: "application/pdf" });
}
export async function tccPdfFile(tcc: TCC, vehicle: Vehicle | undefined, driver: Driver | undefined, firm: Firm) {
  const doc = await formDoc(createElement(TCCPreview, { tcc, vehicle, driver, firm }), TCC_W, TCC_H);
  return new File([doc.output("blob")], `TCC_${tcc.tccNo.replace(/[^\w-]/g, "_")}.pdf`, { type: "application/pdf" });
}
/** Opens the share sheet with the PDF. Where files cannot be shared (some desktops) the PDF is saved and WhatsApp opens. */
export async function sharePdf(file: File, text: string): Promise<"shared" | "saved" | "cancelled"> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: file.name, text }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  return "saved";
}

export function downloadLR(lr: LR, vehicle: Vehicle | undefined, driver: Driver | undefined, firm: Firm) {
  return formPdf(createElement(LRPreview, { lr, vehicle, driver, firm }), LR_W, LR_H, `${lr.lrNo.replace(/\//g, "_")}_LR.pdf`);
}
export function downloadTCC(tcc: TCC, vehicle: Vehicle | undefined, driver: Driver | undefined, firm: Firm) {
  return formPdf(createElement(TCCPreview, { tcc, vehicle, driver, firm }), TCC_W, TCC_H, `${tcc.tccNo.replace(/\//g, "_")}_TCC.pdf`);
}

/** Opens the print dialog with the form at 190 mm wide on A4 (works without any app stylesheet). */
export function printCanvas(root: HTMLElement | null, title: string, w: number, h: number): boolean {
  const node = root?.querySelector("[data-canvas]") as HTMLElement | null;
  if (!node) return false;
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return false;
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.querySelectorAll("img").forEach((i) => i.setAttribute("src", (i as HTMLImageElement).src));
  const k = ((190 / 25.4) * 96) / w;
  const hmm = (h * k * 25.4) / 96;
  win.document.write(`<html><head><title>${title}</title><style>@page{size:A4;margin:10mm}html,body{margin:0;background:#fff}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.box{position:relative;width:190mm;height:${hmm}mm;overflow:hidden}.inner{position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform:scale(${k});transform-origin:0 0}</style></head><body><div class="box"><div class="inner">${clone.outerHTML}</div></div></body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 500);
  return true;
}

export function downloadReport(title: string, headers: string[], rows: string[][], firm: Firm = COMPANY) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  header(doc, title.toUpperCase(), firm);
  let y = 56; const colW = 260 / headers.length;
  doc.setFillColor(20, 83, 45); doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => { doc.rect(10 + i * colW, y, colW, 7, "F"); doc.text(h, 11 + i * colW, y + 5); });
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); y += 7;
  rows.slice(0, 60).forEach((r) => {
    if (y > 275) { doc.addPage(); y = 15; }
    r.forEach((c, i) => { doc.text(String(c || "").slice(0, 28), 11 + i * colW, y + 5); });
    doc.setDrawColor(220, 220, 220); doc.line(10, y + 7, 270, y + 7); y += 7;
  });
  footer(doc, firm);
  doc.save(title.replace(/\s/g, "_") + ".pdf");
}
