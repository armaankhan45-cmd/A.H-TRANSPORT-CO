import { useEffect, useMemo, useRef, useState } from "react";
import { takeNew } from "../launch";
import { FontToggle } from "../components/formKit";
import { lrVehicleNo, lrValueText, packLR, normReg } from "../lrExtra";
import { useStore } from "../store";
import { Plate, Card, PageHeader, Table, Badge, Button, SearchBox, Select, Input, Field, Modal, Confirm } from "../ui";
import { Plus, Printer, Download, Eye, Pencil, Trash2, CheckCircle2, MessageCircle, Mail } from "lucide-react";
import { fmtDate, fmtINR, todayISO, uid, nextSeq } from "../company";
import { downloadLR, printCanvas, lrPdfFile, sharePdf } from "../pdf";
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
    setVehTxt("");
    setForm(blank(lrNo));
  };

  const [vehTxt, setVehTxt] = useState("");
  const editLR = (l: LR) => { setPreview(null); setVehTxt(lrVehicleNo(l, db.vehicles.find((v) => v.id === l.vehicleId)?.regNo)); setForm({ ...l }); };

  useEffect(() => { if (takeNew()) newLR(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!form) return;
    if (!form.lrNo.trim()) return toast("Enter the LR number", "error");
    if (!form.consignor.trim() || !form.consignee.trim()) return toast("Consignor and consignee are required", "error");
    if (!vehTxt.trim()) return toast("Type the vehicle number", "error");
    const veh = db.vehicles.find((v) => normReg(v.regNo) === normReg(vehTxt));
    if (veh?.status === "Under Maintenance" && !form.id) return toast("Vehicle is under maintenance and cannot be loaded for a new LR without an admin override.", "error");
    if (db.lrs.some((x) => x.id !== form.id && x.lrNo.trim().toLowerCase() === form.lrNo.trim().toLowerCase())) return toast(`LR ${form.lrNo} already exists`, "error");
    const rec: LR = { ...form, vehicleId: veh?.id || "", driverId: form.driverId || veh?.driverId || "", value: packLR(form, vehTxt.trim().toUpperCase()), status: "Final" };
    set((d) => {
      if (form.id) {
        const i = d.lrs.findIndex((x) => x.id === form.id);
        if (i >= 0) d.lrs[i] = rec;
      } else {
        d.lrs.push({ ...rec, id: uid() });
        if (/^LR\/\d+$/i.test(rec.lrNo.trim())) d.seq.lr += 1;
      }
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: form.id ? "LR edited" : "LR created", detail: `${rec.lrNo} — ${rec.consignor} → ${rec.consignee}` });
    });
    toast(`${form.lrNo} saved`);
    setForm(null);
  };

  const vehicle = (id: string) => db.vehicles.find((v) => v.id === id);
  const driver = (id: string) => db.drivers.find((d) => d.id === id);

  const sharePdfWhatsApp = async (lr: LR) => {
    toast("Preparing PDF…");
    const f = await lrPdfFile(lr, vehicle(lr.vehicleId), driver(lr.driverId), firm);
    const r = await sharePdf(f, `LR ${lr.lrNo} — ${firm.display}`);
    if (r === "saved") toast("PDF saved — attach it in WhatsApp");
  };
  const shareWhatsApp = (lr: LR) => {
    const text = `*A.H. TRANSPORT CO.*%0ALR No: ${lr.lrNo}%0ADate: ${fmtDate(lr.date)}%0AFrom: ${lr.from} → To: ${lr.to}%0AConsignor: ${lr.consignor}%0AConsignee: ${lr.consignee}%0AVehicle: ${lrVehicleNo(lr, vehicle(lr.vehicleId)?.regNo)}%0AGoods: ${lr.goods} (${lr.quantity})%0ANet Wt: ${lr.net} kg%0AFreight: Rs. ${lr.freight}%0A${lr.status === "Final" ? "Download the PDF and attach it here." : "DRAFT — not finalised"}`;
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };
  const shareEmail = (lr: LR) => {
    window.location.href = `mailto:?subject=${encodeURIComponent(`A.H. Transport Co. LR ${lr.lrNo}`)}&body=${encodeURIComponent(`LR No: ${lr.lrNo}\nDate: ${fmtDate(lr.date)}\nConsignor: ${lr.consignor}\nConsignee: ${lr.consignee}\nVehicle: ${lrVehicleNo(lr, vehicle(lr.vehicleId)?.regNo)}\nFreight: Rs ${lr.freight}\n\nPlease find the PDF attached (download from the app).`)}`;
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
              <td className="px-3 py-2"><Plate no={lrVehicleNo(l, vehicle(l.vehicleId)?.regNo)} /></td>
              <td className="px-3 py-2 text-xs">{l.goods}<span className="block text-[10px] text-gray-500">{l.quantity}</span></td>
              <td className="px-3 py-2 text-xs">{fmtINR(Number(l.freight || 0))}</td>
              <td className="px-3 py-2"><Badge cls={l.status === "Final" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}>{l.status}</Badge></td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <button title="View / print" onClick={() => setPreview(l)} className="p-1.5 rounded hover:bg-gray-100"><Eye className="w-4 h-4 text-gray-600" /></button>
                  <button title="Edit" onClick={() => editLR(l)} className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-blue-600" /></button>
                  <button title="Delete" onClick={() => setDel(l)} className="p-1.5 rounded hover:bg-gray-100"><Trash2 className="w-4 h-4 text-red-600" /></button>
                  <button title="Share PDF on WhatsApp" onClick={() => void sharePdfWhatsApp(l)} className="px-2 py-1 rounded bg-green-100 text-green-900 text-xs font-semibold inline-flex items-center gap-1 hover:bg-green-200"><MessageCircle className="w-4 h-4" /> Share</button>
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
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="L.R. No." required><Input value={form.lrNo} onChange={(e) => setForm({ ...form, lrNo: e.target.value })} /></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="From"><Input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
            <Field label="To"><Input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase">Consignor (left side)</p>
              <Field label="Name" required>
                <Input list="lr-consignors" value={form.consignor} placeholder="Type consignor"
                  onChange={(e) => { const c = db.customers.find((x) => x.name === e.target.value); setForm({ ...form, consignor: e.target.value, consignorAddr: c?.address || form.consignorAddr }); }} />
                <datalist id="lr-consignors">{db.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              </Field>
              <Field label="Address (optional)"><Input value={form.consignorAddr} onChange={(e) => setForm({ ...form, consignorAddr: e.target.value })} /></Field>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase">Consignee (right side)</p>
              <Field label="Name" required>
                <Input list="lr-consignees" value={form.consignee} placeholder="Type consignee"
                  onChange={(e) => { const c = db.customers.find((x) => x.name === e.target.value); setForm({ ...form, consignee: e.target.value, consigneeAddr: c?.address || form.consigneeAddr }); }} />
                <datalist id="lr-consignees">{db.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              </Field>
              <Field label="Address (optional)"><Input value={form.consigneeAddr} onChange={(e) => setForm({ ...form, consigneeAddr: e.target.value })} /></Field>
            </div>
            <Field label="Vehicle No." required hint="Just type the number">
              <Input list="lr-vehicles" value={vehTxt} placeholder="MH43BP8494" onChange={(e) => setVehTxt(e.target.value.toUpperCase())} />
              <datalist id="lr-vehicles">{db.vehicles.map((v) => <option key={v.id} value={v.regNo} />)}</datalist>
            </Field>
            <Field label="Nature of Goods"><Input value={form.goods} onChange={(e) => setForm({ ...form, goods: e.target.value })} placeholder="IPA" /></Field>
            <Field label="N. Wt." className="sm:col-span-2"><Input value={form.net} onChange={(e) => setForm({ ...form, net: e.target.value })} placeholder="26,940" /></Field>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={save}><CheckCircle2 className="w-4 h-4" /> Save LR</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={`LR ${preview?.lrNo || ""} — A4 Preview`} wide>
        {preview && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3 no-print">
              <FontToggle />
              <Button variant="secondary" onClick={doPrint}><Printer className="w-4 h-4" /> Print A4</Button>
              <Button variant="secondary" onClick={() => downloadLR(preview, vehicle(preview.vehicleId), driver(preview.driverId), firm)}><Download className="w-4 h-4" /> Download PDF</Button>
              <Button variant="secondary" onClick={() => void sharePdfWhatsApp(preview)}><MessageCircle className="w-4 h-4" /> Share PDF</Button>
              <Button variant="secondary" onClick={() => shareEmail(preview)}><Mail className="w-4 h-4" /> Email</Button>
              <Button variant="secondary" onClick={() => editLR(preview)}><Pencil className="w-4 h-4" /> Edit</Button>
            </div>
            <div ref={printRef}><LRPreview lr={preview} vehicle={vehicle(preview.vehicleId)} driver={driver(preview.driverId)} firm={firm} /></div>
          </div>
        )}
      </Modal>
      <Confirm open={!!del} onCancel={() => setDel(null)} onConfirm={() => { if (del) { set((d) => { d.lrs = d.lrs.filter((x) => x.id !== del.id); d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "LR deleted", detail: del.lrNo }); }); toast(`LR ${del.lrNo} deleted`); } setDel(null); }} message={`Delete LR ${del?.lrNo}? This cannot be undone.`} />
    </div>
  );
}
