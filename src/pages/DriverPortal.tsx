import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Badge, Button, Table, Tabs, KV, Stat, FileField, Field, Input, Modal, statusBadge, Empty } from "../ui";
import { Truck, Wallet, Route, FileText, MapPin, ShieldCheck, Upload, Navigation, Lock, Droplets, Phone } from "lucide-react";
import { COMPANY, daysLeft, expiryInfo, fmtDate, fmtINR, netSalary, todayISO, uid } from "../company";
import { downloadLR, downloadTCC } from "../pdf";

export default function DriverPortal() {
  const { db, user, set, toast, firm } = useStore();
  const [tab, setTab] = useState("Overview");
  const [locModal, setLocModal] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadData, setUploadData] = useState("");

  const driver = db.drivers.find((d) => d.id === user?.driverId);
  if (!driver) return <Card className="p-6"><p className="text-sm text-gray-600">Your driver profile is not linked yet. Please contact the office.</p></Card>;

  const vehicle = db.vehicles.find((v) => v.id === driver.vehicleId);
  const docs = db.vehicleDocs.filter((d) => d.vehicleId === vehicle?.id && d.status !== "Superseded");
  const myTrips = db.trips.filter((t) => t.driverId === driver.id);
  const mySalary = db.salaries.filter((s) => s.driverId === driver.id);
  const myLRs = db.lrs.filter((l) => l.driverId === driver.id || (l.vehicleId === vehicle?.id));
  const myTCCs = db.tccs.filter((t) => t.driverId === driver.id || t.vehicleId === vehicle?.id);
  const loc = db.locations.find((l) => l.driverId === driver.id);

  const grantConsent = () => {
    if (!navigator.geolocation) { toast("This device does not support location", "error"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set((d) => {
          const existing = d.locations.find((l) => l.driverId === driver.id);
          if (existing) { existing.lat = pos.coords.latitude; existing.lng = pos.coords.longitude; existing.updated = new Date().toISOString(); existing.consent = true; }
          else d.locations.push({ driverId: driver.id, lat: pos.coords.latitude, lng: pos.coords.longitude, updated: new Date().toISOString(), consent: true });
          d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: driver.name, action: "Driver granted location consent", detail: `Shared once at ${new Date().toLocaleTimeString("en-IN")}` });
        });
        toast("Location shared with the office (one-time, with consent)");
        setLocModal(false);
      },
      (err) => toast("Location permission denied: " + err.message, "error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const revoke = () => {
    set((d) => { const l = d.locations.find((x) => x.driverId === driver.id); if (l) l.consent = false; d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: driver.name, action: "Driver revoked location consent", detail: "" }); });
    toast("Location sharing stopped");
  };

  return (
    <div>
      <PageHeader title={`Namaste, ${driver.name.split(" ")[0]}`} subtitle={`Driver App · ${vehicle ? vehicle.regNo : "No vehicle assigned"} · ${driver.mobile}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="My vehicle" value={vehicle?.regNo || "—"} sub={vehicle?.status} icon={<Truck className="w-5 h-5" />} tone="green" />
        <Stat label="My trips" value={myTrips.length} sub={`${myTrips.filter((t) => t.status === "Completed").length} completed`} icon={<Route className="w-5 h-5" />} tone="blue" />
        <Stat label="Licence" value={daysLeft(driver.licenceExpiry) < 0 ? "EXPIRED" : daysLeft(driver.licenceExpiry) + "d"} sub={fmtDate(driver.licenceExpiry)} icon={<ShieldCheck className="w-5 h-5" />} tone={daysLeft(driver.licenceExpiry) <= 30 ? "red" : "green"} />
        <Stat label="Pending salary" value={fmtINR(mySalary.filter((s) => s.status === "Pending").reduce((a, s) => a + netSalary(s), 0))} icon={<Wallet className="w-5 h-5" />} tone="amber" />
      </div>

      <Tabs tabs={["Overview", "My Vehicle & Papers", "My Trips", "My Salary", "My Documents (LR/TCC)", "Location Sharing"]} active={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2">My Profile</h3>
            <KV k="Name" v={driver.name} /><KV k="Mobile" v={driver.mobile} /><KV k="Blood group" v={driver.blood || "—"} /><KV k="Joining date" v={fmtDate(driver.joining)} /><KV k="Licence no." v={driver.licenceNo} /><KV k="Licence expiry" v={fmtDate(driver.licenceExpiry)} /><KV k="Training card expiry" v={fmtDate(driver.trainingExpiry)} />
            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1"><Lock className="w-3 h-3" /> Aadhaar/PAN and other private IDs are hidden in the driver app.</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2">Assigned Vehicle</h3>
            {vehicle ? (<>
              <KV k="Registration" v={vehicle.regNo} /><KV k="Type" v={vehicle.type} /><KV k="Capacity" v={vehicle.capacity} /><KV k="Status" v={statusBadge(vehicle.status)} /><KV k="Papers expiring" v={docs.filter((d) => daysLeft(d.expiryDate) <= 30).length} />
              <div className="mt-3 space-y-1">
                {docs.filter((d) => daysLeft(d.expiryDate) <= 30).map((d) => <div key={d.id} className="flex justify-between text-[11px]"><span>{d.name}</span><Badge cls={expiryInfo(d.expiryDate).cls}>{expiryInfo(d.expiryDate).label}</Badge></div>)}
              </div>
            </>) : <Empty text="No vehicle assigned" />}
          </Card>
          <Card className="p-4 md:col-span-2">
            <h3 className="text-sm font-semibold mb-2">Company contact</h3>
            <p className="text-xs text-gray-600">{COMPANY.name} · {COMPANY.address}</p>
            <p className="text-xs text-gray-600 flex flex-wrap gap-3 mt-1">{COMPANY.phones.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="text-green-800 font-semibold inline-flex items-center gap-1"><Phone className="w-3 h-3" />{p}</a>)}</p>
          </Card>
        </div>
      )}

      {tab === "My Vehicle & Papers" && (
        <Card className="p-4">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">Papers for {vehicle?.regNo || "—"}</h3>
            <Button size="sm" onClick={() => setDocModal(true)}><Upload className="w-3.5 h-3.5" /> Upload requested document</Button>
          </div>
          <Table headers={["Document", "Number", "Expiry", "Validity", "Status"]}>
            {docs.map((d) => <tr key={d.id}><td className="px-3 py-2 text-xs font-semibold">{d.name}</td><td className="px-3 py-2 text-xs">{d.docNo || "—"}</td><td className="px-3 py-2 text-xs">{fmtDate(d.expiryDate)}</td><td className="px-3 py-2"><Badge cls={expiryInfo(d.expiryDate).cls}>{expiryInfo(d.expiryDate).label}</Badge></td><td className="px-3 py-2 text-xs">{d.fileName ? "Uploaded" : "Pending upload"}</td></tr>)}
          </Table>
          {docs.length === 0 && <Empty text="No papers on record for this vehicle" />}
        </Card>
      )}

      {tab === "My Trips" && (
        <Card>
          <Table headers={["Trip", "Route", "Material", "Loading", "Status", "Freight"]} empty={myTrips.length === 0}>
            {myTrips.map((t) => <tr key={t.id}><td className="px-3 py-2 text-xs font-semibold">{t.tripNo}</td><td className="px-3 py-2 text-xs">{t.loadingLoc} → {t.unloadingLoc}</td><td className="px-3 py-2 text-xs">{t.material}</td><td className="px-3 py-2 text-xs">{fmtDate(t.loadingDT?.slice(0, 10) || "")}</td><td className="px-3 py-2">{statusBadge(t.status)}</td><td className="px-3 py-2 text-xs">{fmtINR(t.totalFreight)}</td></tr>)}
          </Table>
        </Card>
      )}

      {tab === "My Salary" && (
        <Card>
          <Table headers={["Month", "Base", "Bonus", "Advance", "Deductions", "Net payable", "Status", "Paid on"]} empty={mySalary.length === 0}>
            {mySalary.map((s) => <tr key={s.id}><td className="px-3 py-2 text-xs">{s.month}</td><td className="px-3 py-2 text-xs">{fmtINR(s.base)}</td><td className="px-3 py-2 text-xs">{fmtINR(s.bonus)}</td><td className="px-3 py-2 text-xs">{fmtINR(s.advance)}</td><td className="px-3 py-2 text-xs">{fmtINR(s.deductions)}</td><td className="px-3 py-2 text-xs font-bold">{fmtINR(netSalary(s))}</td><td className="px-3 py-2"><Badge cls={s.status === "Paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{s.status}</Badge></td><td className="px-3 py-2 text-xs">{s.paymentDate ? fmtDate(s.paymentDate) : "—"}</td></tr>)}
          </Table>
          <p className="p-3 text-[11px] text-gray-400">You can only see your own salary. Other drivers' records are protected by database row-level security.</p>
        </Card>
      )}

      {tab === "My Documents (LR/TCC)" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> My Lorry Receipts</h3>
            {myLRs.length === 0 && <Empty text="No LRs yet" />}
            {myLRs.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-xs">
                <span><b>{l.lrNo}</b> · {fmtDate(l.date)}<span className="block text-[10px] text-gray-500">{l.from} → {l.to}</span></span>
                <button className="text-green-700 hover:underline" onClick={() => { const d = db.drivers.find((x) => x.id === l.driverId); void downloadLR(l, vehicle, d, firm); }}>PDF</button>
              </div>
            ))}
          </Card>
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Droplets className="w-4 h-4" /> My Tanker Cleaning Certificates</h3>
            {myTCCs.length === 0 && <Empty text="No TCCs yet" />}
            {myTCCs.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-xs">
                <span><b>{t.tccNo}</b> · {fmtDate(t.date)}<span className="block text-[10px] text-gray-500">{t.prevCargo}</span></span>
                <button className="text-green-700 hover:underline" onClick={() => downloadTCC(t, vehicle, driver, firm)}>PDF</button>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "Location Sharing" && (
        <Card className="p-4 max-w-2xl">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-green-700" /> Location sharing — your choice</h3>
          <p className="text-xs text-gray-600 mb-3">The office can only see your location when you switch sharing on. You may stop sharing at any time. Location is used only for trip coordination and retained for 30 days.</p>
          <div className="rounded-lg border border-gray-200 p-3 mb-3 text-xs">
            <p><b>Status:</b> {loc?.consent ? <Badge cls="bg-green-100 text-green-800">Sharing ON</Badge> : <Badge cls="bg-gray-200 text-gray-700">Sharing OFF</Badge>}</p>
            {loc && <p className="mt-1 text-gray-500">Last updated: {new Date(loc.updated).toLocaleString("en-IN")} · {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setLocModal(true)}><Navigation className="w-4 h-4" /> Share my location now</Button>
            {loc?.consent && <Button variant="secondary" onClick={revoke}>Stop sharing</Button>}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Note: browsers cannot guarantee continuous background tracking. The Android app uses a foreground service with a visible notification for trip tracking.</p>
        </Card>
      )}

      <Modal open={locModal} onClose={() => setLocModal(false)} title="Share location with office?">
        <p className="text-sm text-gray-700 mb-3">By continuing, you consent to sharing your current GPS location with A.H. Transport Co. office while this trip is active. You can stop sharing at any time from the Location Sharing tab.</p>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setLocModal(false)}>Cancel</Button><Button onClick={grantConsent}>I consent — share</Button></div>
      </Modal>

      <Modal open={docModal} onClose={() => setDocModal(false)} title="Upload requested vehicle document">
        <div className="space-y-3">
          <Field label="Document name"><Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="e.g. PUC renewed copy" /></Field>
          <FileField label="Photo / PDF" value={uploadData ? "selected" : ""} onChange={(_n, data) => setUploadData(data)} />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDocModal(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!uploadName || !uploadData) return toast("Select a document name and file", "error");
              set((d) => {
                d.vehicleDocs.push({ id: uid(), vehicleId: vehicle?.id || "", name: uploadName, docNo: "", issueDate: todayISO(), expiryDate: "", fileName: uploadName + ".jpg", fileData: uploadData, remarks: `Uploaded by driver ${driver.name}`, status: "Current" });
                d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: driver.name, action: "Driver uploaded vehicle document", detail: `${vehicle?.regNo} — ${uploadName}` });
              });
              toast("Uploaded — pending office verification");
              setDocModal(false); setUploadName(""); setUploadData("");
            }}>Upload</Button></div>
        </div>
      </Modal>
    </div>
  );
}
