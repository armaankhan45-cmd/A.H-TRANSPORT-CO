import jsPDF from "jspdf";
import { COMPANY, fmtDate } from "./company";
import type { LR, TCC, Vehicle, Driver } from "./types";

function header(doc: jsPDF, title: string) {
  // Green top band
  doc.setFillColor(20, 83, 45); doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("A.H. TRANSPORT CO.", 105, 13, { align: "center" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, 105, 19, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(COMPANY.address, 105, 24, { align: "center" });
  doc.text(`Mob: ${COMPANY.phones.join("  |  ")}   Email: ${COMPANY.email}   Web: ${COMPANY.website}`, 105, 29, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(220, 252, 231); doc.rect(0, 34, 210, 10, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(title, 105, 41, { align: "center" });
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text(`GSTIN: ${COMPANY.gstin}    PAN: ${COMPANY.pan}`, 105, 46, { align: "center" });
}
function footer(doc: jsPDF) {
  doc.setFontSize(7); doc.setTextColor(100, 100, 100);
  doc.text(`${COMPANY.name}  |  ${COMPANY.address}  |  GSTIN: ${COMPANY.gstin}  |  PAN: ${COMPANY.pan}`, 105, 287, { align: "center" });
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

export function downloadLR(lr: LR, vehicle: Vehicle | undefined, driver: Driver | undefined) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, "LORRY RECEIPT (LR)");
  let y = 52;
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(`LR No: ${lr.lrNo}`, 12, y); doc.text(`Date: ${fmtDate(lr.date)}`, 198, y, { align: "right" }); y += 4;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(`Status: ${lr.status}   |   From: ${lr.from}   To: ${lr.to}`, 12, y); y += 6;
  box(doc, y, 62);
  y += 8;
  y = row(doc, y, "Consignor:", `${lr.consignor}\n${lr.consignorAddr}`.replace("\n", " — "));
  y = row(doc, y, "Consignee:", `${lr.consignee}\n${lr.consigneeAddr}`.replace("\n", " — "));
  y = row(doc, y, "Vehicle No:", vehicle?.regNo || "—");
  y = row(doc, y, "Driver:", driver?.name || "—");
  y = row(doc, y, "Nature of Goods:", lr.goods);
  y = row(doc, y, "Quantity:", lr.quantity);
  y = row(doc, y, "Gross / Tare / Net (kg):", `${lr.gross} / ${lr.tare} / ${lr.net}`);
  y = row(doc, y, "Freight as per Contract:", `Rs. ${lr.freight}`);
  y = row(doc, y, "Value:", lr.value);
  y = row(doc, y, "BE / Invoice No:", lr.beNo);
  y += 4;
  box(doc, y, 34);
  y += 8;
  y = row(doc, y, "Reporting Date & Time:", lr.reportingDT ? new Date(lr.reportingDT).toLocaleString("en-IN") : "—");
  y = row(doc, y, "Unloading Date & Time:", lr.unloadingDT ? new Date(lr.unloadingDT).toLocaleString("en-IN") : "—");
  y = row(doc, y, "Start Kilometre:", lr.startKm);
  y += 10;
  doc.setFontSize(8.5);
  doc.text("Consignee Stamp & Signature", 12, y); doc.text("For A.H. TRANSPORT CO.", 198, y, { align: "right" }); y += 4;
  doc.setFontSize(7); doc.text("(Authorised Signatory)", 198, y, { align: "right" });
  doc.setDrawColor(0, 0, 0); doc.line(12, y + 8, 70, y + 8); doc.line(140, y + 8, 198, y + 8);
  footer(doc);
  doc.save(`${lr.lrNo.replace(/\//g, "_")}_LR.pdf`);
}

export function downloadTCC(tcc: TCC, vehicle: Vehicle | undefined, driver: Driver | undefined) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, "TANKER CLEANING CERTIFICATE (TCC)");
  let y = 52;
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(`TCC No: ${tcc.tccNo}`, 12, y); doc.text(`Date: ${fmtDate(tcc.date)}`, 198, y, { align: "right" }); y += 8;
  box(doc, y, 78);
  y += 8;
  y = row(doc, y, "To / Recipient:", tcc.recipient);
  y = row(doc, y, "Address:", tcc.recipientAddr);
  y = row(doc, y, "Vehicle No:", vehicle?.regNo || "—");
  y = row(doc, y, "On Behalf of M/s:", tcc.onBehalf);
  y = row(doc, y, "Previous Cargo:", tcc.prevCargo);
  y = row(doc, y, "Driver Name:", driver?.name || "—");
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("CLEANING DECLARATION", 105, y, { align: "center" }); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const lines = doc.splitTextToSize(tcc.declaration + " We confirm that each compartment of the tanker has been properly cleaned, washed and disinfected, and the tanker is fit to carry the next product without contamination.", 180);
  doc.text(lines, 15, y); y += lines.length * 5 + 8;
  doc.setFontSize(8.5);
  doc.text("Driver Signature", 12, y); doc.text("For A.H. TRANSPORT CO.", 198, y, { align: "right" }); y += 4;
  doc.setFontSize(7); doc.text("(Authorised Signatory & Company Stamp)", 198, y, { align: "right" });
  doc.setDrawColor(0, 0, 0); doc.line(12, y + 8, 70, y + 8); doc.line(140, y + 8, 198, y + 8);
  footer(doc);
  doc.save(`${tcc.tccNo.replace(/\//g, "_")}_TCC.pdf`);
}

export function downloadReport(title: string, headers: string[], rows: string[][]) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  header(doc, title.toUpperCase());
  let y = 56; const colW = 260 / headers.length;
  doc.setFillColor(20, 83, 45); doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => { doc.rect(10 + i * colW, y, colW, 7, "F"); doc.text(h, 11 + i * colW, y + 5); });
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); y += 7;
  rows.slice(0, 60).forEach((r) => {
    if (y > 275) { doc.addPage(); y = 15; }
    r.forEach((c, i) => { doc.text(String(c || "").slice(0, 28), 11 + i * colW, y + 5); });
    doc.setDrawColor(220, 220, 220); doc.line(10, y + 7, 270, y + 7); y += 7;
  });
  footer(doc);
  doc.save(title.replace(/\s/g, "_") + ".pdf");
}
