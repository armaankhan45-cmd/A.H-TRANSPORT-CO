-- =====================================================================
-- Migration 0004 — DEMO DATA (clearly labelled, safe to skip in production)
-- Aadhaar / PAN / licence values here are FAKE placeholders (DEMO-xxxx).
-- Do NOT insert real identity documents until RLS + private storage
-- have been tested end-to-end.
-- =====================================================================

-- Vehicles ------------------------------------------------------------
insert into public.vehicles (reg_no, vehicle_type, manufacturer, model, capacity, chassis_no, engine_no, mfg_year, fuel_type, status, purchase_date, notes)
values
 ('MH43CK8150','Tanker','Tata','Prima LX 5530.S','24 KL','DEMOCH8150','DEMOEN8150',2021,'Diesel','under_maintenance','2021-04-10','DEMO VEHICLE — replace with real data'),
 ('MH43CK8151','Tanker','Tata','Prima LX 5530.S','24 KL','DEMOCH8151','DEMOEN8151',2021,'Diesel','on_trip','2021-04-10','DEMO VEHICLE'),
 ('MH43CK8152','Tanker','Ashok Leyland','3520 Tanker','20 KL','DEMOCH8152','DEMOEN8152',2022,'Diesel','available','2022-06-01','DEMO VEHICLE'),
 ('MH12AB1234','Bulker','Tata','Signa 5530','30 MT','DEMOCH1234','DEMOEN1234',2020,'Diesel','available','2020-02-15','DEMO VEHICLE'),
 ('MH43CK8153','Tanker','Tata','Prima 4923.S','24 KL','DEMOCH8153','DEMOEN8153',2022,'Diesel','available','2022-09-01','DEMO VEHICLE'),
 ('MH43CK8154','Trailer','BharatBenz','3528T','40 MT','DEMOCH8154','DEMOEN8154',2019,'Diesel','temporarily_unavailable','2019-11-20','DEMO VEHICLE'),
 ('MH43CK8155','Tanker','Ashok Leyland','2518 Tanker','18 KL','DEMOCH8155','DEMOEN8155',2023,'Diesel','available','2023-01-10','DEMO VEHICLE'),
 ('MH43CK8156','Truck','Eicher','Pro 6019','16 MT','DEMOCH8156','DEMOEN8156',2018,'Diesel','inactive','2018-05-05','DEMO VEHICLE')
on conflict (reg_no) do nothing;

-- Drivers -------------------------------------------------------------
insert into public.drivers (full_name, mobile, address, date_of_birth, joining_date, aadhaar_no, pan_no, licence_no, licence_issue, licence_expiry, training_no, training_expiry, blood_group, monthly_salary, emergency_contact, status)
values
 ('Ramesh Patil','9820011111','Chembur, Mumbai','1990-05-12','2022-01-15','DEMO-0000-1111','DEMOPAN001','MH43/100001','2020-03-01','2027-06-15','HG-1001','2027-02-10','O+',35000,'9820090001','active'),
 ('Suresh Jadhav','9820022222','Chembur, Mumbai','1988-08-02','2022-03-01','DEMO-0000-2222','DEMOPAN002','MH43/100002','2019-07-01','2026-11-20','HG-1002','2026-12-05','A+',35000,'9820090002','active'),
 ('Anil Pawar','9820033333','Vashi, Navi Mumbai','1992-01-20','2023-01-10','DEMO-0000-3333','DEMOPAN003','MH43/100003','2021-02-01','2028-01-30','HG-1003','2027-08-01','B+',38000,'9820090003','active'),
 ('Vijay Shinde','9820044444','Kurla, Mumbai','1985-11-30','2021-06-01','DEMO-0000-4444','DEMOPAN004','MH43/100004','2018-04-01','2026-11-18','HG-1004','2027-03-15','AB+',32000,'9820090004','active'),
 ('Kiran More','9820055555','Panvel','1994-03-14','2023-07-01','DEMO-0000-5555','DEMOPAN005','MH43/100005','2022-05-01','2027-09-09','HG-1005','2026-11-25','O-',32000,'9820090005','active'),
 ('Sunil Bhosale','9820077777','Thane','1987-09-09','2020-09-01','DEMO-0000-7777','DEMOPAN007','MH43/100007','2017-01-01','2029-04-04','HG-1007','2028-05-05','B-',36000,'9820090007','active')
