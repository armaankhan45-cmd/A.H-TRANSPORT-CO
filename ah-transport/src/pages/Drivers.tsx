import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, SearchBox, Select, Input, Field, Textarea, Modal, Confirm, FileField, Tabs, KV, Stat, Empty } from "../ui";
import { Plus, Pencil, Trash2, Eye, UserX, ShieldAlert, IdCard, Upload, UserCheck, Check, Circle, Truck } from "lucide-react";
import TrackActions from "../components/TrackActions";
import { assignDriver, releaseDriver } from "../assign";
import { deleteDriver, driverImpact } from "../remove";
import { daysLeft, expiryInfo, fmtDate, fmtINR, todayISO, uid, netSalary } from "../company";
import type { DB, Driver, DriverDoc } from "../types";

const blank = (): Driver => ({ id: "", name: "", mobile: "", altMobile: "", address: "", dob: "", joining: todayISO(), aadhaar: "", pan: "", licenceNo: "", licenceIssue: "", licenceExpiry: "", trainingNo: "", trainingExpiry: "", blood: "", salary: 0, emergency: "", photo: "", vehicleId: "", status: "Active", docs: "" });

/** Adds or updates a driver paper (matched by name) so the form, the document list and the driver record stay in step. */
function upsertDoc(d: DB, driverId: string, name: string, docNo: string, issue: string, expiry: string, img: { name: string; data: string } | null) {
  const ex = d.driverDocs.find((x) => x.driverId === driverId && x.name === name);
  if (ex) { if (docNo) ex.docNo = docNo; if (issue) ex.issueDate = issue; if (expiry) ex.expiryDate = expiry; if (img) { ex.fileName = img.name; ex.fileData = img.data; } }
  else if (docNo || img) d.driverDocs.push({ id: uid(), driverId, name, docNo, issueDate: issue, expiryDate: expiry, fileName: img?.name || "", fileData: img?.data || "", remarks: "" });
}

const DRIVER_DOC_TYPES = ["Aadhaar Card", "PAN Card", "Driving Licence", "Hazardous Goods Training Card", "Medical Certificate", "Police Verification", "Other"];

