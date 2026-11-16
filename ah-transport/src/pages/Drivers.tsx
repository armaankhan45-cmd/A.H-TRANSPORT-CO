import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Badge, Button, SearchBox, Select, Input, Field, Textarea, Modal, FileField, Tabs, KV, Stat, Empty } from "../ui";
import { Plus, Pencil, Eye, UserX, ShieldAlert, IdCard, Upload, UserCheck } from "lucide-react";
import { daysLeft, expiryInfo, fmtDate, fmtINR, todayISO, uid, netSalary } from "../company";
import type { Driver, DriverDoc } from "../types";

const blank = (): Driver => ({ id: "", name: "", mobile: "", altMobile: "", address: "", dob: "", joining: todayISO(), aadhaar: "", pan: "", licenceNo: "", licenceIssue: "", licenceExpiry: "", trainingNo: "", trainingExpiry: "", blood: "", salary: 0, emergency: "", photo: "", vehicleId: "", status: "Active", docs: "" });

const DRIVER_DOC_TYPES = ["Aadhaar Card", "PAN Card", "Driving Licence", "Hazardous Goods Training Card", "Medical Certificate", "Police Verification", "Other"];

export default function Drivers() {
  const { db, set, toast, user } = useStore();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [form, setForm] = useState<Driver | null>(null);
  const [detail, setDetail] = useState<Driver | null>(null);
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
    if (form.status !== "Active" && form.status !== "Rejoined" && form.vehicleId) return toast("Inactive/resigned drivers cannot be assigned to a vehicle.", "error");
    const occupied = db.drivers.find((x) => x.id !== form.id && x.status === "Active" && x.vehicleId === form.vehicleId && !!form.vehicleId);
    if (occupied) return toast(`${form.vehicleId ? db.vehicles.find((v) => v.id === form.vehicleId)?.regNo : "Vehicle"} is assigned to ${occupied.name}. Manage the change in Assignments.`, "error");
    const isNew = !form.id;
    const saved = { ...form, id: form.id || uid() };
    set((d) => {
      const previous = d.drivers.find((x) => x.id === saved.id);
      const oldStatus = previous?.status;
      const oldVehicleId = previous?.vehicleId || "";
      if (previous) Object.assign(previous, saved); else d.drivers.push(saved);
      if (oldVehicleId && oldVehicleId !== saved.vehicleId) {
        d.assignments.filter((a) => a.driverId === saved.id && a.vehicleId === oldVehicleId && !a.endDate).forEach((a) => { a.endDate = todayISO(); a.remarks = `${a.remarks} · Changed from driver record`.trim(); });
        const oldVehicle = d.vehicles.find((v) => v.id === oldVehicleId); if (oldVehicle?.driverId === saved.id) oldVehicle.driverId = "";
      }
      if (saved.vehicleId) {
        const vehicle = d.vehicles.find((v) => v.id === saved.vehicleId);
        if (vehicle) vehicle.driverId = saved.id;
        if (!d.assignments.some((a) => a.driverId === saved.id && a.vehicleId === saved.vehicleId && !a.endDate))
          d.assignments.unshift({ id: uid(), driverId: saved.id, vehicleId: saved.vehicleId, startDate: todayISO(), endDate: "", remarks: "Assigned from driver record" });
      }
      if (saved.status === "Inactive" || saved.status === "Resigned") {
        d.assignments.filter((a) => a.driverId === saved.id && !a.endDate).forEach((a) => { a.endDate = todayISO(); });
        const vehicle = d.vehicles.find((v) => v.driverId === saved.id); if (vehicle) vehicle.driverId = "";
        const driver = d.drivers.find((x) => x.id === saved.id); if (driver) driver.vehicleId = "";
      }
      if (oldStatus && oldStatus !== saved.status) d.driverHistory.unshift({ id: uid(), driverId: saved.id, date: todayISO(), status: saved.status, note: `Status changed ${oldStatus} → ${saved.status}` });
      if (isNew) d.driverHistory.unshift({ id: uid(), driverId: saved.id, date: saved.joining || todayISO(), status: "Active", note: "Joined company" });
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: isNew ? "Driver added" : "Driver updated", detail: saved.name });
    });
    toast(isNew ? "Driver added and linked to the selected vehicle." : "Driver saved");
    setForm(null);
  };

  const setStatus = (d0: Driver, status: string) => {
    set((d) => {
      const dr = d.drivers.find((x) => x.id === d0.id);
      if (dr) {
        const previousVehicleId = dr.vehicleId;
        dr.status = status;
        if (status === "Resigned" || status === "Inactive") {
          dr.vehicleId = "";
          const vehicle = d.vehicles.find((v) => v.id === previousVehicleId);
          if (vehicle?.driverId === d0.id) vehicle.driverId = "";
        }
      }
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
                  <button onClick={() => setDetail(d)} className="p-1.5 rounded hover:bg-gray-100" title="View"><Eye className="w-4 h-4 text-gray-600" /></button>
                  <button onClick={() => setForm({ ...d })} className="p-1.5 rounded hover:bg-gray-100" title="Edit"><Pencil className="w-4 h-4 text-blue-600" /></button>
                  {d.status === "Active" ? <button onClick={() => setStatus(d, "Inactive")} className="p-1.5 rounded hover:bg-gray-100" title="Deactivate"><UserX className="w-4 h-4 text-red-500" /></button> : <button onClick={() => setStatus(d, "Active")} className="p-1.5 rounded hover:bg-gray-100" title="Rejoin"><UserCheck className="w-4 h-4 text-green-600" /></button>}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit Driver" : "Add Driver"} wide>
        {form && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Full Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Mobile Number" required><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="98200 11111" /></Field>
            <Field label="Alternate Mobile"><Input value={form.altMobile} onChange={(e) => setForm({ ...form, altMobile: e.target.value })} /></Field>
            <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
            <Field label="Joining Date"><Input type="date" value={form.joining} onChange={(e) => setForm({ ...form, joining: e.target.value })} /></Field>
            <Field label="Blood Group"><Select value={form.blood} onChange={(e) => setForm({ ...form, blood: e.target.value })}><option value="">—</option>{["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => <option key={b}>{b}</option>)}</Select></Field>
            <Field label="Address" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Aadhaar Number" hint="Masked for non-admin roles"><Input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} placeholder="XXXX-XXXX-1234" /></Field>
            <Field label="PAN Number"><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></Field>
            <Field label="Employment Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["Active", "Inactive", "Resigned", "Rejoined"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Driving Licence No."><Input value={form.licenceNo} onChange={(e) => setForm({ ...form, licenceNo: e.target.value })} /></Field>
            <Field label="Licence Issue Date"><Input type="date" value={form.licenceIssue} onChange={(e) => setForm({ ...form, licenceIssue: e.target.value })} /></Field>
            <Field label="Licence Expiry Date"><Input type="date" value={form.licenceExpiry} onChange={(e) => setForm({ ...form, licenceExpiry: e.target.value })} /></Field>
            <Field label="Hazardous Goods Training No."><Input value={form.trainingNo} onChange={(e) => setForm({ ...form, trainingNo: e.target.value })} /></Field>
            <Field label="Training Certificate Expiry"><Input type="date" value={form.trainingExpiry} onChange={(e) => setForm({ ...form, trainingExpiry: e.target.value })} /></Field>
            <Field label="Monthly Salary (₹)"><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></Field>
            <Field label="Emergency Contact"><Input value={form.emergency} onChange={(e) => setForm({ ...form, emergency: e.target.value })} /></Field>
            <Field label="Assigned Vehicle"><Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}><option value="">Unassigned</option>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo}</option>)}</Select></Field>
            <FileField label="Profile Photo" value={form.photo ? "uploaded" : ""} onChange={(_n, d) => setForm({ ...form, photo: d })} accept="image/*" />
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save Driver</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Driver — ${detail?.name || ""}`} wide>
        {detail && <DriverDetail d={detail} />}
      </Modal>
    </div>
  );
}

function DriverDetail({ d }: { d: Driver }) {
  const { db, set, toast } = useStore();
  const [tab, setTab] = useState("Profile");
  const [docForm, setDocForm] = useState<DriverDoc | null>(null);
  const docs = db.driverDocs.filter((x) => x.driverId === d.id);
  const veh = db.vehicles.find((v) => v.id === d.vehicleId);
  const salaries = db.salaries.filter((s) => s.driverId === d.id);
  const trips = db.trips.filter((t) => t.driverId === d.id);
  const history = db.driverHistory.filter((h) => h.driverId === d.id);

  const blankDoc = (): DriverDoc => ({ id: "", driverId: d.id, name: "Aadhaar Card", docNo: "", issueDate: todayISO(), expiryDate: "", fileName: "", fileData: "", remarks: "" });
  const saveDoc = () => {
    if (!docForm) return;
    set((x) => { x.driverDocs.push({ ...docForm, id: docForm.id || uid() }); x.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: "Driver document uploaded", detail: `${d.name} — ${docForm.name}` }); });
    toast("Driver document saved securely");
    setDocForm(null);
  };

  return (
    <div>
      <Tabs tabs={["Profile", "Documents", "Status History", "Trips", "Salary"]} active={tab} onChange={setTab} />
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
          <div className="flex justify-between mb-2"><p className="text-xs text-gray-500">Private documents — access restricted to Admin roles.</p><Button size="sm" onClick={() => setDocForm(blankDoc())}><Upload className="w-3.5 h-3.5" /> Upload</Button></div>
          <Table headers={["Document", "Number", "Issue", "Expiry", "Validity", "File"]} empty={docs.length === 0}>
            {docs.map((x) => { const i = expiryInfo(x.expiryDate); return (
              <tr key={x.id}><td className="px-3 py-2 text-xs font-semibold">{x.name}</td><td className="px-3 py-2 text-xs">{x.docNo || "—"}</td><td className="px-3 py-2 text-xs">{fmtDate(x.issueDate)}</td><td className="px-3 py-2 text-xs">{fmtDate(x.expiryDate)}</td><td className="px-3 py-2"><Badge cls={i.cls}>{x.expiryDate ? i.label : "No expiry"}</Badge></td><td className="px-3 py-2 text-xs">{x.fileData ? <a className="text-green-700 underline" href={x.fileData} target="_blank" rel="noreferrer">View</a> : "—"}</td></tr>
            ); })}
          </Table>
          <Modal open={!!docForm} onClose={() => setDocForm(null)} title="Driver Document">
            {docForm && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Document Name" hint="Choose a common ID or type another"><Input list="driver-doc-types" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} /><datalist id="driver-doc-types">{DRIVER_DOC_TYPES.map((t) => <option key={t} value={t} />)}</datalist></Field>
                <Field label="Document Number"><Input value={docForm.docNo} onChange={(e) => setDocForm({ ...docForm, docNo: e.target.value })} /></Field>
                <Field label="Issue Date"><Input type="date" value={docForm.issueDate} onChange={(e) => setDocForm({ ...docForm, issueDate: e.target.value })} /></Field>
                <Field label="Expiry Date"><Input type="date" value={docForm.expiryDate} onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })} /></Field>
                <div className="sm:col-span-2"><FileField label="Upload document" value={docForm.fileName} onChange={(n, data) => setDocForm({ ...docForm, fileName: n, fileData: data })} /></div>
                <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDocForm(null)}>Cancel</Button><Button onClick={saveDoc}>Save</Button></div>
              </div>
            )}
          </Modal>
        </div>
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