on conflict do nothing;

-- link driver ↔ vehicle
update public.vehicles v set current_driver_id = d.id
from public.drivers d
where (v.reg_no, d.licence_no) in (
  ('MH43CK8150','MH43/100001'),
  ('MH43CK8151','MH43/100002'),
  ('MH43CK8152','MH43/100003'),
  ('MH43CK8153','MH43/100005'),
  ('MH43CK8155','MH43/100007')
);

-- Assignments ---------------------------------------------------------
insert into public.driver_assignments (driver_id, vehicle_id, start_date, remarks)
select d.id, v.id, '2023-01-01', 'DEMO assignment'
from public.drivers d join public.vehicles v on v.current_driver_id = d.id
where not exists (
  select 1 from public.driver_assignments a where a.driver_id = d.id and a.end_date is null
);

-- Vehicle documents (demo expiry mix: expired / 7 / 15 / 30 days) ------
insert into public.vehicle_documents (vehicle_id, doc_type, doc_number, issue_date, expiry_date, remarks)
select v.id, t.doc_type, v.reg_no || '-' || t.suffix, date '2025-01-01', t.expiry, 'DEMO document'
from public.vehicles v
cross join (values
  ('RC Book', '-RC', current_date + 400),
  ('Insurance', '-INS', current_date + 12),
  ('Fitness Certificate', '-FIT', current_date + 25),
  ('PUC', '-PUC', case when v.reg_no = 'MH43CK8150' then current_date - 8 else current_date + 60 end),
  ('National Permit', '-NP', current_date + 150),
  ('State Permit', '-SP', current_date + 90),
  ('Road Tax', '-RT', current_date + 300),
  ('Tanker Inspection Certificate', '-TIC', current_date + 45)
) as t(doc_type, suffix, expiry)
where v.reg_no in ('MH43CK8150','MH43CK8151','MH43CK8152')
  and not exists (select 1 from public.vehicle_documents d where d.vehicle_id = v.id and d.doc_type = t.doc_type and d.status = 'current');

-- Maintenance ---------------------------------------------------------
insert into public.vehicle_maintenance (vehicle_id, title, category, description, start_date, expected_end, actual_end, garage, mechanic, estimated_cost, actual_cost, status, remarks)
select v.id, 'Engine overhaul & tanker repair', 'Engine repair', 'DEMO job: oil leakage, compartment welding, brake overhaul.',
       current_date - 3, current_date + 2, null, 'Shree Auto Garage, Chembur', 'Raju — 9820090001', 85000, 0, 'in_progress', 'DEMO — vehicle blocked'
from public.vehicles v where v.reg_no = 'MH43CK8150'
  and not exists (select 1 from public.vehicle_maintenance m where m.vehicle_id = v.id);

insert into public.vehicle_maintenance (vehicle_id, title, category, description, start_date, expected_end, actual_end, garage, estimated_cost, actual_cost, status)
select v.id, 'General servicing + oil change', 'General servicing', 'DEMO completed job.', current_date - 25, current_date - 23, current_date - 23, 'Tata Motors Workshop', 18000, 17500, 'completed'
from public.vehicles v where v.reg_no = 'MH43CK8151'
  and not exists (select 1 from public.vehicle_maintenance m where m.vehicle_id = v.id);

