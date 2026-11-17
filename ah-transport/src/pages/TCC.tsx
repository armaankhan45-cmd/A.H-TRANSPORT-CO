import { useEffect, useRef, useState } from "react";
import { takeNew } from "../launch";
import { FontToggle } from "../components/formKit";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, SearchBox, Input, Field, Textarea, Modal, Confirm } from "../ui";
import { Plus, Printer, Download, Eye, Pencil, Trash2, CheckCircle2, MessageCircle, Mail } from "lucide-react";
import { fmtDate, todayISO, uid, nextSeq } from "../company";
import { downloadTCC, printCanvas } from "../pdf";
import TCCPreview, { TCC_H, TCC_W } from "../components/TCCPreview";
import type { TCC } from "../types";
import { readExtra, packExtra, normReg } from "../tccExtra";


export default function TCCPage() {
  const { db, set, toast, user, firm } = useStore();
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<TCC | null>(null);
  const [del, setDel] = useState<TCC | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const list = db.tccs.filter((t) => !q || [t.tccNo, t.recipient, t.prevCargo, t.date].join(" ").toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.tccNo.localeCompare(a.tccNo));
  const vehicle = (id: string) => db.vehicles.find((v) => v.id === id);
  const driver = (id: string) => db.drivers.find((d) => d.id === id);

  type TF = { id: string; tccNo: string; date: string; party: string; addr: string; material: string; vehicleNo: string; onBehalf: string; prevCargo: string; driverName: string };
  const [tf, setTf] = useState<TF | null>(null);
  const blank = (): TF => ({ id: "", tccNo: nextSeq("TCC", db.seq.tcc), date: todayISO(), party: "", addr: "", material: "", vehicleNo: "", onBehalf: "", prevCargo: "", driverName: "" });
  const toForm = (t: TCC): TF => { const x = readExtra(t); return { id: t.id, tccNo: t.tccNo, date: t.date, party: t.recipient, addr: t.recipientAddr, material: x.material, vehicleNo: x.vehicleNo || vehicle(t.vehicleId)?.regNo || "", onBehalf: t.onBehalf, prevCargo: t.prevCargo, driverName: x.driverName || driver(t.driverId)?.name || "" }; };
  const editTCC = (t: TCC) => { setPreview(null); setTf(toForm(t)); };

  useEffect(() => { if (takeNew()) setTf(blank()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!tf) return;
    if (!tf.party.trim()) return toast("Enter the party name (To)", "error");
    if (!tf.vehicleNo.trim()) return toast("Enter the vehicle number", "error");
    const veh = db.vehicles.find((v) => normReg(v.regNo) === normReg(tf.vehicleNo));
    const drv = db.drivers.find((x) => x.name.trim().toLowerCase() === tf.driverName.trim().toLowerCase());
    const rec: TCC = { id: tf.id, tccNo: tf.tccNo, date: tf.date, recipient: tf.party.trim(), recipientAddr: tf.addr.trim(), vehicleId: veh?.id || "", onBehalf: tf.onBehalf.trim(), prevCargo: tf.prevCargo.trim(), driverId: drv?.id || "", status: "Final", declaration: packExtra({ material: tf.material.trim(), vehicleNo: tf.vehicleNo.trim().toUpperCase(), driverName: tf.driverName.trim() }) };
    set((d) => {
      if (tf.id) { const i = d.tccs.findIndex((x) => x.id === tf.id); if (i >= 0) d.tccs[i] = { ...d.tccs[i], ...rec }; }
      else { d.tccs.push({ ...rec, id: uid() }); d.seq.tcc += 1; }
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: tf.id ? "TCC edited" : "TCC created", detail: `${rec.tccNo} — ${tf.vehicleNo}` });
    });
    toast(`${tf.tccNo} saved`);
    setTf(null);
  };

  const doPrint = () => { if (!printCanvas(printRef.current, "TCC", TCC_W, TCC_H)) toast("Allow pop-ups to print", "error"); };

  return (
    <div>
      <PageHeader title="TCC Generation — Tanker Cleaning Certificate" subtitle={`${db.tccs.length} certificates issued`}
        actions={<Button onClick={() => setTf(blank())}><Plus className="w-4 h-4" /> New TCC</Button>} />

      <Card className="p-3 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search TCC no, recipient, previous cargo…" /></Card>

      <Card>
        <Table headers={["TCC No.", "Date", "Recipient", "Vehicle", "On Behalf Of", "Previous Cargo", "Driver", "Status", "Actions"]}>
          {list.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-xs font-bold">{t.tccNo}</td>
              <td className="px-3 py-2 text-xs">{fmtDate(t.date)}</td>
              <td className="px-3 py-2 text-xs max-w-44 truncate">{t.recipient}</td>
              <td className="px-3 py-2 text-xs font-semibold">{readExtra(t).vehicleNo || vehicle(t.vehicleId)?.regNo || "—"}</td>
              <td className="px-3 py-2 text-xs max-w-40 truncate">{t.onBehalf || "—"}</td>
              <td className="px-3 py-2 text-xs">{t.prevCargo || "—"}</td>
              <td className="px-3 py-2 text-xs">{readExtra(t).driverName || driver(t.driverId)?.name || "—"}</td>
              <td className="px-3 py-2"><Badge cls={t.status === "Final" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}>{t.status}</Badge></td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <button onClick={() => setPreview(t)} className="p-1.5 rounded hover:bg-gray-100" title="View"><Eye className="w-4 h-4 text-gray-600" /></button>
                  <button onClick={() => editTCC(t)} className="p-1.5 rounded hover:bg-gray-100" title="Edit"><Pencil className="w-4 h-4 text-blue-600" /></button>
                  <button onClick={() => setDel(t)} className="p-1.5 rounded hover:bg-gray-100" title="Delete"><Trash2 className="w-4 h-4 text-red-600" /></button>
                  <button onClick={() => { void downloadTCC(t, vehicle(t.vehicleId), driver(t.driverId), firm); toast("PDF generated"); }} className="p-1.5 rounded hover:bg-gray-100" title="Download PDF"><Download className="w-4 h-4 text-green-700" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Confirm open={!!del} onCancel={() => setDel(null)} onConfirm={() => { if (del) { set((d) => { d.tccs = d.tccs.filter((x) => x.id !== del.id); d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "TCC deleted", detail: del.tccNo }); }); toast(`TCC ${del.tccNo} deleted`); } setDel(null); }} message={`Delete TCC ${del?.tccNo}? This cannot be undone.`} />
      <Modal open={!!tf} onClose={() => setTf(null)} title={`TCC ${tf?.tccNo || ""}`} wide>
        {tf && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="To — Party name" required className="sm:col-span-2">
              <Input list="tcc-parties" value={tf.party} placeholder="Type party / company name"
                onChange={(e) => { const c = db.customers.find((x) => x.name === e.target.value); setTf({ ...tf, party: e.target.value, addr: c?.address || tf.addr }); }} />
              <datalist id="tcc-parties">{db.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </Field>
            <Field label="Party address" className="sm:col-span-2" hint="Press Enter for a new line, like the printed letter"><Textarea rows={2} value={tf.addr} onChange={(e) => setTf({ ...tf, addr: e.target.value })} /></Field>
            <Field label="Material name (We intend to transport)"><Input value={tf.material} onChange={(e) => setTf({ ...tf, material: e.target.value })} /></Field>
            <Field label="Vehicle No." required>
              <Input list="tcc-vehicles" value={tf.vehicleNo} placeholder="MH43BP8494" onChange={(e) => setTf({ ...tf, vehicleNo: e.target.value.toUpperCase() })} />
              <datalist id="tcc-vehicles">{db.vehicles.map((v) => <option key={v.id} value={v.regNo} />)}</datalist>
            </Field>
            <Field label="On behalf of M/s."><Input list="tcc-behalf" value={tf.onBehalf} onChange={(e) => setTf({ ...tf, onBehalf: e.target.value })} /><datalist id="tcc-behalf">{db.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist></Field>
            <Field label="Previous material"><Input value={tf.prevCargo} onChange={(e) => setTf({ ...tf, prevCargo: e.target.value })} /></Field>
            <Field label="Driver name" hint="Driver signature is added automatically"><Input list="tcc-drivers" value={tf.driverName} onChange={(e) => setTf({ ...tf, driverName: e.target.value })} /><datalist id="tcc-drivers">{db.drivers.map((d) => <option key={d.id} value={d.name} />)}</datalist></Field>
            <Field label="Date"><Input type="date" value={tf.date} onChange={(e) => setTf({ ...tf, date: e.target.value })} /></Field>
            <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setTf(null)}>Cancel</Button><Button onClick={save}><CheckCircle2 className="w-4 h-4" /> Save TCC</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={`TCC ${preview?.tccNo || ""} — A4 Preview`} wide>
        {preview && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3 no-print">
              <FontToggle />
              <Button variant="secondary" onClick={doPrint}><Printer className="w-4 h-4" /> Print A4</Button>
              <Button variant="secondary" onClick={() => downloadTCC(preview, vehicle(preview.vehicleId), driver(preview.driverId), firm)}><Download className="w-4 h-4" /> Download PDF</Button>
              <Button variant="secondary" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`A.H. TRANSPORT CO. — TCC ${preview.tccNo} dated ${fmtDate(preview.date)} for vehicle ${vehicle(preview.vehicleId)?.regNo}. Tanker cleaned & fit for next product.`)}`, "_blank")}><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
              <Button variant="secondary" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(`A.H. Transport Co. TCC ${preview.tccNo}`)}&body=${encodeURIComponent(`TCC No: ${preview.tccNo}\nDate: ${fmtDate(preview.date)}\nVehicle: ${vehicle(preview.vehicleId)?.regNo}\nRecipient: ${preview.recipient}`)}`; }}><Mail className="w-4 h-4" /> Email</Button>
              <Button variant="secondary" onClick={() => editTCC(preview)}><Pencil className="w-4 h-4" /> Edit</Button>
            </div>
            <div ref={printRef}><TCCPreview tcc={preview} vehicle={vehicle(preview.vehicleId)} driver={driver(preview.driverId)} firm={firm} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
