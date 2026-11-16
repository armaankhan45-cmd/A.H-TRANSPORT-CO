import { useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, SearchBox, Select, Input, Field, Textarea, Modal, Tabs, Confirm, Empty } from "../ui";
import { Plus, Printer, Download, Share2, Eye, Pencil, Trash2, FileText, CheckCircle2, MessageCircle, Mail } from "lucide-react";
import { fmtDate, fmtINR, todayISO, uid, nextSeq } from "../company";
import { downloadLR, printCanvas } from "../pdf";
import LRPreview, { LR_H, LR_W } from "../components/LRPreview";
import type { LR } from "../types";

const blank = (lrNo: string): LR => ({ id: "", lrNo, date: todayISO(), from: "", to: "", consignor: "", consignorAddr: "", consignee: "", consigneeAddr: "", vehicleId: "", goods: "", quantity: "", gross: "", tare: "", net: "", freight: "", value: "Not Declared", beNo: "", reportingDT: "", unloadingDT: "", startKm: "", status: "Draft", driverId: "" });

export default function LRPage() {
  const { db, set, toast, user, firm } = useStore();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [form, setForm] = useState<LR | null>(null);
  const [preview, setPreview] = useState<LR | null>(null);
  const [del, setDel] = useState<LR | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const list = db.lrs.filter((l) => {
    if (statusF && l.status !== statusF) return false;
    if (!q) return true;
    const v = db.vehicles.find((x) => x.id === l.vehicleId)?.regNo || "";
    return [l.lrNo, l.consignor, l.consignee, l.date, v, l.goods].join(" ").toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => b.lrNo.localeCompare(a.lrNo));

  const newLR = () => {
    const lrNo = nextSeq("LR", db.seq.lr);
    setForm(blank(lrNo));
  };

  const save = (finalise = false) => {
    if (!form) return;
    if (!form.consignor.trim() || !form.consignee.trim()) return toast("Consignor and consignee are required", "error");
    if (!form.vehicleId) return toast("Select a vehicle", "error");
    const veh = db.vehicles.find((v) => v.id === form.vehicleId);
    if (veh?.status === "Under Maintenance" && !form.id) return toast("Vehicle is under maintenance and cannot be loaded for a new LR without an admin override.", "error");
    set((d) => {
      const rec: LR = { ...form, status: finalise ? "Final" : "Draft" };
      if (form.id) {
        const i = d.lrs.findIndex((x) => x.id === form.id);
        if (i >= 0) d.lrs[i] = rec;
      } else {
        d.lrs.push({ ...rec, id: uid() });
        d.seq.lr += 1;
      }
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: finalise ? "LR finalised" : "LR saved as draft", detail: `${rec.lrNo} — ${rec.consignor} → ${rec.consignee}` });
    });
    toast(finalise ? `${form.lrNo} finalised` : `${form.lrNo} saved as draft`);
    setForm(null);
  };

  const vehicle = (id: string) => db.vehicles.find((v) => v.id === id);
  const driver = (id: string) => db.drivers.find((d) => d.id === id);

  const shareWhatsApp = (lr: LR) => {
    const text = `*A.H. TRANSPORT CO.*%0ALR No: ${lr.lrNo}%0ADate: ${fmtDate(lr.date)}%0AFrom: ${lr.from} → To: ${lr.to}%0AConsignor: ${lr.consignor}%0AConsignee: ${lr.consignee}%0AVehicle: ${vehicle(lr.vehicleId)?.regNo || ""}%0AGoods: ${lr.goods} (${lr.quantity})%0ANet Wt: ${lr.net} kg%0AFreight: Rs. ${lr.freight}%0A${lr.status === "Final" ? "Download the PDF and attach it here." : "DRAFT — not finalised"}`;
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };
  const shareEmail = (lr: LR) => {
    window.location.href = `mailto:?subject=${encodeURIComponent(`A.H. Transport Co. LR ${lr.lrNo}`)}&body=${encodeURIComponent(`LR No: ${lr.lrNo}\nDate: ${fmtDate(lr.date)}\nConsignor: ${lr.consignor}\nConsignee: ${lr.consignee}\nVehicle: ${vehicle(lr.vehicleId)?.regNo}\nFreight: Rs ${lr.freight}\n\nPlease find the PDF attached (download from the app).`)}`;
  };
  const doPrint = () => { if (!printCanvas(printRef.current, "LR", LR_W, LR_H)) toast("Allow pop-ups to print", "error"); };

  const totals = useMemo(() => ({ total: db.lrs.length, drafts: db.lrs.filter((l) => l.status === "Draft").length, freight: db.lrs.filter((l) => l.status === "Final").reduce((a, l) => a + Number(l.freight || 0), 0) }), [db.lrs]);

  return (
    <div>
      <PageHeader title="LR Generation — Lorry Receipt" subtitle={`${totals.total} LR documents · ${totals.drafts} drafts · ${fmtINR(totals.freight)} finalised freight`}
        actions={<Button onClick={newLR}><Plus className="w-4 h-4" /> New LR</Button>} />

      <Card className="p-3 mb-3 flex flex-col sm:flex-row gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search LR no, date, vehicle, consignor, consignee…" />
        <Select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="sm:w-44"><option value="">All statuses</option><option>Draft</option><option>Final</option></Select>
      </Card>

      <Card>
        <Table headers={["LR No.", "Date", "Consignor → Consignee", "Route", "Vehicle", "Goods", "Freight", "Status", "Actions"]} empty={list.length === 0}>
          {list.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-xs font-bold">{l.lrNo}</td>
              <td className="px-3 py-2 text-xs">{fmtDate(l.date)}</td>
              <td className="px-3 py-2 text-xs max-w-52"><span className="block truncate">{l.consignor}</span><span className="block truncate text-gray-500">→ {l.consignee}</span></td>
              <td className="px-3 py-2 text-xs">{l.from} → {l.to}</td>
              <td className="px-3 py-2 text-xs font-semibold">{vehicle(l.vehicleId)?.regNo || "—"}</td>
              <td className="px-3 py-2 text-xs">{l.goods}<span className="block text-[10px] text-gray-500">{l.quantity}</span></td>
              <td className="px-3 py-2 text-xs">{fmtINR(Number(l.freight || 0))}</td>
              <td className="px-3 py-2"><Badge cls={l.status === "Final" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}>{l.status}</Badge></td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <button title="View / print" onClick={() => setPreview(l)} className="p-1.5 rounded hover:bg-gray-100"><Eye className="w-4 h-4 text-gray-600" /></button>
                  <button title="Edit" onClick={() => setForm({ ...l })} className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-blue-600" /></button>
                  <button title="Delete" onClick={() => setDel(l)} className="p-1.5 rounded hover:bg-gray-100"><Trash2 className="w-4 h-4 text-red-600" /></button>
                  <button title="Download PDF" onClick={() => { void downloadLR(l, vehicle(l.vehicleId), driver(l.driverId), firm); toast("PDF generated"); }} className="p-1.5 rounded hover:bg-gray-100"><Download className="w-4 h-4 text-green-700" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* form */}
      <Modal open={!!form} onClose={() => setForm(null)} title={`LR ${form?.lrNo || ""}`} wide>
        {form && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="LR Number" hint="Auto-generated sequential"><Input value={form.lrNo} onChange={(e) => setForm({ ...form, lrNo: e.target.value })} /></Field>
            <Field label="Date" required><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Vehicle" required><Select value={form.vehicleId} onChange={(e) => { const v = db.vehicles.find((x) => x.id === e.target.value); setForm({ ...form, vehicleId: e.target.value, driverId: v?.driverId || form.driverId }); }}>
              <option value="">Select vehicle</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo} — {v.status}</option>)}</Select></Field>
            <Field label="Consignor Name" required hint="Pick a saved customer to auto-fill the address">
              <Input list="lr-consignors" value={form.consignor} placeholder="Search / type consignor"
                onChange={(e) => { const c = db.customers.find((x) => x.name === e.target.value); setForm({ ...form, consignor: e.target.value, consignorAddr: c?.address || form.consignorAddr }); }} />
              <datalist id="lr-consignors">{db.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </Field>
            <Field label="Consignor Address"><Input value={form.consignorAddr} onChange={(e) => setForm({ ...form, consignorAddr: e.target.value })} /></Field>
            <Field label="Consignee Name" required hint="Pick a saved customer to auto-fill the address">
              <Input list="lr-consignees" value={form.consignee} placeholder="Search / type consignee"
                onChange={(e) => { const c = db.customers.find((x) => x.name === e.target.value); setForm({ ...form, consignee: e.target.value, consigneeAddr: c?.address || form.consigneeAddr }); }} />
              <datalist id="lr-consignees">{db.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </Field>
            <Field label="Consignee Address"><Input value={form.consigneeAddr} onChange={(e) => setForm({ ...form, consigneeAddr: e.target.value })} /></Field>
            <Field label="From" required><Input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
            <Field label="To" required><Input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
            <Field label="Nature of Goods"><Input value={form.goods} onChange={(e) => setForm({ ...form, goods: e.target.value })} placeholder="Chemical Oil / Bulk Cargo" /></Field>
            <Field label="Quantity"><Input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="24 KL" /></Field>
            <Field label="Gross Weight (kg)"><Input value={form.gross} onChange={(e) => setForm({ ...form, gross: e.target.value, net: String(Number(e.target.value || 0) - Number(form.tare || 0)) })} /></Field>
            <Field label="Tare Weight (kg)"><Input value={form.tare} onChange={(e) => setForm({ ...form, tare: e.target.value, net: String(Number(form.gross || 0) - Number(e.target.value || 0)) })} /></Field>
            <Field label="Net Weight (kg)" hint="Auto-calculated"><Input value={form.net} onChange={(e) => setForm({ ...form, net: e.target.value })} /></Field>
            <Field label="Freight as per Contract (₹)"><Input value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} /></Field>
            <Field label="Value Declared"><Select value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}><option>Not Declared</option><option>Declared</option></Select></Field>
            <Field label="BE / Invoice Number"><Input value={form.beNo} onChange={(e) => setForm({ ...form, beNo: e.target.value })} /></Field>
            <Field label="Reporting Date &amp; Time"><Input type="datetime-local" value={form.reportingDT} onChange={(e) => setForm({ ...form, reportingDT: e.target.value })} /></Field>
            <Field label="Unloading Date &amp; Time"><Input type="datetime-local" value={form.unloadingDT} onChange={(e) => setForm({ ...form, unloadingDT: e.target.value })} /></Field>
            <Field label="Start Kilometre"><Input value={form.startKm} onChange={(e) => setForm({ ...form, startKm: e.target.value })} /></Field>
            <Field label="Driver"><Select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}><option value="">Auto (from vehicle)</option>{db.drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-600">Draft can be edited any time. Finalising locks the LR for printing (still re-editable by Admin) and writes an audit entry.</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
                <Button variant="secondary" onClick={() => save(false)}><FileText className="w-4 h-4" /> Save Draft</Button>
                <Button onClick={() => save(true)}><CheckCircle2 className="w-4 h-4" /> Finalise</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={`LR ${preview?.lrNo || ""} — A4 Preview`} wide>
        {preview && (
          <div>
            <div className="flex flex-wrap gap-2 mb-3 no-print">
              <Button variant="secondary" onClick={doPrint}><Printer className="w-4 h-4" /> Print A4</Button>
              <Button variant="secondary" onClick={() => downloadLR(preview, vehicle(preview.vehicleId), driver(preview.driverId), firm)}><Download className="w-4 h-4" /> Download PDF</Button>
              <Button variant="secondary" onClick={() => shareWhatsApp(preview)}><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
              <Button variant="secondary" onClick={() => shareEmail(preview)}><Mail className="w-4 h-4" /> Email</Button>
              <Button variant="secondary" onClick={() => setForm({ ...preview })}><Pencil className="w-4 h-4" /> Edit</Button>
            </div>
            <div ref={printRef}><LRPreview lr={preview} vehicle={vehicle(preview.vehicleId)} driver={driver(preview.driverId)} firm={firm} /></div>
          </div>
        )}
      </Modal>
      <Confirm open={!!del} onCancel={() => setDel(null)} onConfirm={() => { if (del) { set((d) => { d.lrs = d.lrs.filter((x) => x.id !== del.id); d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "LR deleted", detail: del.lrNo }); }); toast(`LR ${del.lrNo} deleted`); } setDel(null); }} message={`Delete LR ${del?.lrNo}? This cannot be undone.`} />
    </div>
  );
}