export default function Drivers() {
  const { db, set, toast, user } = useStore();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [form, setForm] = useState<Driver | null>(null);
  const [detail, setDetail] = useState<{ id: string; tab?: string; fresh?: boolean } | null>(null);
  const detailD = db.drivers.find((x) => x.id === detail?.id);
  const [aadhaarImg, setAadhaarImg] = useState<{ name: string; data: string } | null>(null);
  const [licImg, setLicImg] = useState<{ name: string; data: string } | null>(null);
  const closeForm = () => { setForm(null); setAadhaarImg(null); setLicImg(null); };
  const [showSensitive, setShowSensitive] = useState(false);

  const canSeeSensitive = user?.role === "Super Admin" || user?.role === "Admin";

  const list = db.drivers.filter((d) =>
    (!q || [d.name, d.mobile, d.licenceNo].join(" ").toLowerCase().includes(q.toLowerCase())) &&
    (!statusF || d.status === statusF));

  const save = () => {
    if (!form) return;
    if (!form.name.trim()) return toast("Driver name is required", "error");
    if (!/^\d{10}$/.test(form.mobile.replace(/\s/g, ""))) return toast("Enter a valid 10-digit mobile number", "error");
    if (form.licenceExpiry && form.licenceExpiry < todayISO()) toast("Warning: licence already expired", "error");
    const newId = form.id || uid();
    set((d) => {
      upsertDoc(d, newId, "Aadhaar Card", form.aadhaar, "", "", aadhaarImg);
      upsertDoc(d, newId, "Driving Licence", form.licenceNo, form.licenceIssue, form.licenceExpiry, licImg);
      if (form.id) {
        const i = d.drivers.findIndex((x) => x.id === form.id);
        const old = i >= 0 ? d.drivers[i] : null;
        if (i >= 0) d.drivers[i] = form;
        if (old && old.status !== form.status) d.driverHistory.unshift({ id: uid(), driverId: form.id, date: todayISO(), status: form.status, note: `Status changed ${old.status} → ${form.status}` });
        d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "Driver updated", detail: form.name });
      } else {
        const id = newId;
        d.drivers.push({ ...form, id });
        d.driverHistory.unshift({ id: uid(), driverId: id, date: form.joining || todayISO(), status: "Active", note: "Joined company" });
        d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "Driver added", detail: form.name });
      }
    });
    const isNew = !form.id;
    toast(isNew ? "Driver added — now add documents and assign a vehicle" : "Driver saved");
    closeForm();
    if (isNew) setDetail({ id: newId, tab: "Documents", fresh: true });
  };

  const [del, setDel] = useState<Driver | null>(null);
  const removeDriver = () => {
    if (!del) return;
    set((d) => { deleteDriver(d, del.id); d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "Driver deleted", detail: del.name }); });
    toast(`${del.name} deleted`);
    setDel(null);
  };

  const setStatus = (d0: Driver, status: string) => {
    set((d) => {
      const dr = d.drivers.find((x) => x.id === d0.id);
      if (dr) { dr.status = status; if (status === "Resigned" || status === "Inactive") dr.vehicleId = ""; }
      d.driverHistory.unshift({ id: uid(), driverId: d0.id, date: todayISO(), status, note: `Marked ${status}` });
      d.assignments.filter((a) => a.driverId === d0.id && !a.endDate).forEach((a) => { a.endDate = todayISO(); });
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "Driver status changed", detail: `${d0.name} → ${status}` });
    });
    toast(`${d0.name} marked ${status}`);
  };

  return (
    <div>
      <PageHeader title="Driver Management" subtitle="Driver database, licences, hazard training & document expiry"
        actions={<Button onClick={() => setForm(blank())}><Plus className="w-4 h-4" /> Add Driver</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Total drivers" value={db.drivers.length} icon={<UserCheck className="w-5 h-5" />} tone="green" />
        <Stat label="Active" value={db.drivers.filter((d) => d.status === "Active").length} tone="blue" />
        <Stat label="Unassigned" value={db.drivers.filter((d) => d.status === "Active" && !d.vehicleId).length} tone="gray" />
        <Stat label="Licence/training expiring ≤30d" value={db.drivers.filter((d) => daysLeft(d.licenceExpiry) <= 30 || daysLeft(d.trainingExpiry) <= 30).length} icon={<ShieldAlert className="w-5 h-5" />} tone="red" />
      </div>

      <Card className="p-3 mb-3 flex flex-col sm:flex-row gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, mobile, licence…" />
        <Select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="sm:w-52"><option value="">All statuses</option>{["Active", "Inactive", "Resigned", "Rejoined"].map((s) => <option key={s}>{s}</option>)}</Select>
        {canSeeSensitive && <button onClick={() => setShowSensitive((v) => !v)} className="sm:ml-auto text-xs text-green-800 font-semibold hover:underline">{showSensitive ? "Hide" : "Show"} Aadhaar/PAN</button>}
      </Card>

      <Card>
        <Table headers={["Driver", "Mobile", "Licence", "Licence Expiry", "Training Expiry", "Vehicle", "Salary", "Status", "Actions"]} empty={list.length === 0}>
          {list.map((d) => {
            const veh = db.vehicles.find((v) => v.id === d.vehicleId);
            const li = expiryInfo(d.licenceExpiry), ti = expiryInfo(d.trainingExpiry);
            return (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0">
                      {d.photo ? <img src={d.photo} alt="" className="w-full h-full object-cover" /> : d.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                    </div>
                    <div><p className="font-semibold text-xs text-gray-900">{d.name}</p><p className="text-[10px] text-gray-500">{canSeeSensitive && showSensitive ? `Aadhaar ${d.aadhaar} · PAN ${d.pan}` : "Sensitive ID hidden"}</p></div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{d.mobile}</td>
                <td className="px-3 py-2 text-xs">{d.licenceNo}</td>
                <td className="px-3 py-2"><Badge cls={li.cls}>{li.label}</Badge></td>
                <td className="px-3 py-2"><Badge cls={ti.cls}>{ti.label}</Badge></td>
                <td className="px-3 py-2 text-xs">{veh?.regNo || <span className="text-amber-700">Unassigned</span>}</td>
                <td className="px-3 py-2 text-xs">{fmtINR(d.salary)}</td>
                <td className="px-3 py-2"><Badge cls={d.status === "Active" ? "bg-green-100 text-green-800" : d.status === "Resigned" ? "bg-red-100 text-red-800" : "bg-gray-200 text-gray-700"}>{d.status}</Badge></td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => setDetail({ id: d.id })} className="p-1.5 rounded hover:bg-gray-100" title="View"><Eye className="w-4 h-4 text-gray-600" /></button>
                  <button onClick={() => setForm({ ...d })} className="p-1.5 rounded hover:bg-gray-100" title="Edit"><Pencil className="w-4 h-4 text-blue-600" /></button>
                  {d.status === "Active" ? <button onClick={() => setStatus(d, "Inactive")} className="p-1.5 rounded hover:bg-gray-100" title="Deactivate"><UserX className="w-4 h-4 text-red-500" /></button> : <button onClick={() => setStatus(d, "Active")} className="p-1.5 rounded hover:bg-gray-100" title="Activate"><UserCheck className="w-4 h-4 text-green-600" /></button>}
                  <button onClick={() => setDel(d)} className="p-1.5 rounded hover:bg-gray-100" title="Delete"><Trash2 className="w-4 h-4 text-red-600" /></button>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      <Confirm open={!!del} onCancel={() => setDel(null)} onConfirm={removeDriver} message={del ? (() => { const n = driverImpact(db, del.id); return `Delete ${del.name} permanently? This also deletes their ${n.papers} documents and ${n.salaries} salary records. Trips and LR/TCC copies are kept. This cannot be undone.`; })() : ""} />

      <Modal open={!!form} onClose={closeForm} title={form?.id ? "Edit Driver" : "Add Driver"} wide>
        {form && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Full Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Mobile Number" required><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="98200 11111" /></Field>
            <Field label="Alternate Mobile"><Input value={form.altMobile} onChange={(e) => setForm({ ...form, altMobile: e.target.value })} /></Field>
            <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
            <Field label="Joining Date"><Input type="date" value={form.joining} onChange={(e) => setForm({ ...form, joining: e.target.value })} /></Field>
            <Field label="Blood Group"><Select value={form.blood} onChange={(e) => setForm({ ...form, blood: e.target.value })}><option value="">—</option>{["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => <option key={b}>{b}</option>)}</Select></Field>
            <Field label="Address" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <FileField label="Aadhaar card photo" value={aadhaarImg?.name || ""} onChange={(n, data) => setAadhaarImg({ name: n, data })} />
            <Field label="Aadhaar Number" hint="Masked for non-admin roles"><Input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} placeholder="XXXX-XXXX-1234" /></Field>
            <Field label="PAN Number"><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></Field>
            <Field label="Employment Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["Active", "Inactive", "Resigned", "Rejoined"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Driving Licence No."><Input value={form.licenceNo} onChange={(e) => setForm({ ...form, licenceNo: e.target.value })} /></Field>
            <Field label="Licence Issue Date"><Input type="date" value={form.licenceIssue} onChange={(e) => setForm({ ...form, licenceIssue: e.target.value })} /></Field>
            <Field label="Licence Expiry Date"><Input type="date" value={form.licenceExpiry} onChange={(e) => setForm({ ...form, licenceExpiry: e.target.value })} /></Field>
            <Field label="Hazardous Goods Training No."><Input value={form.trainingNo} onChange={(e) => setForm({ ...form, trainingNo: e.target.value })} /></Field>
            <FileField label="Licence photo" value={licImg?.name || ""} onChange={(n, data) => setLicImg({ name: n, data })} />
            <Field label="Training Certificate Expiry"><Input type="date" value={form.trainingExpiry} onChange={(e) => setForm({ ...form, trainingExpiry: e.target.value })} /></Field>
            <Field label="Monthly Salary (₹)"><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></Field>
            <Field label="Emergency Contact"><Input value={form.emergency} onChange={(e) => setForm({ ...form, emergency: e.target.value })} /></Field>
            <Field label="Assigned Vehicle"><Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}><option value="">Unassigned</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo}</option>)}</Select></Field>
            <FileField label="Profile Photo" value={form.photo ? "uploaded" : ""} onChange={(_n, d) => setForm({ ...form, photo: d })} accept="image/*" />
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2"><Button variant="secondary" onClick={closeForm}>Cancel</Button><Button onClick={save}>Save Driver</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={!!detailD} onClose={() => setDetail(null)} title={`Driver — ${detailD?.name || ""}`} wide>
        {detailD && <DriverDetail key={detailD.id} d={detailD} tab0={detail?.tab} fresh={detail?.fresh} />}
      </Modal>
    </div>
  );
}

function DriverDetail({ d, tab0, fresh }: { d: Driver; tab0?: string; fresh?: boolean }) {
  const { db, set, toast, user } = useStore();
  const [tab, setTab] = useState(tab0 || "Profile");
  const [pickV, setPickV] = useState("");
  const [override, setOverride] = useState(false);
  const myVeh = (vid: string) => db.vehicles.find((v) => v.id === vid);
  const lrs = db.lrs.filter((l) => l.driverId === d.id || (!l.driverId && myVeh(l.vehicleId)?.driverId === d.id));
  const tccs = db.tccs.filter((t) => t.driverId === d.id || (!t.driverId && myVeh(t.vehicleId)?.driverId === d.id));
  const [docForm, setDocForm] = useState<DriverDoc | null>(null);
  const docs = db.driverDocs.filter((x) => x.driverId === d.id);
  const veh = db.vehicles.find((v) => v.id === d.vehicleId);
  const salaries = db.salaries.filter((s) => s.driverId === d.id);
  const trips = db.trips.filter((t) => t.driverId === d.id);
  const history = db.driverHistory.filter((h) => h.driverId === d.id);

  const blankDoc = (type = ""): DriverDoc => ({ id: "", driverId: d.id, name: type,
    docNo: type === "Aadhaar Card" ? d.aadhaar : type === "Driving Licence" ? d.licenceNo : "", issueDate: type === "Driving Licence" ? d.licenceIssue : todayISO(),
    expiryDate: type === "Driving Licence" ? d.licenceExpiry : "", fileName: "", fileData: "", remarks: "" });
  const saveDoc = () => {
    if (!docForm) return;
    const name = docForm.name.trim();
    if (!name) return toast("Type the document name (e.g. Aadhaar Card, Licence)", "error");
    set((x) => {
      upsertDoc(x, d.id, name, docForm.docNo, docForm.issueDate, docForm.expiryDate, docForm.fileData ? { name: docForm.fileName, data: docForm.fileData } : null);
      const dr = x.drivers.find((y) => y.id === d.id);   // keep the driver record in step with its papers
      if (dr && name === "Aadhaar Card" && docForm.docNo) dr.aadhaar = docForm.docNo;
      if (dr && name === "Driving Licence") { if (docForm.docNo) dr.licenceNo = docForm.docNo; if (docForm.issueDate) dr.licenceIssue = docForm.issueDate; if (docForm.expiryDate) dr.licenceExpiry = docForm.expiryDate; }
      x.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Driver document uploaded", detail: `${d.name} — ${docForm.name}` }); });
    toast("Driver document saved");
    setDocForm(null);
  };

  return (
    <div>
      {(() => {
        const has = (n: string) => docs.find((x) => x.name === n);
        const aad = has("Aadhaar Card"), lic = has("Driving Licence");
        const items: [boolean, string, string][] = [
          [!!(aad?.docNo && aad?.fileData), "Aadhaar (no. + photo)", "Documents"], [!!(lic?.docNo && lic?.fileData), "Licence (no. + photo)", "Documents"],
          [!!veh, veh ? `Vehicle: ${veh.regNo}` : "Assign a vehicle", "Vehicle"], [!!d.trackToken, "Location link sent", "Tracking"]];
        if (!fresh && items.every((i) => i[0])) return null;
        return (
          <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-xs">
            <p className="font-semibold text-green-900 mb-1.5">{fresh ? `${d.name} added — finish setting up:` : "Setup checklist"}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">{items.map(([ok, label, t]) => (
              <button key={label} onClick={() => setTab(t)} className={`flex items-center gap-1 ${ok ? "text-green-800" : "text-amber-700 font-semibold"}`}>{ok ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} {label}</button>))}</div>
          </div>);
      })()}
      <Tabs tabs={["Profile", "Documents", "Vehicle", "LR & TCC", "Tracking", "Trips", "Salary", "Status History"]} active={tab} onChange={setTab} />
      {tab === "Profile" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Card className="p-3"><h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Personal</h4>
            <KV k="Name" v={d.name} /><KV k="Mobile" v={d.mobile} /><KV k="Alternate" v={d.altMobile || "—"} /><KV k="Date of birth" v={fmtDate(d.dob)} /><KV k="Blood group" v={d.blood || "—"} /><KV k="Address" v={d.address || "—"} /><KV k="Emergency contact" v={d.emergency || "—"} />
          </Card>
          <Card className="p-3"><h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Employment & Documents</h4>
            <KV k="Joining date" v={fmtDate(d.joining)} /><KV k="Status" v={d.status} /><KV k="Assigned vehicle" v={veh?.regNo || "Unassigned"} /><KV k="Monthly salary" v={fmtINR(d.salary)} />
            <KV k="Aadhaar" v={d.aadhaar || "—"} /><KV k="PAN" v={d.pan || "—"} /><KV k="Licence" v={`${d.licenceNo} (exp ${fmtDate(d.licenceExpiry)})`} /><KV k="Hazmat training" v={`${d.trainingNo || "—"} (exp ${fmtDate(d.trainingExpiry)})`} />
          </Card>
        </div>
      )}
      {tab === "Documents" && (
        <div>
          <div className="flex justify-between mb-2"><p className="text-xs text-gray-500">Number + photo + expiry for each paper. Private — Admin roles only.</p><Button size="sm" onClick={() => setDocForm(blankDoc())}><Plus className="w-3.5 h-3.5" /> Add document</Button></div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DRIVER_DOC_TYPES.filter((t) => t !== "Other" && !docs.some((x) => x.name === t)).map((t) => <button key={t} onClick={() => setDocForm(blankDoc(t))} className="text-xs rounded-full border border-green-300 text-green-800 px-2.5 py-1 hover:bg-green-50">+ {t}</button>)}
            <button onClick={() => setDocForm(blankDoc(""))} className="text-xs rounded-full border border-dashed border-gray-400 text-gray-600 px-2.5 py-1 hover:bg-gray-50">+ Other…</button>
          </div>
          <Table headers={["Document", "Number", "Issue", "Expiry", "Validity", "File"]} empty={docs.length === 0}>
            {docs.map((x) => { const i = expiryInfo(x.expiryDate); return (
              <tr key={x.id}><td className="px-3 py-2 text-xs font-semibold">{x.name}</td><td className="px-3 py-2 text-xs">{x.docNo || "—"}</td><td className="px-3 py-2 text-xs">{fmtDate(x.issueDate)}</td><td className="px-3 py-2 text-xs">{fmtDate(x.expiryDate)}</td><td className="px-3 py-2"><Badge cls={i.cls}>{x.expiryDate ? i.label : "No expiry"}</Badge></td><td className="px-3 py-2 text-xs">{x.fileData ? <a className="text-green-700 underline" href={x.fileData} target="_blank" rel="noreferrer">View</a> : "—"}</td></tr>
            ); })}
          </Table>
          <Modal open={!!docForm} onClose={() => setDocForm(null)} title="Driver Document">
            {docForm && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Document name" required><Input list="ddoc-types" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} placeholder="Aadhaar Card, Driving Licence, …" /><datalist id="ddoc-types">{DRIVER_DOC_TYPES.filter((t) => t !== "Other").map((t) => <option key={t} value={t} />)}</datalist></Field>
                <Field label="Number"><Input value={docForm.docNo} onChange={(e) => setDocForm({ ...docForm, docNo: e.target.value })} /></Field>
                <Field label="Issue Date"><Input type="date" value={docForm.issueDate} onChange={(e) => setDocForm({ ...docForm, issueDate: e.target.value })} /></Field>
                <Field label="Expiry Date"><Input type="date" value={docForm.expiryDate} onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })} /></Field>
                <div className="sm:col-span-2"><FileField label="Photo / PDF" value={docForm.fileName} onChange={(n, data) => setDocForm({ ...docForm, fileName: n, fileData: data })} /></div>
                <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDocForm(null)}>Cancel</Button><Button onClick={saveDoc}>Save</Button></div>
              </div>
            )}
          </Modal>
        </div>
      )}
      {tab === "Vehicle" && (
        <div className="space-y-3">
          <Card className="p-3">
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Current vehicle</h4>
            {veh ? <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-green-700" /> {veh.regNo} <span className="text-xs font-normal text-gray-500">{veh.type} · {veh.capacity}</span></p>
              <Button size="sm" variant="secondary" onClick={() => { releaseDriver(set, veh.id, user?.name || "Admin"); toast("Vehicle released"); }}>Release vehicle</Button></div> : <p className="text-sm text-gray-500">No vehicle assigned.</p>}
          </Card>
          <Card className="p-3">
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">{veh ? "Change vehicle" : "Assign a vehicle"}</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={pickV} onChange={(e) => setPickV(e.target.value)}>
                <option value="">Select vehicle…</option>
                {db.vehicles.filter((v) => v.status !== "Inactive" && v.id !== d.vehicleId).map((v) => <option key={v.id} value={v.id}>{v.regNo} · {v.type}{v.driverId ? ` (driver: ${db.drivers.find((x) => x.id === v.driverId)?.name || "—"})` : " — free"}{v.status === "Under Maintenance" ? " · maintenance" : ""}</option>)}
              </Select>
              <Button onClick={() => { if (!pickV) return toast("Select a vehicle first", "error"); const err = assignDriver(set, db, { driverId: d.id, vehicleId: pickV, override, who: user?.name || "Admin" }); if (err) return toast(err, "error"); toast("Vehicle assigned"); setPickV(""); setOverride(false); }}>Assign</Button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Admin override</label>
          </Card>
        </div>
      )}
      {tab === "LR & TCC" && (
        <div className="space-y-4">
          <div><p className="text-xs font-bold uppercase text-gray-500 mb-2">Lorry receipts ({lrs.length})</p>
            <Table headers={["LR No", "Date", "Vehicle", "Consignor → Consignee", "Goods", "Status"]} empty={lrs.length === 0}>
              {lrs.map((l) => <tr key={l.id}><td className="px-3 py-2 text-xs font-semibold">{l.lrNo}</td><td className="px-3 py-2 text-xs">{fmtDate(l.date)}</td><td className="px-3 py-2 text-xs">{myVeh(l.vehicleId)?.regNo}</td><td className="px-3 py-2 text-xs">{l.consignor} → {l.consignee}</td><td className="px-3 py-2 text-xs">{l.goods}</td><td className="px-3 py-2 text-xs">{l.status}</td></tr>)}
            </Table></div>
          <div><p className="text-xs font-bold uppercase text-gray-500 mb-2">Cleaning certificates ({tccs.length})</p>
            <Table headers={["TCC No", "Date", "Vehicle", "To", "Previous cargo"]} empty={tccs.length === 0}>
              {tccs.map((t) => <tr key={t.id}><td className="px-3 py-2 text-xs font-semibold">{t.tccNo}</td><td className="px-3 py-2 text-xs">{fmtDate(t.date)}</td><td className="px-3 py-2 text-xs">{myVeh(t.vehicleId)?.regNo}</td><td className="px-3 py-2 text-xs">{t.recipient}</td><td className="px-3 py-2 text-xs">{t.prevCargo}</td></tr>)}
            </Table></div>
        </div>
      )}
      {tab === "Tracking" && (
        <Card className="p-4 space-y-3">
          <p className="text-sm">Send {d.name.split(" ")[0]} a private link on WhatsApp. When they open it and tap <b>Allow</b>, their phone shares its location with you. Nothing is collected before that, and they can stop any time.</p>
          <TrackActions driver={d} />
          <p className="text-xs text-gray-500">The driver does not need a login. Sharing works while the link page stays open on their phone.</p>
        </Card>
      )}
      {tab === "Status History" && (
        <div>
          {history.length === 0 && <Empty text="No status history yet" />}
          {history.map((h) => <div key={h.id} className="text-xs flex gap-2 border-b border-gray-100 py-1.5"><span className="font-semibold w-24 shrink-0">{fmtDate(h.date)}</span><Badge cls="bg-gray-100 text-gray-700">{h.status}</Badge><span className="text-gray-600">{h.note}</span></div>)}
        </div>
      )}
      {tab === "Trips" && <Table headers={["Trip", "Customer", "Route", "Freight", "Status"]} empty={trips.length === 0}>{trips.map((t) => <tr key={t.id}><td className="px-3 py-2 text-xs font-semibold">{t.tripNo}</td><td className="px-3 py-2 text-xs">{t.customer}</td><td className="px-3 py-2 text-xs">{t.loadingLoc} → {t.unloadingLoc}</td><td className="px-3 py-2 text-xs">{fmtINR(t.totalFreight)}</td><td className="px-3 py-2 text-xs">{t.status}</td></tr>)}</Table>}
      {tab === "Salary" && <Table headers={["Month", "Base", "Net payable", "Status"]} empty={salaries.length === 0}>{salaries.map((s) => <tr key={s.id}><td className="px-3 py-2 text-xs">{s.month}</td><td className="px-3 py-2 text-xs">{fmtINR(s.base)}</td><td className="px-3 py-2 text-xs font-semibold">{fmtINR(netSalary(s))}</td><td className="px-3 py-2"><Badge cls={s.status === "Paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{s.status}</Badge></td></tr>)}</Table>}
    </div>
  );
}
