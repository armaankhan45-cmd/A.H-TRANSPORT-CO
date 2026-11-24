import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Stat, Badge, statusBadge, Button, Select, Table, Empty } from "../ui";
import { Truck, Wrench, Users, FileWarning, ReceiptText, Droplets, TrendingUp, TrendingDown, Wallet, CircleDollarSign, CalendarClock, Route, Plus, ArrowRight, Activity } from "lucide-react";
import { daysLeft, durationDays, expiryInfo, fmtDate, fmtINR, netSalary, MONTHS } from "../company";

export default function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { db, user } = useStore();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [vehicleFilter, setVehicleFilter] = useState("");

  const m = useMemo(() => {
    const inMonth = (d: string) => (d || "").slice(0, 7) === month;
    const income = db.trips.filter((t) => inMonth(t.unloadingDT || t.loadingDT || "") && t.status === "Completed").reduce((a, t) => a + t.totalFreight + t.detentionCharges, 0);
    const expenses = db.expenses.filter((e) => inMonth(e.date)).reduce((a, e) => a + e.amount, 0);
    const salary = db.salaries.filter((s) => s.month === month).reduce((a, s) => a + netSalary(s), 0);
    const pending = db.trips.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").reduce((a, t) => a + t.totalFreight, 0);
    return { income, expenses, salary, pending };
  }, [db, month]);

  const active = db.vehicles.filter((v) => v.status !== "Inactive");
  const underMaint = db.vehicles.filter((v) => v.status === "Under Maintenance");
  const expiring = db.vehicleDocs.filter((d) => daysLeft(d.expiryDate) >= 0 && daysLeft(d.expiryDate) <= (db.settings.notifyDays || 30));
  const expired = db.vehicleDocs.filter((d) => daysLeft(d.expiryDate) < 0);
  const driversNoVehicle = db.drivers.filter((d) => d.status === "Active" && !d.vehicleId);
  const upcomingMaint = db.maintenance.filter((x) => x.status === "Scheduled" || x.status === "In Progress");
  const pendingSalary = db.salaries.filter((s) => s.status === "Pending");

  const vehicleAvail = db.vehicles.filter((v) => !vehicleFilter || v.regNo === vehicleFilter);

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.name.split(" ")[0]}`} subtitle="A.H. Transport Co. — fleet overview"
        actions={
          <>
            <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-40">
              {Array.from({ length: 12 }).map((_, i) => {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const val = d.toISOString().slice(0, 7);
                return <option key={val} value={val}>{MONTHS[d.getMonth()]} {d.getFullYear()}</option>;
              })}
            </Select>
            <Button onClick={() => onNavigate("lr")}><Plus className="w-4 h-4" /> New LR</Button>
            <Button variant="secondary" onClick={() => onNavigate("maintenance")}><Wrench className="w-4 h-4" /> Add Maintenance</Button>
          </>
        } />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Total Vehicles" value={db.vehicles.length} sub={`${active.length} active`} icon={<Truck className="w-5 h-5" />} tone="green" />
        <Stat label="Available Now" value={db.vehicles.filter((v) => v.status === "Available").length} sub="Ready for trips" icon={<Truck className="w-5 h-5" />} tone="blue" />
        <Stat label="Under Maintenance" value={underMaint.length} sub="Blocked for trips" icon={<Wrench className="w-5 h-5" />} tone="orange" />
        <Stat label="Expired Documents" value={expired.length} sub={`${expiring.length} expiring in ${db.settings.notifyDays}d`} icon={<FileWarning className="w-5 h-5" />} tone="red" />
        <Stat label="Total Drivers" value={db.drivers.length} sub={`${db.drivers.filter((d) => d.status === "Active").length} active`} icon={<Users className="w-5 h-5" />} tone="indigo" />
        <Stat label="Drivers Unassigned" value={driversNoVehicle.length} sub="No vehicle assigned" icon={<Users className="w-5 h-5" />} tone="gray" />
        <Stat label="LR Generated" value={db.lrs.length} sub={`${db.lrs.filter((l) => l.status === "Draft").length} drafts`} icon={<ReceiptText className="w-5 h-5" />} tone="green" />
        <Stat label="TCC Generated" value={db.tccs.length} sub="Cleaning certificates" icon={<Droplets className="w-5 h-5" />} tone="blue" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500"><TrendingUp className="w-4 h-4 text-green-600" /> MONTHLY INCOME</div>
          <p className="text-xl font-bold text-green-700 mt-1">{fmtINR(m.income)}</p>
          <p className="text-[11px] text-gray-400">Completed trips in {month}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500"><TrendingDown className="w-4 h-4 text-red-600" /> MONTHLY EXPENSES</div>
          <p className="text-xl font-bold text-red-700 mt-1">{fmtINR(m.expenses)}</p>
          <p className="text-[11px] text-gray-400">All expense heads</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500"><Wallet className="w-4 h-4 text-amber-600" /> DRIVER SALARY</div>
          <p className="text-xl font-bold text-amber-700 mt-1">{fmtINR(m.salary)}</p>
          <p className="text-[11px] text-gray-400">{pendingSalary.length} pending entries</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500"><CircleDollarSign className="w-4 h-4 text-blue-600" /> PENDING PAYMENTS</div>
          <p className="text-xl font-bold text-blue-700 mt-1">{fmtINR(m.pending)}</p>
          <p className="text-[11px] text-gray-400">Open trips freight</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-green-700" /> Vehicle Availability</h3>
            <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="!py-1 !text-xs w-44">
              <option value="">All vehicles</option>
              {db.vehicles.map((v) => <option key={v.id}>{v.regNo}</option>)}
            </Select>
          </div>
          <Table headers={["Vehicle", "Type / Capacity", "Driver", "Status", "Papers", ""]} empty={vehicleAvail.length === 0}>
            {vehicleAvail.map((v) => {
              const driver = db.drivers.find((d) => d.id === v.driverId);
              const docs = db.vehicleDocs.filter((d) => d.vehicleId === v.id);
              const worst = docs.reduce((acc, d) => Math.min(acc, daysLeft(d.expiryDate)), 9999);
              return (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-900">{v.regNo}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{v.type} · {v.capacity}</td>
                  <td className="px-3 py-2 text-xs">{driver ? driver.name : <span className="text-red-600">Unassigned</span>}</td>
                  <td className="px-3 py-2">{statusBadge(v.status)}</td>
                  <td className="px-3 py-2 text-[11px]">{worst < 0 ? <Badge cls="bg-red-100 text-red-800">Expired paper</Badge> : worst <= 30 ? <Badge cls="bg-amber-100 text-amber-800">{worst}d left</Badge> : <Badge cls="bg-green-100 text-green-800">OK</Badge>}</td>
                  <td className="px-3 py-2 text-right"><button onClick={() => onNavigate("vehicles")} className="text-green-700 hover:underline text-xs">Open</button></td>
                </tr>
              );
            })}
          </Table>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-orange-600" /> Upcoming / Active Maintenance</h3>
            {upcomingMaint.length === 0 && <Empty text="No scheduled maintenance" />}
            <div className="space-y-2">
              {upcomingMaint.map((x) => {
                const v = db.vehicles.find((y) => y.id === x.vehicleId);
                const overdue = x.status === "In Progress" && x.expectedEnd && daysLeft(x.expectedEnd) < 0;
                return (
                  <button key={x.id} onClick={() => onNavigate("maintenance")} className="w-full text-left rounded-lg border border-gray-200 p-2.5 hover:border-green-600">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-900">{v?.regNo}</span>
                      {overdue ? <Badge cls="bg-red-100 text-red-800">Overdue</Badge> : statusBadge(x.status)}
                    </div>
                    <p className="text-[11px] text-gray-600 truncate">{x.title}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(x.startDate)} → {x.actualEnd ? fmtDate(x.actualEnd) : x.expectedEnd ? fmtDate(x.expectedEnd) : "open"} · {durationDays(x.startDate, x.actualEnd)}d</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" /> Recent Activity</h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {db.audits.slice(0, 8).map((a) => (
                <div key={a.id} className="text-[11px] border-l-2 border-green-600 pl-2">
                  <p className="font-semibold text-gray-800">{a.action} <span className="font-normal text-gray-500">· {a.user}</span></p>
                  <p className="text-gray-500 truncate">{a.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2"><FileWarning className="w-4 h-4 text-red-600" /> Document Expiry Alerts</h3>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("expiry")}>View all <ArrowRight className="w-3 h-3" /></Button>
          </div>
          <div tabIndex={0} className="space-y-1.5 max-h-64 overflow-y-auto">
            {[...expired, ...expiring].slice(0, 10).map((d) => {
              const v = db.vehicles.find((x) => x.id === d.vehicleId);
              const info = expiryInfo(d.expiryDate);
              return (
                <div key={d.id} className="flex items-center justify-between gap-2 text-xs border-b border-gray-100 pb-1.5">
                  <span className="font-medium text-gray-800 truncate">{v?.regNo} — {d.name}</span>
                  <Badge cls={info.cls}>{info.label}</Badge>
                </div>
              );
            })}
            {expired.length + expiring.length === 0 && <Empty text="No expiry alerts" />}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Route className="w-4 h-4 text-blue-600" /> Live Trip Status</h3>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("trips")}>Trips <ArrowRight className="w-3 h-3" /></Button>
          </div>
          <div tabIndex={0} className="space-y-1.5 max-h-64 overflow-y-auto">
            {db.trips.filter((t) => !["Completed", "Cancelled"].includes(t.status)).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-xs border-b border-gray-100 pb-1.5">
                <span className="min-w-0"><span className="font-semibold">{t.tripNo}</span> <span className="text-gray-500">{db.vehicles.find((v) => v.id === t.vehicleId)?.regNo} · {t.material}</span></span>
                {statusBadge(t.status)}
              </div>
            ))}
            {db.trips.filter((t) => !["Completed", "Cancelled"].includes(t.status)).length === 0 && <Empty text="No open trips" />}
          </div>
        </Card>
      </div>
    </div>
  );
}
