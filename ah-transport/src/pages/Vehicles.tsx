import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Button, Input, Select, Field, Textarea, Modal, Table, Badge, statusBadge, SearchBox, Confirm, FileField, Tabs, KV, Empty, Empty as EmptyBox } from "../ui";
import { Plus, Pencil, Trash2, Power, Eye, FileText, Truck, Wrench, Route, Upload, History, AlertTriangle } from "lucide-react";
import { VEHICLE_TYPES, VEHICLE_STATUSES, DOC_TYPES, durationDays, expiryInfo, fmtDate, fmtINR, todayISO, uid, daysLeft } from "../company";
import type { Vehicle, VehicleDoc } from "../types";
import { assignDriver, releaseDriver } from "../assign";
import { deleteVehicle, vehicleImpact } from "../remove";
import { Check, Circle, UserPlus } from "lucide-react";

const blank: Vehicle = { id: "", regNo: "", type: "Tanker", manufacturer: "", model: "", capacity: "", chassis: "", engine: "", mfgYear: "", fuel: "Diesel", status: "Available", driverId: "", purchaseDate: "", photo: "", notes: "" };

export default function Vehicles() {
  const { db, set, toast } = useStore();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [form, setForm] = useState<Vehicle | null>(null);
  const [detail, setDetail] = useState<{ id: string; tab?: string; fresh?: boolean } | null>(null);
  const detailV = db.vehicles.find((v) => v.id === detail?.id);
  const [del, setDel] = useState<Vehicle | null>(null);

  const list = db.vehicles.filter((v) =>
    (!q || [v.regNo, v.type, v.manufacturer, v.model, v.chassis].join(" ").toLowerCase().includes(q.toLowerCase())) &&
    (!statusF || v.status === statusF));

  const save = () => {
    if (!form) return;
    if (!form.regNo.trim()) return toast("Vehicle registration number is required", "error");
    if (db.vehicles.some((v) => v.id !== form.id && v.regNo.toLowerCase() === form.regNo.trim().toLowerCase())) return toast("This registration number already exists", "error");
    if (form.id) {
      set((d) => { const i = d.vehicles.findIndex((v) => v.id === form.id); if (i >= 0) d.vehicles[i] = form; d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Vehicle updated", detail: form.regNo }); });
      toast("Vehicle updated");
    } else {
      const id = uid();
      set((d) => { d.vehicles.push({ ...form, id }); d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Vehicle added", detail: form.regNo }); });
      toast("Vehicle added — now add its papers");
      setForm(null);
      setDetail({ id, tab: "Papers", fresh: true });   // straight on to papers, then driver
      return;
    }
    setForm(null);
  };

  const remove = () => {
    if (!del) return;
    set((d) => {
      deleteVehicle(d, del.id);
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Vehicle deleted", detail: del.regNo });
    });
    toast(`${del.regNo} deleted`);
    setDel(null);
  };
  const toggleActive = (v: Vehicle) => {
    const on = v.status === "Inactive";
    set((d) => {
      const x = d.vehicles.find((y) => y.id === v.id); if (x) x.status = on ? "Available" : "Inactive";
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: on ? "Vehicle activated" : "Vehicle deactivated", detail: v.regNo });
    });
    toast(`${v.regNo} ${on ? "activated" : "deactivated"}`);
  };

  return (
    <div>
      <PageHeader title="Vehicle Management" subtitle={`${db.vehicles.length} vehicles in fleet`}
        actions={<Button onClick={() => setForm({ ...blank })}><Plus className="w-4 h-4" /> Add Vehicle</Button>} />

      <Card className="p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search reg no, type, chassis…" />
        <Select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="sm:w-52">
          <option value="">All statuses</option>
          {VEHICLE_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <span className="text-xs text-gray-500 self-center sm:ml-auto">{list.length} shown</span>
      </Card>

      <Card>
        <Table headers={["Vehicle", "Type / Capacity", "Manufacturer / Model", "Assigned Driver", "Papers", "Status", "Actions"]} empty={list.length === 0}>
          {list.map((v) => {
            const driver = db.drivers.find((d) => d.id === v.driverId);
            const docs = db.vehicleDocs.filter((d) => d.vehicleId === v.id && d.status !== "Superseded");
            const worst = docs.reduce((a, d) => Math.min(a, daysLeft(d.expiryDate)), 9999);
            return (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
                      {v.photo ? <img src={v.photo} alt="" className="w-full h-full object-cover" /> : <Truck className="w-4 h-4 text-green-700" />}
                    </div>
                    <div><p className="font-semibold text-gray-900">{v.regNo}</p><p className="text-[11px] text-gray-500">{v.chassis}</p></div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{v.type} · {v.capacity}</td>
                <td className="px-3 py-2 text-xs">{v.manufacturer} {v.model}<span className="block text-[10px] text-gray-400">{v.mfgYear} · {v.fuel}</span></td>
                <td className="px-3 py-2 text-xs">{driver ? driver.name : <span className="text-gray-400">—</span>}</td>
                <td className="px-3 py-2">{worst < 0 ? <Badge cls="bg-red-100 text-red-800">Expired</Badge> : worst <= 30 ? <Badge cls="bg-amber-100 text-amber-800">{worst}d</Badge> : <Badge cls="bg-green-100 text-green-800">Valid</Badge>}</td>
                <td className="px-3 py-2">{statusBadge(v.status)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button title="View" onClick={() => setDetail({ id: v.id })} className="p-1.5 rounded hover:bg-gray-100"><Eye className="w-4 h-4 text-gray-600" /></button>
                    <button title="Edit" onClick={() => setForm({ ...v })} className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-blue-600" /></button>
                    <button title={v.status === "Inactive" ? "Activate" : "Deactivate"} onClick={() => toggleActive(v)} className="p-1.5 rounded hover:bg-gray-100"><Power className={`w-4 h-4 ${v.status === "Inactive" ? "text-green-600" : "text-amber-600"}`} /></button>
                    <button title="Delete" onClick={() => setDel(v)} className="p-1.5 rounded hover:bg-gray-100"><Trash2 className="w-4 h-4 text-red-600" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {/* form */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit Vehicle" : "Add Vehicle"} wide>
        {form && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Vehicle Registration No." required><Input value={form.regNo} onChange={(e) => setForm({ ...form, regNo: e.target.value.toUpperCase() })} placeholder="MH43CK8150" /></Field>
            <Field label="Vehicle Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Tanker Capacity (KL / MT)"><Input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="24 KL" /></Field>
            <Field label="Manufacturer"><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Tata" /></Field>
            <Field label="Model"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Prima LX 5530.S" /></Field>
            <Field label="Manufacturing Year"><Input value={form.mfgYear} onChange={(e) => setForm({ ...form, mfgYear: e.target.value })} placeholder="2021" /></Field>
            <Field label="Chassis Number"><Input value={form.chassis} onChange={(e) => setForm({ ...form, chassis: e.target.value })} /></Field>
            <Field label="Engine Number"><Input value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} /></Field>
            <Field label="Fuel Type"><Select value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value })}>{["Diesel", "CNG", "LNG", "Electric"].map((f) => <option key={f}>{f}</option>)}</Select></Field>
            <Field label="Current Status" hint="Under Maintenance blocks trip assignment"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{VEHICLE_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Assigned Driver"><Select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}><option value="">Unassigned</option>{db.drivers.filter((d) => d.status === "Active").map((d) => <option key={d.id} value={d.id}>{d.name} — {d.mobile}</option>)}</Select></Field>
            <Field label="Purchase Date"><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
            <FileField label="Vehicle Photo" value={form.photo ? "photo uploaded" : ""} onChange={(_n, data) => setForm({ ...form, photo: data })} accept="image/*" />
            <Field label="Notes" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={save}>{form.id ? "Save Changes" : "Add Vehicle"}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!del} onCancel={() => setDel(null)} onConfirm={remove} message={del ? (() => { const n = vehicleImpact(db, del.id); return `Delete ${del.regNo} permanently? This also deletes its ${n.papers} papers, ${n.maintenance} maintenance records and ${n.trips} trips. Its ${n.lrs} LRs and ${n.tccs} TCCs are kept. This cannot be undone.`; })() : ""} />

      <Modal open={!!detailV} onClose={() => setDetail(null)} title={`Vehicle ${detailV?.regNo || ""}`} wide>
        {detailV && <VehicleDetail key={detailV.id} v={detailV} onEdit={() => setForm({ ...detailV })} tab0={detail?.tab} fresh={detail?.fresh} />}
      </Modal>
    </div>
  );
}

function VehicleDetail({ v, tab0, fresh, onEdit }: { v: Vehicle; tab0?: string; fresh?: boolean; onEdit: () => void }) {
  const { db, set, toast, user } = useStore();
  const [tab, setTab] = useState(tab0 || "Details");
  const [pick, setPick] = useState("");
  const [override, setOverride] = useState(false);
  const lrs = db.lrs.filter((l) => l.vehicleId === v.id);
  const tccs = db.tccs.filter((t) => t.vehicleId === v.id);
  const [docForm, setDocForm] = useState<VehicleDoc | null>(null);
  const [docDel, setDocDel] = useState<VehicleDoc | null>(null);
  const driver = db.drivers.find((d) => d.id === v.driverId);
  const docs = db.vehicleDocs.filter((d) => d.vehicleId === v.id);
  const current = docs.filter((d) => d.status !== "Superseded");
  const hist = docs.filter((d) => d.status === "Superseded");
  const maint = db.maintenance.filter((m) => m.vehicleId === v.id);
  const trips = db.trips.filter((t) => t.vehicleId === v.id);
  const totalMaintDays = maint.reduce((a, m) => a + durationDays(m.startDate, m.actualEnd), 0);
  const totalMaintCost = maint.reduce((a, m) => a + (m.actualCost || m.estCost || 0), 0);

  const newDoc = (type?: string): VehicleDoc => ({ id: "", vehicleId: v.id, name: type ?? "Insurance", docNo: "", issueDate: todayISO(), expiryDate: "", fileName: "", fileData: "", remarks: "", status: "Current" });

  const saveDoc = () => {
    if (!docForm) return;
    const name = docForm.name.trim();
    if (!name) return toast("Type the paper name (e.g. Insurance, Fitness, Calibration)", "error");
    if (!docForm.expiryDate) return toast("Expiry date is required", "error");
    if (docForm.issueDate && docForm.expiryDate < docForm.issueDate) return toast("Expiry date must be on or after the issue date — fix the dates", "error");
    docForm.name = name;
    set((d) => {
      if (docForm.id) {
        const i = d.vehicleDocs.findIndex((x) => x.id === docForm.id);
        if (i >= 0) d.vehicleDocs[i] = docForm;
        d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Document updated", detail: `${v.regNo} — ${docForm.name}` });
      } else {
        // supersede older current doc of same type
        d.vehicleDocs.filter((x) => x.vehicleId === v.id && x.name === docForm.name && x.status !== "Superseded").forEach((x) => { x.status = "Superseded"; });
        d.vehicleDocs.push({ ...docForm, id: uid(), status: "Current" });
        d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Document uploaded/renewed", detail: `${v.regNo} — ${docForm.name} valid till ${docForm.expiryDate}` });
      }
    });
    toast("Document saved");
    setDocForm(null);
  };

  return (
    <div>
      <Confirm open={!!docDel} onCancel={() => setDocDel(null)} onConfirm={() => { if (docDel) { set((d) => { d.vehicleDocs = d.vehicleDocs.filter((x) => x.id !== docDel.id); d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Document deleted", detail: `${v.regNo} — ${docDel.name}` }); }); toast("Paper deleted"); } setDocDel(null); }} message={`Delete paper "${docDel?.name}" of ${v.regNo}?`} />
      {(fresh || !driver || current.length === 0) && (
        <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-xs">
          <p className="font-semibold text-green-900 mb-1.5">{fresh ? `${v.regNo} added — finish setting it up:` : "Setup checklist"}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <span className="flex items-center gap-1 text-green-800"><Check className="w-4 h-4" /> Vehicle details</span>
            <button onClick={() => setTab("Papers")} className={`flex items-center gap-1 ${current.length ? "text-green-800" : "text-amber-700 font-semibold"}`}>{current.length ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Papers ({current.length} added)</button>
            <button onClick={() => setTab("Driver")} className={`flex items-center gap-1 ${driver ? "text-green-800" : "text-amber-700 font-semibold"}`}>{driver ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} {driver ? `Driver: ${driver.name}` : "Assign a driver"}</button>
          </div>
        </div>
      )}
      <Tabs tabs={["Details", "Papers", "Driver", "LR & TCC", "Trips", "Maintenance"]} active={tab} onChange={setTab} />
      {tab === "Details" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2"><h4 className="text-xs font-bold uppercase text-gray-500">Vehicle</h4><Button size="sm" variant="secondary" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /> Edit vehicle</Button></div>
            <KV k="Registration" v={v.regNo} /><KV k="Type" v={v.type} /><KV k="Capacity" v={v.capacity} /><KV k="Manufacturer / Model" v={`${v.manufacturer} ${v.model}`} />
            <KV k="Chassis" v={v.chassis} /><KV k="Engine" v={v.engine} /><KV k="Mfg Year / Fuel" v={`${v.mfgYear} · ${v.fuel}`} /><KV k="Purchase Date" v={fmtDate(v.purchaseDate)} />
          </Card>
          <Card className="p-3">
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Assignment</h4>
            <KV k="Status" v={statusBadge(v.status)} /><KV k="Driver" v={driver?.name || "Unassigned"} /><KV k="Driver Mobile" v={driver?.mobile || "—"} />
            <KV k="Maintenance days (total)" v={`${totalMaintDays} days`} /><KV k="Maintenance cost (total)" v={fmtINR(totalMaintCost)} />
            <KV k="Trips" v={trips.length} /><KV k="Notes" v={v.notes || "—"} />
          </Card>
          <div className="sm:col-span-2">
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Paper validity</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {current.map((d) => { const i = expiryInfo(d.expiryDate); return (
                <div key={d.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                  <div><p className="text-xs font-semibold">{d.name}</p><p className="text-[10px] text-gray-500">{d.docNo || "—"} · exp {fmtDate(d.expiryDate)}</p></div>
                  <Badge cls={i.cls}>{i.label}</Badge>
                </div>); })}
            </div>
          </div>
        </div>
      )}

      {tab === "Papers" && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-500">Add each paper with its number, photo/PDF and expiry date. Expiry alerts come from here.</p>
            <Button size="sm" onClick={() => setDocForm(newDoc(""))}><Plus className="w-3.5 h-3.5" /> Add Paper</Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DOC_TYPES.filter((t) => t !== "Other" && !current.some((c) => c.name.toLowerCase() === t.toLowerCase())).map((t) => (
              <button key={t} onClick={() => setDocForm(newDoc(t))} className="text-xs rounded-full border border-green-300 text-green-800 px-2.5 py-1 hover:bg-green-50">+ {t}</button>
            ))}
            <button onClick={() => setDocForm(newDoc(""))} className="text-xs rounded-full border border-dashed border-gray-400 text-gray-600 px-2.5 py-1 hover:bg-gray-50">+ Other paper…</button>
          </div>
          <Table headers={["Document", "Number", "Issue", "Expiry", "Status", "File", "Actions"]} empty={current.length === 0}>
            {current.map((d) => {
              const i = expiryInfo(d.expiryDate);
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs font-semibold">{d.name}</td>
                  <td className="px-3 py-2 text-xs">{d.docNo || "—"}</td>
                  <td className="px-3 py-2 text-xs">{fmtDate(d.issueDate)}</td>
                  <td className="px-3 py-2 text-xs">{fmtDate(d.expiryDate)}</td>
                  <td className="px-3 py-2"><Badge cls={i.cls}>{i.label}</Badge></td>
                  <td className="px-3 py-2 text-xs">{d.fileData ? <a href={d.fileData} target="_blank" rel="noreferrer" className="text-green-700 underline">View</a> : <span className="text-gray-400">{d.fileName || "—"}</span>}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setDocForm({ ...newDoc(d.name), id: d.id, docNo: d.docNo, issueDate: d.issueDate, expiryDate: d.expiryDate, remarks: d.remarks, fileName: d.fileName, fileData: d.fileData })} className="text-xs rounded border border-blue-200 text-blue-700 px-2 py-0.5 hover:bg-blue-50 mr-1.5 inline-flex items-center gap-1"><Pencil className="w-3 h-3" />Edit</button>
                    <button onClick={() => setDocForm({ ...newDoc(d.name), renewedFrom: d.id, docNo: d.docNo })} className="text-xs rounded border border-green-200 text-green-700 px-2 py-0.5 hover:bg-green-50 mr-1.5">Renew</button>
                    <button onClick={() => setDocDel(d)} className="text-xs rounded border border-red-200 text-red-600 px-2 py-0.5 hover:bg-red-50 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>
                  </td>
                </tr>
              );
            })}
          </Table>
          {hist.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-1"><History className="w-3.5 h-3.5" /> Previous documents (history retained)</p>
              <div className="space-y-1">
                {hist.map((h) => <div key={h.id} className="text-[11px] text-gray-500 flex justify-between border-b border-gray-100 pb-1"><span>{h.name} · {h.docNo}</span><span>{fmtDate(h.issueDate)} → {fmtDate(h.expiryDate)}</span></div>)}
              </div>
            </div>
          )}
          <Modal open={!!docForm} onClose={() => setDocForm(null)} title="Vehicle Document">
            {docForm && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Paper name" required><Input list="vdoc-types" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} placeholder="Pick or type: Insurance, Fitness, Calibration, Form 9…" /><datalist id="vdoc-types">{DOC_TYPES.filter((t) => t !== "Other").map((d) => <option key={d} value={d} />)}</datalist></Field>
                <Field label="Paper number"><Input value={docForm.docNo} onChange={(e) => setDocForm({ ...docForm, docNo: e.target.value })} /></Field>
                <Field label="Issue Date"><Input type="date" value={docForm.issueDate} onChange={(e) => setDocForm({ ...docForm, issueDate: e.target.value })} /></Field>
                <Field label="Expiry Date" required><Input type="date" value={docForm.expiryDate} onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })} /></Field>
                <div className="sm:col-span-2"><FileField label="Photo / PDF of the paper" value={docForm.fileName} onChange={(n, data) => setDocForm({ ...docForm, fileName: n, fileData: data })} /></div>
                <Field label="Remarks" className="sm:col-span-2"><Textarea rows={2} value={docForm.remarks} onChange={(e) => setDocForm({ ...docForm, remarks: e.target.value })} /></Field>
                {docForm.expiryDate && <p className="sm:col-span-2 text-xs"><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-600" />Validity: <Badge cls={expiryInfo(docForm.expiryDate).cls}>{expiryInfo(docForm.expiryDate).label}</Badge></p>}
                <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDocForm(null)}>Cancel</Button><Button onClick={saveDoc}>Save Document</Button></div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {tab === "Driver" && (
        <div className="space-y-3">
          <Card className="p-3">
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Current driver</h4>
            {driver ? (
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div><p className="font-semibold">{driver.name}</p><p className="text-xs text-gray-500">{driver.mobile} · Licence {driver.licenceNo || "—"} {driver.licenceExpiry && <Badge cls={expiryInfo(driver.licenceExpiry).cls}>{expiryInfo(driver.licenceExpiry).label}</Badge>}</p></div>
                <Button size="sm" variant="secondary" onClick={() => { releaseDriver(set, v.id, user?.name || "Admin"); toast("Driver released from this vehicle"); }}>Release driver</Button>
              </div>
            ) : <p className="text-sm text-gray-500">No driver assigned yet.</p>}
          </Card>
          <Card className="p-3">
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">{driver ? "Change driver" : "Assign a driver"}</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Select driver…</option>
                {db.drivers.filter((d) => d.status === "Active" && d.id !== v.driverId).map((d) => <option key={d.id} value={d.id}>{d.name} · {d.mobile}{d.vehicleId ? ` (now on ${db.vehicles.find((x) => x.id === d.vehicleId)?.regNo || "another vehicle"})` : " — free"}</option>)}
              </Select>
              <Button onClick={() => { if (!pick) return toast("Select a driver first", "error"); const err = assignDriver(set, db, { driverId: pick, vehicleId: v.id, override, who: user?.name || "Admin" }); if (err) return toast(err, "error"); toast("Driver assigned"); setPick(""); setOverride(false); }}><UserPlus className="w-4 h-4" /> Assign</Button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Admin override (move a driver who is on another vehicle / vehicle under maintenance)</label>
            {db.drivers.filter((d) => d.status === "Active").length === 0 && <p className="text-xs text-amber-700 mt-2">No active drivers yet — add one in the Drivers section first.</p>}
          </Card>
        </div>
      )}

      {tab === "LR & TCC" && (
        <div className="space-y-4">
          <div><p className="text-xs font-bold uppercase text-gray-500 mb-2">Lorry receipts on {v.regNo} ({lrs.length})</p>
            <Table headers={["LR No", "Date", "Consignor → Consignee", "Goods", "Net wt", "Status"]} empty={lrs.length === 0}>
              {lrs.map((l) => <tr key={l.id}><td className="px-3 py-2 text-xs font-semibold">{l.lrNo}</td><td className="px-3 py-2 text-xs">{fmtDate(l.date)}</td><td className="px-3 py-2 text-xs">{l.consignor} → {l.consignee}</td><td className="px-3 py-2 text-xs">{l.goods}</td><td className="px-3 py-2 text-xs">{l.net}</td><td className="px-3 py-2">{statusBadge(l.status)}</td></tr>)}
            </Table></div>
          <div><p className="text-xs font-bold uppercase text-gray-500 mb-2">Cleaning certificates (TCC) ({tccs.length})</p>
            <Table headers={["TCC No", "Date", "To", "Previous cargo", "Status"]} empty={tccs.length === 0}>
              {tccs.map((t) => <tr key={t.id}><td className="px-3 py-2 text-xs font-semibold">{t.tccNo}</td><td className="px-3 py-2 text-xs">{fmtDate(t.date)}</td><td className="px-3 py-2 text-xs">{t.recipient}</td><td className="px-3 py-2 text-xs">{t.prevCargo}</td><td className="px-3 py-2">{statusBadge(t.status)}</td></tr>)}
            </Table></div>
        </div>
      )}

      {tab === "Maintenance" && (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Card className="p-3"><p className="text-[11px] text-gray-500">Total days in maintenance</p><p className="text-lg font-bold">{totalMaintDays} days</p></Card>
            <Card className="p-3"><p className="text-[11px] text-gray-500">Total maintenance expense</p><p className="text-lg font-bold">{fmtINR(totalMaintCost)}</p></Card>
          </div>
          <Table headers={["Title", "Category", "Start", "End", "Days", "Cost", "Status"]} empty={maint.length === 0}>
            {maint.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2 text-xs font-semibold">{m.title}<span className="block text-[10px] text-gray-400">{m.garage}</span></td>
                <td className="px-3 py-2 text-xs">{m.category}</td>
                <td className="px-3 py-2 text-xs">{fmtDate(m.startDate)}</td>
                <td className="px-3 py-2 text-xs">{m.actualEnd ? fmtDate(m.actualEnd) : m.expectedEnd ? fmtDate(m.expectedEnd) + "*" : "Open"}</td>
                <td className="px-3 py-2 text-xs">{durationDays(m.startDate, m.actualEnd)}</td>
                <td className="px-3 py-2 text-xs">{fmtINR(m.actualCost || m.estCost)}</td>
                <td className="px-3 py-2">{statusBadge(m.status)}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {tab === "Trips" && (
        <Table headers={["Trip", "Customer", "Route", "Freight", "Status"]} empty={trips.length === 0}>
          {trips.map((t) => (
            <tr key={t.id}><td className="px-3 py-2 text-xs font-semibold">{t.tripNo}</td><td className="px-3 py-2 text-xs">{t.customer}</td><td className="px-3 py-2 text-xs">{t.loadingLoc} → {t.unloadingLoc}</td><td className="px-3 py-2 text-xs">{fmtINR(t.totalFreight)}</td><td className="px-3 py-2">{statusBadge(t.status)}</td></tr>
          ))}
        </Table>
      )}
    </div>
  );
}
