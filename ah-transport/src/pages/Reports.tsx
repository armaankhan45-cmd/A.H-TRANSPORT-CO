import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Button, Select, Badge, Empty } from "../ui";
import { Download, FileSpreadsheet, BarChart3 } from "lucide-react";
import { durationDays, expiringDocs, fmtDate, fmtINR, netSalary, daysLeft } from "../company";
import { downloadReport } from "../pdf";
import * as XLSX from "xlsx";

export default function Reports() {
  const { db, toast } = useStore();
  const [report, setReport] = useState("Vehicle-wise Trip Report");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const v = (id: string) => db.vehicles.find((x) => x.id === id);
  const d = (id: string) => db.drivers.find((x) => x.id === id);

  const data: { headers: string[]; rows: (string | number)[][] } = useMemo(() => {
    const M = (s: string) => (s || "").slice(0, 7) === month;
    switch (report) {
      case "Vehicle-wise Trip Report":
        return { headers: ["Vehicle", "Trips", "Completed", "Freight", "Expenses", "Net"], rows: db.vehicles.map((veh) => {
          const ts = db.trips.filter((t) => t.vehicleId === veh.id);
          const fr = ts.reduce((a, t) => a + t.totalFreight, 0);
          const ex = db.expenses.filter((e) => e.vehicleId === veh.id).reduce((a, e) => a + e.amount, 0);
          return [veh.regNo, ts.length, ts.filter((t) => t.status === "Completed").length, fr, ex, fr - ex];
        }) };
      case "Driver-wise Trip Report":
        return { headers: ["Driver", "Trips", "Completed", "Freight handled", "Salary"], rows: db.drivers.map((dr) => {
          const ts = db.trips.filter((t) => t.driverId === dr.id);
          return [dr.name, ts.length, ts.filter((t) => t.status === "Completed").length, ts.reduce((a, t) => a + t.totalFreight, 0), dr.salary];
        }) };
      case "LR Register":
        return { headers: ["LR No", "Date", "Consignor", "Consignee", "Vehicle", "Goods", "Freight", "Status"], rows: db.lrs.map((l) => [l.lrNo, l.date, l.consignor, l.consignee, v(l.vehicleId)?.regNo || "-", l.goods, l.freight, l.status]) };
      case "TCC Register":
        return { headers: ["TCC No", "Date", "Recipient", "Vehicle", "On behalf of", "Prev cargo", "Driver"], rows: db.tccs.map((t) => [t.tccNo, t.date, t.recipient, v(t.vehicleId)?.regNo || "-", t.onBehalf, t.prevCargo, d(t.driverId)?.name || "-"]) };
      case "Monthly Vehicle Expenses":
        return { headers: ["Vehicle", "Diesel", "Toll", "Repair", "Other", "Total"], rows: db.vehicles.map((veh) => {
          const es = db.expenses.filter((e) => e.vehicleId === veh.id && M(e.date));
          const sum = (c: string) => es.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0);
          return [veh.regNo, sum("Diesel"), sum("Toll"), sum("Repair"), es.reduce((a, e) => a + e.amount, 0) - sum("Diesel") - sum("Toll") - sum("Repair"), es.reduce((a, e) => a + e.amount, 0)];
        }) };
      case "Maintenance Expenses":
        return { headers: ["Vehicle", "Title", "Category", "Garage", "Start", "End", "Days", "Est cost", "Actual cost", "Status"], rows: db.maintenance.map((m) => [v(m.vehicleId)?.regNo || "-", m.title, m.category, m.garage, m.startDate, m.actualEnd || "open", durationDays(m.startDate, m.actualEnd), m.estCost, m.actualCost, m.status]) };
      case "Maintenance Duration Report":
        return { headers: ["Vehicle", "Records", "Total days", "Avg days", "Longest (days)", "Total cost"], rows: db.vehicles.map((veh) => {
          const ms = db.maintenance.filter((m) => m.vehicleId === veh.id);
          const days = ms.map((m) => durationDays(m.startDate, m.actualEnd));
          return [veh.regNo, ms.length, days.reduce((a, b) => a + b, 0), ms.length ? Math.round(days.reduce((a, b) => a + b, 0) / ms.length) : 0, days.length ? Math.max(...days) : 0, ms.reduce((a, m) => a + (m.actualCost || m.estCost || 0), 0)];
        }) };
      case "Vehicle Document Expiry Report":
        return { headers: ["Vehicle", "Document", "Number", "Issue", "Expiry", "Days left", "Status"], rows: expiringDocs(db, 3650).map((x) => [v(x.doc.vehicleId)?.regNo || "-", x.doc.name, x.doc.docNo, x.doc.issueDate, x.doc.expiryDate, x.days, x.days < 0 ? "EXPIRED" : "Expiring/Valid"]) };
      case "Driver Document Expiry Report":
        return { headers: ["Driver", "Licence expiry", "Days", "Training expiry", "Days", "Status"], rows: db.drivers.map((dr) => [dr.name, dr.licenceExpiry, daysLeft(dr.licenceExpiry), dr.trainingExpiry, daysLeft(dr.trainingExpiry), Math.min(daysLeft(dr.licenceExpiry), daysLeft(dr.trainingExpiry)) < 0 ? "EXPIRED" : "OK"]) };
      case "Salary Report":
        return { headers: ["Driver", "Month", "Base", "Bonus", "Additions", "Advance", "Deductions", "Net", "Status"], rows: db.salaries.map((s) => [d(s.driverId)?.name || "-", s.month, s.base, s.bonus, s.additions, s.advance, s.deductions, netSalary(s), s.status]) };
      case "Customer-wise Transport Report":
        return { headers: ["Customer", "Trips", "Freight", "Pending", "Payment terms"], rows: db.customers.map((c) => {
          const ts = db.trips.filter((t) => t.customer === c.name);
          return [c.name, ts.length, ts.reduce((a, t) => a + t.totalFreight, 0), ts.filter((t) => t.status !== "Completed").reduce((a, t) => a + t.totalFreight, 0), c.terms];
        }) };
      case "Monthly Income & Expenses":
        return { headers: ["Month", "Trip income", "Expenses", "Salary", "Net"], rows: Array.from({ length: 6 }).map((_, i) => {
          const dt = new Date(); dt.setMonth(dt.getMonth() - i); const m = dt.toISOString().slice(0, 7);
          const inc = db.trips.filter((t) => t.status === "Completed" && M(t.unloadingDT) ).reduce((a, t) => a + t.totalFreight, 0);
          const ex = db.expenses.filter((e) => e.date.slice(0, 7) === m).reduce((a, e) => a + e.amount, 0);
          const sal = db.salaries.filter((s) => s.month === m).reduce((a, s) => a + netSalary(s), 0);
          return [m, inc, ex, sal, inc - ex - sal];
        }) };
      case "Vehicle Utilisation":
        return { headers: ["Vehicle", "Trips", "Days used (est)", "Status", "Availability %"], rows: db.vehicles.map((veh) => {
          const ts = db.trips.filter((t) => t.vehicleId === veh.id);
          const daysUsed = Math.min(30, ts.length * 3);
          return [veh.regNo, ts.length, daysUsed, veh.status, Math.round((daysUsed / 30) * 100) + "%"];
        }) };
      case "Vehicle Downtime":
        return { headers: ["Vehicle", "Maintenance days", "Open jobs", "Downtime % (30d)", "Status"], rows: db.vehicles.map((veh) => {
          const ms = db.maintenance.filter((m) => m.vehicleId === veh.id);
          const days = ms.reduce((a, m) => a + durationDays(m.startDate, m.actualEnd), 0);
          return [veh.regNo, days, ms.filter((m) => m.status === "In Progress").length, Math.min(100, Math.round((days / 30) * 100)) + "%", veh.status];
        }) };
      case "Trip Pending / Unloading Report":
        return { headers: ["Trip", "Customer", "Vehicle", "Status", "Loading", "Unloading", "Freight"], rows: db.trips.filter((t) => !["Completed", "Cancelled"].includes(t.status)).map((t) => [t.tripNo, t.customer, v(t.vehicleId)?.regNo || "-", t.status, t.loadingDT || "-", t.unloadingDT || "pending", t.totalFreight]) };
      default:
        return { headers: [], rows: [] };
    }
  }, [report, db, month]);

  const exportPDF = () => { downloadReport(report, data.headers, data.rows.map((r) => r.map(String))); toast("PDF exported"); };
  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, report.replace(/\s/g, "_") + ".xlsx");
    toast("Excel (.xlsx) exported");
  };

  const REPORTS = ["Vehicle-wise Trip Report", "Driver-wise Trip Report", "LR Register", "TCC Register", "Monthly Vehicle Expenses", "Maintenance Expenses", "Maintenance Duration Report", "Vehicle Document Expiry Report", "Driver Document Expiry Report", "Salary Report", "Customer-wise Transport Report", "Monthly Income & Expenses", "Vehicle Utilisation", "Vehicle Downtime", "Trip Pending / Unloading Report"];

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Export any register to PDF or Excel"
        actions={<><Button variant="secondary" onClick={exportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</Button><Button onClick={exportPDF}><Download className="w-4 h-4" /> PDF</Button></>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-3"><p className="text-[11px] uppercase font-semibold text-gray-500">Completed freight</p><p className="text-lg font-bold text-green-700">{fmtINR(db.trips.filter((t) => t.status === "Completed").reduce((a, t) => a + t.totalFreight, 0))}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase font-semibold text-gray-500">Total expenses</p><p className="text-lg font-bold text-red-700">{fmtINR(db.expenses.reduce((a, e) => a + e.amount, 0))}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase font-semibold text-gray-500">Maintenance cost</p><p className="text-lg font-bold text-orange-700">{fmtINR(db.maintenance.reduce((a, m) => a + (m.actualCost || m.estCost || 0), 0))}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase font-semibold text-gray-500">Expired papers</p><p className="text-lg font-bold text-red-700">{db.vehicleDocs.filter((x) => x.status !== "Superseded" && daysLeft(x.expiryDate) < 0).length}</p></Card>
      </div>

      <Card className="p-3 mb-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <BarChart3 className="w-5 h-5 text-green-700 hidden sm:block" />
        <Select value={report} onChange={(e) => setReport(e.target.value)} className="sm:w-80">{REPORTS.map((r) => <option key={r}>{r}</option>)}</Select>
        {(report === "Monthly Vehicle Expenses" || report === "Monthly Income & Expenses") && <Select value={month} onChange={(e) => setMonth(e.target.value)} className="sm:w-40">{Array.from({ length: 12 }).map((_, i) => { const dt = new Date(); dt.setMonth(dt.getMonth() - i); const m = dt.toISOString().slice(0, 7); return <option key={m} value={m}>{m}</option>; })}</Select>}
        <span className="text-xs text-gray-500 sm:ml-auto">{data.rows.length} rows</span>
      </Card>

      <Card>
        <Table headers={data.headers} empty={data.rows.length === 0}>
          {data.rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">{r.map((c, j) => <td key={j} className="px-3 py-2 text-xs whitespace-nowrap">{String(c)}</td>)}</tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