-- Customers -----------------------------------------------------------
insert into public.customers (name, contact_person, mobile, email, billing_address, gstin, customer_type, payment_terms)
values
 ('M/s Shree Chemicals Pvt. Ltd.','R. Deshmukh','9820010001','purchase@shreechem.example','Taloja MIDC, Navi Mumbai','27ABCDE1234F1Z5','chemical','30 days'),
 ('M/s Navrang Oil Traders','S. Iyer','9820010002','navrang@example.com','Mahul, Chembur, Mumbai','27FGHIJ5678K2Z6','oil','15 days'),
 ('M/s Sai Petrochem','A. Khan','9820010003','sai@example.com','Bhiwandi, Thane','27KLMNO9012P3Z7','petrochem','30 days'),
 ('M/s Om Sai Logistics','P. Verma','9820010004','om@example.com','Pune','27PQRST3456U4Z8','general','advance')
on conflict do nothing;

-- LR / TCC / trips ----------------------------------------------------
insert into public.lr_documents (lr_no, lr_date, from_loc, to_loc, consignor, consignor_addr, consignee, consignee_addr, vehicle_id, driver_id, goods, quantity, gross_weight, tare_weight, freight, be_invoice_no, status)
select 'LR/0001', current_date, 'Taloja', 'Mahul, Chembur', 'M/s Shree Chemicals Pvt. Ltd.', 'Taloja MIDC, Navi Mumbai',
       'M/s Navrang Oil Traders', 'Mahul, Chembur, Mumbai', v.id, v.current_driver_id, 'Chemical Oil', '24 KL', 28500, 8500, 18500, 'BE/2026/4521', 'final'
from public.vehicles v where v.reg_no = 'MH43CK8151'
on conflict (lr_no) do nothing;

insert into public.tcc_documents (tcc_no, tcc_date, recipient, recipient_addr, vehicle_id, driver_id, on_behalf_of, previous_cargo, status)
select 'TCC/0001', current_date, 'M/s Navrang Oil Traders', 'Mahul, Chembur, Mumbai', v.id, v.current_driver_id,
       'M/s Shree Chemicals Pvt. Ltd.', 'Chemical Oil', 'final'
from public.vehicles v where v.reg_no = 'MH43CK8151'
on conflict (tcc_no) do nothing;

insert into public.trips (trip_no, vehicle_id, driver_id, consignor, consignee, loading_loc, unloading_loc, material, quantity, loading_at, freight_rate, total_freight, status)
select 'TRIP/0001', v.id, v.current_driver_id, 'M/s Shree Chemicals Pvt. Ltd.', 'M/s Navrang Oil Traders', 'Taloja', 'Mahul, Chembur', 'Chemical Oil', '24 KL', now() - interval '1 day', 18500, 18500, 'in_transit'
from public.vehicles v where v.reg_no = 'MH43CK8151'
on conflict (trip_no) do nothing;

update public.document_sequences set last_number = 1 where prefix in ('LR','TCC','TRIP');

-- Salary --------------------------------------------------------------
insert into public.salary_records (driver_id, salary_month, base_salary, bonus, advance, deductions, status)
select d.id, date_trunc('month', current_date)::date, d.monthly_salary, 2000, 5000, 500, 'pending'
from public.drivers d
on conflict (driver_id, salary_month) do nothing;

-- Expenses ------------------------------------------------------------
insert into public.expenses (vehicle_id, expense_date, category, amount, description, payment_method)
select v.id, current_date - 1, 'Diesel', 8500, 'DEMO diesel fill 180L', 'Cash' from public.vehicles v where v.reg_no = 'MH43CK8151'
  and not exists (select 1 from public.expenses e where e.vehicle_id = v.id);

insert into public.expenses (vehicle_id, expense_date, category, amount, description, payment_method)
select v.id, current_date - 3, 'Repair', 85000, 'DEMO engine overhaul advance', 'Bank Transfer' from public.vehicles v where v.reg_no = 'MH43CK8150'
  and not exists (select 1 from public.expenses e where e.vehicle_id = v.id);

-- Settings ------------------------------------------------------------
insert into public.app_settings(key, value) values ('demo_data_loaded','true'::jsonb)
on conflict (key) do update set value = 'true'::jsonb;
