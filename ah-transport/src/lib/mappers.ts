/** Maps between the app's camelCase records and the Supabase (snake_case) rows. */
import type { DB, Role } from "../types";
import { VEHICLE_STATUSES, MAINT_STATUSES, TRIP_STATUSES } from "../company";
import type { Bucket } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export const slug = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, "_");
const fromEnum = (v: string | null | undefined, list: string[], fb: string) => list.find((l) => slug(l) === v) ?? fb;
const nn = (v: unknown) => (v === "" || v === undefined || v === null ? null : v);
const num = (v: unknown) => (v === "" || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v));
const n0 = (v: unknown) => num(v) ?? 0;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const toTs = (v: string) => (v ? new Date(v).toISOString() : null);
const pad = (n: number) => String(n).padStart(2, "0");
const fromTs = (v: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMP = ["Active", "Inactive", "Resigned", "Rejoined"];
const SAL = ["Pending", "Paid"];
const DOCS = ["Current", "Superseded"];
const LRS = ["Draft", "Final", "Cancelled"];

export const ROLE_TO_DB: Record<Role, string> = {
  "Super Admin": "super_admin", "Admin": "admin", "Office Staff": "office_staff", "Accounts Staff": "accounts_staff", "Driver": "driver",
};
export const ROLE_FROM_DB = Object.fromEntries(Object.entries(ROLE_TO_DB).map(([k, v]) => [v, k])) as Record<string, Role>;

export type CollKey = Exclude<keyof DB, "seq" | "settings" | "users" | "locations" | "audits">;

export interface Coll {
  key: CollKey;
  table: string;
  createdBy?: boolean;               // table has created_by
  seq?: { prefix: "LR" | "TCC" | "TRIP"; field: string; col: string; seqKey: "lr" | "tcc" | "trip" };
  fromRow: (r: Any) => Any;
  toRow: (i: Any) => Any;
}

/** Files that live in private storage. App field holds data: URL / signed URL; DB holds the path. */
export interface FileField { field: string; bucket: Bucket; folder: (i: Any) => string }
export const FILE_FIELDS: Partial<Record<CollKey, FileField[]>> = {
  vehicles: [{ field: "photo", bucket: "photos", folder: (i) => `vehicles/${i.id}` }],
  vehicleDocs: [{ field: "fileData", bucket: "vehicle-docs", folder: (i) => i.vehicleId }],
  drivers: [{ field: "photo", bucket: "photos", folder: (i) => `drivers/${i.id}` }],
  driverDocs: [{ field: "fileData", bucket: "driver-docs", folder: (i) => i.driverId }],
  maintenance: [
    { field: "invoice", bucket: "invoices", folder: (i) => `maintenance/${i.id}` },
    { field: "beforePhotos", bucket: "photos", folder: (i) => `maintenance/${i.id}` },
    { field: "afterPhotos", bucket: "photos", folder: (i) => `maintenance/${i.id}` },
  ],
  expenses: [{ field: "receipt", bucket: "receipts", folder: (i) => `expenses/${i.id}` }],
};

// Order matters: parents before children (foreign keys).
export const COLLS: Coll[] = [
  {
    key: "drivers", table: "drivers", createdBy: true,
    fromRow: (r) => ({
      id: r.id, name: r.full_name, mobile: s(r.mobile), altMobile: s(r.alt_mobile), address: s(r.address), dob: s(r.date_of_birth),
      joining: s(r.joining_date), aadhaar: s(r.aadhaar_no), pan: s(r.pan_no), licenceNo: s(r.licence_no), licenceIssue: s(r.licence_issue),
      licenceExpiry: s(r.licence_expiry), trainingNo: s(r.training_no), trainingExpiry: s(r.training_expiry), blood: s(r.blood_group),
      salary: n0(r.monthly_salary), emergency: s(r.emergency_contact), photo: s(r.photo_path), vehicleId: "", status: fromEnum(r.status, EMP, "Active"), docs: "",
    }),
    toRow: (i) => ({
      id: i.id, full_name: i.name, mobile: String(i.mobile || "").replace(/\D/g, ""), alt_mobile: nn(i.altMobile), address: nn(i.address),
      date_of_birth: nn(i.dob), joining_date: nn(i.joining) ?? undefined, aadhaar_no: nn(i.aadhaar), pan_no: nn(i.pan), licence_no: nn(i.licenceNo),
      licence_issue: nn(i.licenceIssue), licence_expiry: nn(i.licenceExpiry), training_no: nn(i.trainingNo), training_expiry: nn(i.trainingExpiry),
      blood_group: nn(i.blood), monthly_salary: n0(i.salary), emergency_contact: nn(i.emergency), photo_path: nn(i.photo), status: slug(i.status || "Active"),
    }),
  },
  {
    key: "customers", table: "customers",
    fromRow: (r) => ({
      id: r.id, name: r.name, contactPerson: s(r.contact_person), mobile: s(r.mobile), email: s(r.email), address: s(r.billing_address),
      gstin: s(r.gstin), type: s(r.customer_type), terms: s(r.payment_terms), remarks: s(r.remarks),
    }),
    toRow: (i) => ({
      id: i.id, name: i.name, contact_person: nn(i.contactPerson), mobile: nn(i.mobile), email: nn(i.email), billing_address: nn(i.address),
      gstin: nn(i.gstin), customer_type: nn(i.type), payment_terms: nn(i.terms), remarks: nn(i.remarks),
    }),
  },
  {
    key: "vehicles", table: "vehicles", createdBy: true,
    fromRow: (r) => ({
      id: r.id, regNo: r.reg_no, type: s(r.vehicle_type), manufacturer: s(r.manufacturer), model: s(r.model), capacity: s(r.capacity),
      chassis: s(r.chassis_no), engine: s(r.engine_no), mfgYear: s(r.mfg_year), fuel: s(r.fuel_type), status: fromEnum(r.status, VEHICLE_STATUSES, "Available"),
      driverId: s(r.current_driver_id), purchaseDate: s(r.purchase_date), photo: s(r.photo_path), notes: s(r.notes),
    }),
    toRow: (i) => ({
      id: i.id, reg_no: String(i.regNo || "").toUpperCase().replace(/[^A-Z0-9]/g, ""), vehicle_type: i.type || "Truck", manufacturer: nn(i.manufacturer),
      model: nn(i.model), capacity: nn(i.capacity), chassis_no: nn(i.chassis), engine_no: nn(i.engine), mfg_year: num(i.mfgYear), fuel_type: nn(i.fuel),
      status: slug(i.status || "Available"), current_driver_id: nn(i.driverId), purchase_date: nn(i.purchaseDate), photo_path: nn(i.photo), notes: nn(i.notes),
    }),
  },
  {
    key: "driverDocs", table: "driver_documents", createdBy: true,
    fromRow: (r) => ({
      id: r.id, driverId: r.driver_id, name: r.doc_type, docNo: s(r.doc_number), issueDate: s(r.issue_date), expiryDate: s(r.expiry_date),
      fileName: s(r.file_name), fileData: s(r.file_path), remarks: s(r.remarks),
    }),
    toRow: (i) => ({
      id: i.id, driver_id: i.driverId, doc_type: i.name, doc_number: nn(i.docNo), issue_date: nn(i.issueDate), expiry_date: nn(i.expiryDate),
      file_path: nn(i.fileData), file_name: nn(i.fileName), remarks: nn(i.remarks),
    }),
  },
  {
    key: "driverHistory", table: "driver_status_history", createdBy: true,
    fromRow: (r) => ({ id: r.id, driverId: r.driver_id, date: s(r.status_date), status: r.status, note: s(r.note) }),
    toRow: (i) => ({ id: i.id, driver_id: i.driverId, status_date: nn(i.date) ?? undefined, status: i.status, note: nn(i.note) }),
  },
  {
    key: "vehicleDocs", table: "vehicle_documents", createdBy: true,
    fromRow: (r) => ({
      id: r.id, vehicleId: r.vehicle_id, name: r.doc_type, docNo: s(r.doc_number), issueDate: s(r.issue_date), expiryDate: s(r.expiry_date),
      fileName: s(r.file_name), fileData: s(r.file_path), remarks: s(r.remarks), status: fromEnum(r.status, DOCS, "Current"), renewedFrom: s(r.renewed_from),
    }),
    toRow: (i) => ({
      id: i.id, vehicle_id: i.vehicleId, doc_type: i.name, doc_number: nn(i.docNo), issue_date: nn(i.issueDate), expiry_date: nn(i.expiryDate),
      file_path: nn(i.fileData), file_name: nn(i.fileName), remarks: nn(i.remarks), status: slug(i.status || "Current"), renewed_from: nn(i.renewedFrom),
    }),
  },
  {
    key: "assignments", table: "driver_assignments", createdBy: true,
    fromRow: (r) => ({ id: r.id, driverId: r.driver_id, vehicleId: r.vehicle_id, startDate: s(r.start_date), endDate: s(r.end_date), remarks: s(r.remarks) }),
    toRow: (i) => ({ id: i.id, driver_id: i.driverId, vehicle_id: i.vehicleId, start_date: nn(i.startDate) ?? undefined, end_date: nn(i.endDate), remarks: nn(i.remarks) }),
  },
  {
    key: "maintenance", table: "vehicle_maintenance", createdBy: true,
    fromRow: (r) => ({
      id: r.id, vehicleId: r.vehicle_id, title: r.title, category: r.category, description: s(r.description), startDate: s(r.start_date),
      expectedEnd: s(r.expected_end), actualEnd: s(r.actual_end), garage: s(r.garage), mechanic: s(r.mechanic), estCost: n0(r.estimated_cost),
      actualCost: n0(r.actual_cost), invoice: s(r.invoice_path), beforePhotos: s(r.before_photos?.[0]), afterPhotos: s(r.after_photos?.[0]),
      remarks: s(r.remarks), status: fromEnum(r.status, MAINT_STATUSES, "Scheduled"), createdBy: r.created_by ? "Staff" : "",
    }),
    toRow: (i) => ({
      id: i.id, vehicle_id: i.vehicleId, title: i.title, category: i.category, description: nn(i.description), start_date: i.startDate,
      expected_end: nn(i.expectedEnd), actual_end: nn(i.actualEnd), garage: nn(i.garage), mechanic: nn(i.mechanic), estimated_cost: n0(i.estCost),
      actual_cost: n0(i.actualCost), invoice_path: nn(i.invoice), before_photos: i.beforePhotos ? [i.beforePhotos] : null,
      after_photos: i.afterPhotos ? [i.afterPhotos] : null, remarks: nn(i.remarks), status: slug(i.status || "Scheduled"),
    }),
  },
  {
    key: "trips", table: "trips", createdBy: true, seq: { prefix: "TRIP", field: "tripNo", col: "trip_no", seqKey: "trip" },
    fromRow: (r) => ({
      id: r.id, tripNo: r.trip_no, lrNo: s(r.lr_no), vehicleId: r.vehicle_id, driverId: s(r.driver_id), customer: s(r.customer_name),
      consignor: s(r.consignor), consignee: s(r.consignee), loadingLoc: s(r.loading_loc), unloadingLoc: s(r.unloading_loc), material: s(r.material),
      quantity: s(r.quantity), loadingDT: fromTs(r.loading_at), reportingDT: fromTs(r.reporting_at), unloadingDT: fromTs(r.unloading_at),
      freightRate: n0(r.freight_rate), freightType: s(r.freight_type), totalFreight: n0(r.total_freight), detentionDays: n0(r.detention_days),
      detentionCharges: n0(r.detention_charges), addExpenses: n0(r.add_expenses), remarks: s(r.remarks), status: fromEnum(r.status, TRIP_STATUSES, "Planned"),
    }),
    toRow: (i) => ({
      id: i.id, trip_no: i.tripNo, lr_no: nn(i.lrNo), vehicle_id: i.vehicleId, driver_id: nn(i.driverId), customer_name: nn(i.customer),
      consignor: nn(i.consignor), consignee: nn(i.consignee), loading_loc: nn(i.loadingLoc), unloading_loc: nn(i.unloadingLoc), material: nn(i.material),
      quantity: nn(i.quantity), loading_at: toTs(i.loadingDT), reporting_at: toTs(i.reportingDT), unloading_at: toTs(i.unloadingDT),
      freight_rate: n0(i.freightRate), freight_type: nn(i.freightType), total_freight: n0(i.totalFreight), detention_days: Math.round(n0(i.detentionDays)),
      detention_charges: n0(i.detentionCharges), add_expenses: n0(i.addExpenses), remarks: nn(i.remarks), status: slug(i.status || "Planned"),
    }),
  },
  {
    key: "lrs", table: "lr_documents", createdBy: true, seq: { prefix: "LR", field: "lrNo", col: "lr_no", seqKey: "lr" },
    fromRow: (r) => ({
      id: r.id, lrNo: r.lr_no, date: s(r.lr_date), from: s(r.from_loc), to: s(r.to_loc), consignor: s(r.consignor), consignorAddr: s(r.consignor_addr),
      consignee: s(r.consignee), consigneeAddr: s(r.consignee_addr), vehicleId: s(r.vehicle_id), goods: s(r.goods), quantity: s(r.quantity),
      gross: s(r.gross_weight), tare: s(r.tare_weight), net: s(r.net_weight), freight: s(r.freight), value: s(r.value_declared), beNo: s(r.be_invoice_no),
      reportingDT: fromTs(r.reporting_at), unloadingDT: fromTs(r.unloading_at), startKm: s(r.start_km), status: fromEnum(r.status, LRS, "Draft"), driverId: s(r.driver_id),
    }),
    toRow: (i) => ({
      id: i.id, lr_no: i.lrNo, lr_date: nn(i.date) ?? undefined, from_loc: nn(i.from), to_loc: nn(i.to), consignor: i.consignor || "", consignor_addr: nn(i.consignorAddr),
      consignee: i.consignee || "", consignee_addr: nn(i.consigneeAddr), vehicle_id: nn(i.vehicleId), driver_id: nn(i.driverId), goods: nn(i.goods),
      quantity: nn(i.quantity), gross_weight: num(i.gross), tare_weight: num(i.tare), freight: n0(i.freight), value_declared: nn(i.value), be_invoice_no: nn(i.beNo),
      reporting_at: toTs(i.reportingDT), unloading_at: toTs(i.unloadingDT), start_km: num(i.startKm), status: slug(i.status || "Draft"),
    }),
  },
  {
    key: "tccs", table: "tcc_documents", createdBy: true, seq: { prefix: "TCC", field: "tccNo", col: "tcc_no", seqKey: "tcc" },
    fromRow: (r) => ({
      id: r.id, tccNo: r.tcc_no, date: s(r.tcc_date), recipient: s(r.recipient), recipientAddr: s(r.recipient_addr), vehicleId: s(r.vehicle_id),
      onBehalf: s(r.on_behalf_of), prevCargo: s(r.previous_cargo), driverId: s(r.driver_id), status: fromEnum(r.status, LRS, "Draft"), declaration: s(r.declaration),
    }),
    toRow: (i) => ({
      id: i.id, tcc_no: i.tccNo, tcc_date: nn(i.date) ?? undefined, recipient: i.recipient || "", recipient_addr: nn(i.recipientAddr), vehicle_id: nn(i.vehicleId),
      driver_id: nn(i.driverId), on_behalf_of: nn(i.onBehalf), previous_cargo: nn(i.prevCargo), declaration: i.declaration || undefined, status: slug(i.status || "Draft"),
    }),
  },
  {
    key: "salaries", table: "salary_records", createdBy: true,
    fromRow: (r) => ({
      id: r.id, driverId: r.driver_id, month: s(r.salary_month).slice(0, 7), base: n0(r.base_salary), bonus: n0(r.bonus), additions: n0(r.additions),
      advance: n0(r.advance), deductions: n0(r.deductions), paymentDate: s(r.payment_date), method: s(r.payment_method), reference: s(r.payment_reference),
      remarks: s(r.remarks), status: fromEnum(r.status, SAL, "Pending"),
    }),
    toRow: (i) => ({
      id: i.id, driver_id: i.driverId, salary_month: `${String(i.month).slice(0, 7)}-01`, base_salary: n0(i.base), bonus: n0(i.bonus), additions: n0(i.additions),
      advance: n0(i.advance), deductions: n0(i.deductions), payment_date: nn(i.paymentDate), payment_method: nn(i.method), payment_reference: nn(i.reference),
      remarks: nn(i.remarks), status: slug(i.status || "Pending"),
    }),
  },
  {
    key: "expenses", table: "expenses", createdBy: true,
    fromRow: (r) => ({
      id: r.id, vehicleId: s(r.vehicle_id), date: s(r.expense_date), amount: n0(r.amount), category: r.category, description: s(r.description),
      receipt: s(r.receipt_path), method: s(r.payment_method),
    }),
    toRow: (i) => ({
      id: i.id, vehicle_id: nn(i.vehicleId), expense_date: nn(i.date) ?? undefined, category: i.category, amount: n0(i.amount), description: nn(i.description),
      receipt_path: nn(i.receipt), payment_method: nn(i.method),
    }),
  },
];
