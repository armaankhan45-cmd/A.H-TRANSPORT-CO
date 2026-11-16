import { useRef, useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, SearchBox, Input, Field, Select, Textarea, Modal, Confirm } from "../ui";
import { Plus, Printer, Download, Eye, Pencil, Trash2, CheckCircle2, MessageCircle, Mail } from "lucide-react";
import { fmtDate, todayISO, uid, nextSeq } from "../company";
import { downloadTCC, printCanvas } from "../pdf";
import TCCPreview, { TCC_H, TCC_W } from "../components/TCCPreview";
import type { TCC } from "../types";

const DECL = "We hereby declare that the tanker has been thoroughly cleaned and is fit to carry the next product.";

export default function TCCPage() {
  const { db, set, toast, user, firm } = useStore();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<TCC | null>(null);
  const [preview, setPreview] = useState<TCC | null>(null);
  const [del, setDel] = useState<TCC | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const list = db.tccs.filter((t) => !q || [t.tccNo, t.recipient, t.prevCargo, t.date].join(" ").toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.tccNo.localeCompare(a.tccNo));
  const vehicle = (id: string) => db.vehicles.find((v) => v.id === id);
  const driver = (id: string) => db.drivers.find((d) => d.id === id);

  const blank = (): TCC => ({ id: "", tccNo: nextSeq("TCC", db.seq.tcc), date: todayISO(), recipient: "", recipientAddr: "", vehicleId: "", onBehalf: "", prevCargo: "", driverId: "", status: "Final", declaration: DECL });

  const save = (finalise: boolean) => {
    if (!form) return;
    if (!form.recipient.trim()) return toast("Recipient name is required", "error");
    if (!form.vehicleId) return toast("Select a vehicle", "error");
    set((d) => {
      const rec = { ...form, status: finalise ? "Final" : "Draft" };
      if (form.id) { const i = d.tccs.findIndex((x) => x.id === form.id); if (i >= 0) d.tccs[i] = rec; }
      else { d.tccs.push({ ...rec, id: uid() }); d.seq.tcc += 1; }
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: finalise ? "TCC finalised" : "TCC saved as draft", detail: `${rec.tccNo} — ${vehicle(rec.vehicleId)?.regNo}` });
    });
    toast(finalise ? `${form.tccNo} finalised` : "TCC saved as draft");
    setForm(null);
  };

  const doPrint = () => { if (!printCanvas(printRef.current, "TCC", TCC_W, TCC_H)) toast("Allow pop-ups to print", "error"); };

  return (
    <div>
      <PageHeader title="TCC Generation — Tanker Cleaning Certificate" subtitle={`${db.tccs.length} certificates issued`}
        actions={<Button onClick={() => setForm(blank())}><Plus className="w-4 h-4" /> New TCC</Button>} />

      <Card className="p-3 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search TCC no, recipient, previous cargo…" /></Card>

      <Card>
        <Table headers={["TCC No.", "Date", "Recipient", "Vehicle", "On Behalf Of", "Previous Cargo", "Driver", "Status", "Actions"]}>
          {list.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-xs font-bold">{t.tccNo}</td>
              <td className="px-3 py-2 text-xs">{fmtDate(t.date)}</td>
              <td className="px-3 py-2 text-xs max-w-44 truncate">{t.recipient}</td>
              <td className="px-3 py-2 text-xs font-semibold">{vehicle(t.vehicleId)?.regNo || "—"}</td>
              <td className="px-3 py-2 text-xs max-w-40 truncate">{t.onBehalf || "—"}</td>
              <td className="px-3 py-2 text-xs">{t.prevCargo || "—"}</td>
              <td className="px-3 py-2 text-xs">{driver(t.driverId)?.name || "—"}</td>
              <td className="px-3 py-2"><Badge cls={t.status === "Final" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}>{t.status}</Badge></td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <button onClick={() => setPreview(t)} className="p-1.5 rounded hover:bg-gray-100" title="View"><Eye className="w-4 h-4 text-gray-600" /></button>
                  <button onClick={() => setForm({ ...t })} className="p-1.5 rounded hover:bg-gray-100" title="Edit"><Pencil className="w-4 h-4 text-blue-600" /></button>
                  <button onClick={() => setDel(t)} className="p-1.5 rounded hover:bg-gray-100" title="Delete"><Trash2 className="w-4 h-4 text-red-600" /></button>
                  <button onClick={() => { void downloadTCC(t, vehicle(t.vehicleId), driver(t.driverId), firm); toast("PDF generated"); }} className="p-1.5 rounded hover:bg-gray-100" title="Download PDF"><Download className="w-4 h-4 text-green-700" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Confirm open={!!del} onCancel={() => setDel(null)} onConfirm={() => { if (del) { set((d) => { d.tccs = d.tccs.filter((x) => x.id !== del.id); d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "TCC deleted", detail: del.tccNo }); }); toast(`TCC ${del.tccNo} deleted`); } setDel(null); }} message={`Delete TCC ${del?.tccNo}? This cannot be undone.`} />
      <Modal open={!!form} onClose={() => setForm(null)} title={`TCC ${form?.tccNo || ""}`} wide>
        {form && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="TCC Number" hint="Auto-generated"><Input value={form.tccNo} onChange={(e) => setForm({ ...form, tccNo: e.target.value })} /></Field>
            <Field label="Date" required><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Recipient / Company" required hint="Pick a saved customer to auto-fill the address">
              <Input list="tcc-recipients" value={form.recipient} placeholder="Search / type recipient"
                onChange={(e) => { const c = db.customers.find((x) => x.name === e.target.value); setForm({ ...form, recipient: e.target.value, recipientAddr: c?.address || form.recipientAddr }); }} />
              <datalist id="tcc-recipients">{db.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </Field>
            <Field label="Recipient Address"><Input value={form.recipientAddr} onChange={(e) => setForm({ ...form, recipientAddr: e.target.value })} /></Field>
            <Field label="Vehicle" required>
              <Select value={form.vehicleId} onChange={(e) => { const v = db.vehicles.find((x) => x.id === e.target.value); setForm({ ...form, vehicleId: e.target.value, driverId: v?.driverId || form.driverId }); }}>
                <option value="">Select vehicle</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo} — {v.type}</option>)}
              </Select>
            </Field>
            <Field label="Driver" hint="Auto-filled from vehicle"><Select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}><option value="">Select driver</option>{db.drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="On Behalf of M/s."><Select value={form.onBehalf} onChange={(e) => setForm({ ...form, onBehalf: e.target.value })}><option value="">Select customer</option>{db.customers.map((c) => <option key={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Previous Cargo"><Input value={form.prevCargo} onChange={(e) => setForm({ ...form, prevCargo: e.target.value })} placeholder="Chemical Oil / Base Oil / Diesel" /></Field>
            <Field label="Cleaning Declaration" className="sm:col-span-2"><Textarea rows={3} value={form.declaration} onChange={(e) => setForm({ ...form, declaration: e.target.value })} /></Field>
            <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button variant="secondary" onClick={() => save(false)}>Save Draft</Button><Button onClick={() => save(true)}><CheckCircle2 className="w-4 h-4" /> Finalise</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={`TCC ${preview?.tccNo || ""} — A4 Preview`} wide>
        {preview && (
          <div>
            <div className="flex flex-wrap gap-2 mb-3 no-print">
              <Button variant="secondary" onClick={doPrint}><Printer className="w-4 h-4" /> Print A4</Button>
              <Button variant="secondary" onClick={() => downloadTCC(preview, vehicle(preview.vehicleId), driver(preview.driverId), firm)}><Download className="w-4 h-4" /> Download PDF</Button>
              <Button variant="secondary" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`A.H. TRANSPORT CO. — TCC ${preview.tccNo} dated ${fmtDate(preview.date)} for vehicle ${vehicle(preview.vehicleId)?.regNo}. Tanker cleaned & fit for next product.`)}`, "_blank")}><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
              <Button variant="secondary" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(`A.H. Transport Co. TCC ${preview.tccNo}`)}&body=${encodeURIComponent(`TCC No: ${preview.tccNo}\nDate: ${fmtDate(preview.date)}\nVehicle: ${vehicle(preview.vehicleId)?.regNo}\nRecipient: ${preview.recipient}`)}`; }}><Mail className="w-4 h-4" /> Email</Button>
              <Button variant="secondary" onClick={() => setForm({ ...preview })}><Pencil className="w-4 h-4" /> Edit</Button>
            </div>
            <div ref={printRef}><TCCPreview tcc={preview} vehicle={vehicle(preview.vehicleId)} driver={driver(preview.driverId)} firm={firm} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
