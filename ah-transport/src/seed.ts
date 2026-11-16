import type { DB } from "./types";
import { uid } from "./company";

export function seedDB(): DB {
  const v = (regNo: string, type: string, cap: string, status: string, driverId: string, mfg: string): DB["vehicles"][0] => ({
    id: uid(), regNo, type, manufacturer: "Tata", model: type === "Tanker" ? "Prima LX 5530.S" : "Signa 5530", capacity: cap, chassis: "MAT" + Math.floor(100000 + Math.random() * 899999), engine: "Cummins " + Math.floor(100000 + Math.random() * 899999), mfgYear: mfg, fuel: "Diesel", status, driverId, purchaseDate: "2021-04-10", photo: "", notes: "Demo vehicle — replace with real data after testing.",
  });
  const d = (name: string, mobile: string, licExp: string, trainExp: string, salary: number, vehicleId: string, status: string): DB["drivers"][0] => ({
    id: uid(), name, mobile, altMobile: "", address: "Chembur, Mumbai", dob: "1990-05-12", joining: "2022-01-15", aadhaar: "XXXX-XXXX-" + Math.floor(1000 + Math.random() * 9000), pan: "DEMO" + Math.floor(10000 + Math.random() * 89999), licenceNo: "MH43/" + Math.floor(100000 + Math.random() * 899999), licenceIssue: "2020-03-01", licenceExpiry: licExp, trainingNo: "HG-" + Math.floor(1000 + Math.random() * 9000), trainingExpiry: trainExp, blood: "O+", salary, emergency: "98" + Math.floor(10000000 + Math.random() * 89999999), photo: "", vehicleId, status, docs: "Aadhaar, PAN, DL, Training card uploaded (demo)",
  });

  const vehicles = [
    v("MH43CK8150", "Tanker", "24 KL", "Under Maintenance", "", "2021"),
    v("MH43CK8151", "Tanker", "24 KL", "On Trip", "", "2021"),
    v("MH43CK8152", "Tanker", "20 KL", "Available", "", "2022"),
    v("MH12AB1234", "Bulker", "30 MT", "Available", "", "2020"),
    v("MH43CK8153", "Tanker", "24 KL", "Available", "", "2022"),
    v("MH43CK8154", "Trailer", "40 MT", "Temporarily Unavailable", "", "2019"),
    v("MH43CK8155", "Tanker", "18 KL", "Available", "", "2023"),
    v("MH43CK8156", "Truck", "16 MT", "Inactive", "", "2018"),
  ];
  const drivers = [
    d("Ramesh Patil", "98200 11111", "2027-06-15", "2027-02-10", 35000, vehicles[0].id, "Active"),
    d("Suresh Jadhav", "98200 22222", "2026-11-20", "2026-12-05", 35000, vehicles[1].id, "Active"),
    d("Anil Pawar", "98200 33333", "2028-01-30", "2027-08-01", 38000, vehicles[2].id, "Active"),
    d("Vijay Shinde", "98200 44444", "2026-11-18", "2027-03-15", 32000, "", "Active"),
    d("Kiran More", "98200 55555", "2027-09-09", "2026-11-25", 32000, vehicles[4].id, "Active"),
    d("Prakash Nair", "98200 66666", "2025-10-01", "2027-01-01", 30000, "", "Inactive"),
    d("Sunil Bhosale", "98200 77777", "2029-04-04", "2028-05-05", 36000, vehicles[6].id, "Active"),
    d("Manoj Gupta", "98200 88888", "2027-12-12", "2027-12-12", 34000, "", "Active"),
  ];
  // link vehicles to drivers
  vehicles[0].driverId = drivers[0].id; vehicles[1].driverId = drivers[1].id; vehicles[2].driverId = drivers[2].id; vehicles[4].driverId = drivers[4].id; vehicles[6].driverId = drivers[6].id;

  const docNames = ["RC Book", "Insurance", "Fitness Certificate", "PUC", "National Permit", "State Permit", "Road Tax", "Tanker Inspection Certificate"];
  const expiries = ["2027-08-01", "2026-11-25", "2026-12-10", "2026-11-18", "2027-05-01", "2027-03-01", "2027-01-15", "2026-11-30"];
  const vehicleDocs: DB["vehicleDocs"] = [];
  vehicles.forEach((veh, vi) => {
    docNames.forEach((n, i) => {
      // vary: first vehicle insurance expires soon, PUC expired etc for demo alerts
      let exp = expiries[i];
      if (vi === 0 && n === "Insurance") exp = "2026-11-20";
      if (vi === 0 && n === "PUC") exp = "2026-11-05";
      if (vi === 1 && n === "Fitness Certificate") exp = "2026-12-05";
      if (vi === 3 && n === "National Permit") exp = "2026-10-15";
      vehicleDocs.push({ id: uid(), vehicleId: veh.id, name: n, docNo: veh.regNo + "/" + (i + 1), issueDate: "2025-01-01", expiryDate: exp, fileName: n.replace(/\s/g, "_") + ".pdf (demo)", fileData: "", remarks: "Demo document", status: "Current" });
    });
  });

  const customers: DB["customers"] = [
    { id: uid(), name: "M/s Shree Chemicals Pvt. Ltd.", contactPerson: "R. Deshmukh", mobile: "98200 10001", email: "purchase@shreechem.example", address: "Taloja MIDC, Navi Mumbai", gstin: "27ABCDE1234F1Z5", type: "Chemical", terms: "30 days", remarks: "Regular tanker customer" },
    { id: uid(), name: "M/s Navrang Oil Traders", contactPerson: "S. Iyer", mobile: "98200 10002", email: "navrang@example.com", address: "Mahul, Chembur, Mumbai", gstin: "27FGHIJ5678K2Z6", type: "Oil", terms: "15 days", remarks: "" },
    { id: uid(), name: "M/s Sai Petrochem", contactPerson: "A. Khan", mobile: "98200 10003", email: "sai@example.com", address: "Bhiwandi, Thane", gstin: "27KLMNO9012P3Z7", type: "Petrochem", terms: "30 days", remarks: "" },
    { id: uid(), name: "M/s Om Sai Logistics", contactPerson: "P. Verma", mobile: "98200 10004", email: "om@example.com", address: "Pune", gstin: "27PQRST3456U4Z8", type: "General", terms: "Advance", remarks: "" },
  ];

  const maintenance: DB["maintenance"] = [
    { id: uid(), vehicleId: vehicles[0].id, title: "Engine overhaul & tanker repair", category: "Engine repair", description: "Engine oil leakage, tanker compartment welding, brake overhaul.", startDate: "2026-11-10", expectedEnd: "2026-11-15", actualEnd: "", garage: "Shree Auto Garage, Chembur", mechanic: "Raju Mechanic — 98200 90001", estCost: 85000, actualCost: 0, invoice: "", beforePhotos: "", afterPhotos: "", remarks: "Vehicle under maintenance — blocked for trips", status: "In Progress", createdBy: "Admin" },
    { id: uid(), vehicleId: vehicles[1].id, title: "General servicing + oil change", category: "General servicing", description: "Full service, filters, oil change.", startDate: "2026-10-20", expectedEnd: "2026-10-22", actualEnd: "2026-10-22", garage: "Tata Motors Workshop", mechanic: "Service Advisor", estCost: 18000, actualCost: 17500, invoice: "INV-1021.pdf", beforePhotos: "", afterPhotos: "", remarks: "", status: "Completed", createdBy: "Admin" },
    { id: uid(), vehicleId: vehicles[3].id, title: "Tyre replacement (6 nos)", category: "Tyres", description: "Replace worn tyres, alignment.", startDate: "2026-10-05", expectedEnd: "2026-10-07", actualEnd: "2026-10-07", garage: "Tyre Point, Vashi", mechanic: "", estCost: 72000, actualCost: 69500, invoice: "", beforePhotos: "", afterPhotos: "", remarks: "", status: "Completed", createdBy: "Admin" },
    { id: uid(), vehicleId: vehicles[4].id, title: "Clutch & gearbox repair", category: "Clutch", description: "Clutch plate, gearbox bearing.", startDate: "2026-11-18", expectedEnd: "2026-11-21", actualEnd: "", garage: "Shree Auto Garage", mechanic: "", estCost: 45000, actualCost: 0, invoice: "", beforePhotos: "", afterPhotos: "", remarks: "Upcoming scheduled maintenance", status: "Scheduled", createdBy: "Admin" },
  ];

  const trips: DB["trips"] = [
    { id: uid(), tripNo: "TRIP/0001", lrNo: "LR/0001", vehicleId: vehicles[1].id, driverId: drivers[1].id, customer: customers[0].name, consignor: customers[0].name, consignee: customers[1].name, loadingLoc: "Taloja", unloadingLoc: "Mahul, Chembur", material: "Chemical Oil", quantity: "24 KL", loadingDT: "2026-11-12T09:00", reportingDT: "2026-11-12T18:00", unloadingDT: "", freightRate: 18500, freightType: "Per Trip", totalFreight: 18500, detentionDays: 0, detentionCharges: 0, addExpenses: 1200, remarks: "Demo trip", status: "In Transit" },
    { id: uid(), tripNo: "TRIP/0002", lrNo: "LR/0002", vehicleId: vehicles[2].id, driverId: drivers[2].id, customer: customers[2].name, consignor: customers[2].name, consignee: customers[0].name, loadingLoc: "Bhiwandi", unloadingLoc: "Taloja", material: "Bulk Cargo", quantity: "20 KL", loadingDT: "2026-11-11T08:00", reportingDT: "2026-11-11T20:00", unloadingDT: "2026-11-12T10:00", freightRate: 22000, freightType: "Per Trip", totalFreight: 22000, detentionDays: 1, detentionCharges: 1500, addExpenses: 800, remarks: "", status: "Completed" },
    { id: uid(), tripNo: "TRIP/0003", lrNo: "", vehicleId: vehicles[4].id, driverId: drivers[4].id, customer: customers[1].name, consignor: customers[1].name, consignee: customers[2].name, loadingLoc: "Mahul", unloadingLoc: "Bhiwandi", material: "Diesel", quantity: "18 KL", loadingDT: "", reportingDT: "", unloadingDT: "", freightRate: 16000, freightType: "Per Trip", totalFreight: 16000, detentionDays: 0, detentionCharges: 0, addExpenses: 0, remarks: "Planned", status: "Planned" },
    { id: uid(), tripNo: "TRIP/0004", lrNo: "LR/0003", vehicleId: vehicles[6].id, driverId: drivers[6].id, customer: customers[0].name, consignor: customers[0].name, consignee: customers[1].name, loadingLoc: "Taloja", unloadingLoc: "Mahul", material: "Chemical Oil", quantity: "18 KL", loadingDT: "2026-11-13T07:00", reportingDT: "", unloadingDT: "", freightRate: 14000, freightType: "Per Trip", totalFreight: 14000, detentionDays: 0, detentionCharges: 0, addExpenses: 0, remarks: "", status: "Loading" },
  ];

  const lrs: DB["lrs"] = [
    { id: uid(), lrNo: "LR/0001", date: "2026-11-12", from: "Taloja", to: "Mahul, Chembur", consignor: customers[0].name, consignorAddr: customers[0].address, consignee: customers[1].name, consigneeAddr: customers[1].address, vehicleId: vehicles[1].id, goods: "Chemical Oil", quantity: "24 KL", gross: "28500", tare: "8500", net: "20000", freight: "18500", value: "Not Declared", beNo: "BE/2026/4521", reportingDT: "2026-11-12T18:00", unloadingDT: "", startKm: "45210", status: "Final", driverId: drivers[1].id },
    { id: uid(), lrNo: "LR/0002", date: "2026-11-11", from: "Bhiwandi", to: "Taloja", consignor: customers[2].name, consignorAddr: customers[2].address, consignee: customers[0].name, consigneeAddr: customers[0].address, vehicleId: vehicles[2].id, goods: "Bulk Cargo", quantity: "20 KL", gross: "24000", tare: "8000", net: "16000", freight: "22000", value: "Declared", beNo: "", reportingDT: "2026-11-11T20:00", unloadingDT: "2026-11-12T10:00", startKm: "38120", status: "Final", driverId: drivers[2].id },
    { id: uid(), lrNo: "LR/0003", date: "2026-11-13", from: "Taloja", to: "Mahul", consignor: customers[0].name, consignorAddr: customers[0].address, consignee: customers[1].name, consigneeAddr: customers[1].address, vehicleId: vehicles[6].id, goods: "Chemical Oil", quantity: "18 KL", gross: "21000", tare: "8200", net: "12800", freight: "14000", value: "Not Declared", beNo: "", reportingDT: "", unloadingDT: "", startKm: "12040", status: "Draft", driverId: drivers[6].id },
  ];

  const tccs: DB["tccs"] = [
    { id: uid(), tccNo: "TCC/0001", date: "2026-11-12", recipient: customers[1].name, recipientAddr: customers[1].address, vehicleId: vehicles[1].id, onBehalf: customers[0].name, prevCargo: "Chemical Oil", driverId: drivers[1].id, status: "Final", declaration: "We hereby declare that the tanker has been thoroughly cleaned and is fit to carry the next product." },
    { id: uid(), tccNo: "TCC/0002", date: "2026-11-11", recipient: customers[0].name, recipientAddr: customers[0].address, vehicleId: vehicles[2].id, onBehalf: customers[2].name, prevCargo: "Bulk Cargo", driverId: drivers[2].id, status: "Final", declaration: "We hereby declare that the tanker has been thoroughly cleaned and is fit to carry the next product." },
  ];

  const salaries: DB["salaries"] = [
    { id: uid(), driverId: drivers[0].id, month: "2026-11", base: 35000, bonus: 2000, additions: 0, advance: 5000, deductions: 500, paymentDate: "", method: "Bank Transfer", reference: "", remarks: "Nov 2026", status: "Pending" },
    { id: uid(), driverId: drivers[1].id, month: "2026-11", base: 35000, bonus: 1500, additions: 0, advance: 0, deductions: 0, paymentDate: "2026-11-05", method: "Bank Transfer", reference: "NEFT/1123", remarks: "", status: "Paid" },
    { id: uid(), driverId: drivers[2].id, month: "2026-10", base: 38000, bonus: 3000, additions: 1000, advance: 10000, deductions: 0, paymentDate: "2026-11-02", method: "Cash", reference: "", remarks: "Oct salary", status: "Paid" },
    { id: uid(), driverId: drivers[4].id, month: "2026-11", base: 32000, bonus: 0, additions: 0, advance: 3000, deductions: 0, paymentDate: "", method: "", reference: "", remarks: "", status: "Pending" },
  ];

  const expenses: DB["expenses"] = [
    { id: uid(), vehicleId: vehicles[1].id, date: "2026-11-12", amount: 8500, category: "Diesel", description: "Diesel fill 180L", receipt: "diesel.pdf", method: "Cash" },
    { id: uid(), vehicleId: vehicles[1].id, date: "2026-11-12", amount: 650, category: "Toll", description: "Toll — Mumbai-Pune", receipt: "", method: "Cash" },
    { id: uid(), vehicleId: vehicles[2].id, date: "2026-11-11", amount: 1200, category: "Driver allowance", description: "Trip allowance", receipt: "", method: "Cash" },
    { id: uid(), vehicleId: vehicles[0].id, date: "2026-11-10", amount: 85000, category: "Repair", description: "Engine overhaul advance to garage", receipt: "", method: "Bank Transfer" },
    { id: uid(), vehicleId: vehicles[3].id, date: "2026-10-06", amount: 69500, category: "Tyres", description: "6 tyres", receipt: "", method: "Bank Transfer" },
    { id: uid(), vehicleId: "", date: "2026-11-01", amount: 15000, category: "Office expenses", description: "Office rent share", receipt: "", method: "Bank Transfer" },
  ];

  const assignments: DB["assignments"] = [
    { id: uid(), driverId: drivers[0].id, vehicleId: vehicles[0].id, startDate: "2022-02-01", endDate: "", remarks: "Current" },
    { id: uid(), driverId: drivers[1].id, vehicleId: vehicles[1].id, startDate: "2022-03-01", endDate: "", remarks: "Current" },
    { id: uid(), driverId: drivers[2].id, vehicleId: vehicles[2].id, startDate: "2023-01-10", endDate: "", remarks: "Current" },
    { id: uid(), driverId: drivers[5].id, vehicleId: vehicles[5].id, startDate: "2021-06-01", endDate: "2024-12-31", remarks: "Resigned — history retained" },
  ];

  const users: DB["users"] = [
    { id: uid(), name: "Super Admin", email: "admin@ahtransportco.com", password: "admin123", role: "Super Admin", active: true },
    { id: uid(), name: "Office Staff (Demo)", email: "office@ahtransportco.com", password: "office123", role: "Office Staff", active: true },
    { id: uid(), name: "Accounts Staff (Demo)", email: "accounts@ahtransportco.com", password: "accounts123", role: "Accounts Staff", active: true },
    { id: uid(), name: drivers[1].name + " (Driver)", email: "driver@ahtransportco.com", password: "driver123", role: "Driver", driverId: drivers[1].id, active: true },
  ];

  return {
    users, vehicles, vehicleDocs, maintenance, drivers, assignments, customers, trips, lrs, tccs, salaries, expenses,
    driverDocs: [],
    driverHistory: [],
    audits: [{ id: uid(), time: new Date().toISOString(), user: "System", action: "Seed", detail: "Demo data loaded (clearly labelled). Replace with real data after security testing." }],
    seq: { lr: 4, tcc: 3, trip: 5 },
    settings: { notifyDays: 30, trackingPolicy: "Tracking only during trip hours with driver consent. Location retained 30 days." },
    locations: [],
  };
}
