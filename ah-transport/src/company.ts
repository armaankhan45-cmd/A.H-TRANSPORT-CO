export const COMPANY = {
  name: "A.H. TRANSPORT CO.",
  tagline: "Fleet Owners & Transport Contractors — Chemical Oil & Bulk Cargo",
  address: "Unit No. 11, 2nd Floor, 'A' Wing, Sita Estate, Aziz Baug, Chembur, Mumbai - 400074",
  email: "ahtransportco@gmail.com",
  website: "ahtransportco.com",
  gstin: "27AWAPK1208Q1ZF",
  pan: "AWAPK1208Q",
  phones: ["99876 76737", "99309 15750", "98922 74370", "96196 47420"],
};
export const VEHICLE_TYPES = ["Tanker", "Bulker", "Trailer", "Truck", "Container"];
export const VEHICLE_STATUSES = ["Available", "On Trip", "Under Maintenance", "Temporarily Unavailable", "Inactive"];
export const DOC_TYPES = ["RC Book", "Insurance", "Fitness Certificate", "PUC", "National Permit", "State Permit", "Road Tax", "Tanker Inspection Certificate", "Other"];
export const MAINT_CATS = ["Engine repair", "Gearbox repair", "Clutch", "Tyres", "Brakes", "Tanker repair", "Fabrication", "Electrical", "Accident repair", "General servicing", "Oil change", "Other"];
export const MAINT_STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"];
export const TRIP_STATUSES = ["Planned", "Vehicle Assigned", "Loading", "In Transit", "Reported", "Waiting for Unloading", "Unloaded", "Completed", "Cancelled"];
export const EXP_CATS = ["Diesel", "Toll", "Driver allowance", "Repair", "Maintenance", "Tyres", "Insurance", "Permit", "Tax", "Office expenses", "Other"];
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
export function todayISO() { return new Date().toISOString().slice(0, 10); }
export function fmtDate(d: string) { if (!d) return "—"; const x = new Date(d); return isNaN(x.getTime()) ? d : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
export function fmtINR(n: number) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
export function daysLeft(expiry: string) { if (!expiry) return 9999; const diff = Math.ceil((new Date(expiry).getTime() - new Date(todayISO()).getTime()) / 86400000); return diff; }
export function expiryInfo(expiry: string) {
  const d = daysLeft(expiry);
  if (!expiry) return { label: "No date", cls: "bg-gray-100 text-gray-700", days: d };
  if (d < 0) return { label: `Expired ${Math.abs(d)}d ago`, cls: "bg-red-100 text-red-800", days: d };
  if (d <= 7) return { label: `Expiring in ${d}d`, cls: "bg-red-100 text-red-800", days: d };
  if (d <= 15) return { label: `Expiring in ${d}d`, cls: "bg-orange-100 text-orange-800", days: d };
  if (d <= 30) return { label: `Expiring in ${d}d`, cls: "bg-amber-100 text-amber-800", days: d };
  return { label: `Valid (${d}d)`, cls: "bg-green-100 text-green-800", days: d };
}
export function durationDays(start: string, end: string) { if (!start) return 0; const s = new Date(start).getTime(); const e = end ? new Date(end).getTime() : new Date(todayISO()).getTime(); return Math.max(0, Math.round((e - s) / 86400000) + 1); }
export function netSalary(s: { base: number; bonus: number; additions: number; advance: number; deductions: number }) { return (s.base || 0) + (s.bonus || 0) + (s.additions || 0) - (s.advance || 0) - (s.deductions || 0); }
export function nextSeq(prefix: string, n: number) { return prefix + "/" + String(n).padStart(4, "0"); }

export function expiringDocs<T extends { status?: string; expiryDate: string }>(db: { vehicleDocs: T[] }, within = 30): { doc: T; days: number }[] {
  return db.vehicleDocs
    .filter((d) => d.status !== "Superseded")
    .map((doc) => ({ doc, days: daysLeft(doc.expiryDate) }))
    .filter((x) => x.days <= within)
    .sort((a, b) => a.days - b.days);
}
