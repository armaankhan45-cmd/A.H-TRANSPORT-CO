-- =====================================================================
-- A.H. TRANSPORT CO. — TRANSPORT MANAGEMENT SYSTEM
-- Migration 0001 — Core schema, constraints, indexes, triggers
-- Target: Supabase (PostgreSQL 15+)
-- Run in Supabase SQL editor, or: supabase db push
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type app_role as enum ('super_admin','admin','office_staff','accounts_staff','driver');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vehicle_status as enum ('available','on_trip','under_maintenance','temporarily_unavailable','inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type maintenance_status as enum ('scheduled','in_progress','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trip_status as enum ('planned','vehicle_assigned','loading','in_transit','reported','waiting_for_unloading','unloaded','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_status as enum ('current','superseded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type salary_status as enum ('pending','paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type employment_status as enum ('active','inactive','resigned','rejoined');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- UTILITY: updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------
-- ROLES / PERMISSIONS
-- ---------------------------------------------------------------------
create table if not exists public.roles (
  key         app_role primary key,
  label       text not null
);
insert into public.roles(key,label) values
  ('super_admin','Super Admin'),('admin','Admin'),('office_staff','Office Staff'),
  ('accounts_staff','Accounts Staff'),('driver','Driver')
on conflict (key) do nothing;

create table if not exists public.permissions (
  key         text primary key,
  label       text not null
);
insert into public.permissions(key,label) values
  ('dashboard','Dashboard'),('vehicles','Vehicles'),('documents','Vehicle documents'),
  ('maintenance','Maintenance'),('expiry','Expiry dashboard'),('drivers','Drivers'),
  ('assignments','Assignments'),('lr','LR'),('tcc','TCC'),('trips','Trips'),
  ('customers','Customers'),('salary','Salary'),('expenses','Expenses'),('reports','Reports'),
  ('tracking','GPS tracking'),('users','User management'),('settings','Settings'),('audit','Audit log')
on conflict (key) do nothing;

create table if not exists public.role_permissions (
  role        app_role not null references public.roles(key) on delete cascade,
  permission  text     not null references public.permissions(key) on delete cascade,
  primary key (role, permission)
);

-- ---------------------------------------------------------------------
-- PROFILES (1:1 with auth.users) — created by trigger on signup
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null default '',
  email         citext unique not null,
  mobile        text,
  role          app_role not null default 'driver',
  driver_id     uuid,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 'driver')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- VEHICLES
-- ---------------------------------------------------------------------
create table if not exists public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  reg_no          text not null unique,               -- MH43CK8150
  vehicle_type    text not null,                      -- Tanker / Bulker / Trailer...
  manufacturer    text,
  model           text,
  capacity        text,                               -- '24 KL' / '30 MT'
  chassis_no      text unique,
  engine_no       text,
  mfg_year        smallint check (mfg_year between 1950 and 2100),
  fuel_type       text default 'Diesel',
  status          vehicle_status not null default 'available',
  current_driver_id uuid,                              -- FK added after drivers table
  purchase_date   date,
  photo_path      text,                               -- private storage path
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint reg_no_format check (reg_no ~ '^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$')
);
create index if not exists idx_vehicles_status on public.vehicles(status);
create index if not exists idx_vehicles_driver on public.vehicles(current_driver_id);
create trigger trg_vehicles_updated before update on public.vehicles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- VEHICLE DOCUMENTS + HISTORY
-- ---------------------------------------------------------------------
create table if not exists public.vehicle_documents (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete restrict,
  doc_type     text not null,          -- RC Book / Insurance / Fitness / PUC / National Permit ...
  doc_number   text,
  issue_date   date,
  expiry_date  date,
  file_path    text,                   -- private bucket path: vehicle-docs/<vehicle_id>/<uuid>.pdf
  file_name    text,
  remarks      text,
  status       doc_status not null default 'current',
  renewed_from uuid references public.vehicle_documents(id),
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint expiry_after_issue check (expiry_date is null or issue_date is null or expiry_date >= issue_date)
);
create index if not exists idx_vdoc_vehicle on public.vehicle_documents(vehicle_id);
create index if not exists idx_vdoc_expiry on public.vehicle_documents(expiry_date) where status = 'current';
create trigger trg_vdoc_updated before update on public.vehicle_documents
for each row execute function public.set_updated_at();

-- Historical snapshots (kept forever; never hard-delete a paper)
create table if not exists public.vehicle_document_history (
  id            bigserial primary key,
  document_id   uuid not null,
  vehicle_id    uuid not null,
  doc_type      text not null,
  doc_number    text,
  issue_date    date,
  expiry_date   date,
  file_path     text,
  status        doc_status,
  snapshot      jsonb not null,
  changed_by    uuid references auth.users(id),
  changed_at    timestamptz not null default now()
);
create index if not exists idx_vdhist_doc on public.vehicle_document_history(document_id);

create or replace function public.log_vehicle_document_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.vehicle_document_history(document_id,vehicle_id,doc_type,doc_number,issue_date,expiry_date,file_path,status,snapshot,changed_by)
  values (coalesce(new.id, old.id), coalesce(new.vehicle_id,old.vehicle_id), coalesce(new.doc_type,old.doc_type),
          coalesce(new.doc_number,old.doc_number), coalesce(new.issue_date,old.issue_date), coalesce(new.expiry_date,old.expiry_date),
          coalesce(new.file_path,old.file_path), coalesce(new.status,old.status), to_jsonb(coalesce(new,old)), auth.uid());
  return coalesce(new, old);
end $$;

create trigger trg_vdoc_history after insert or update on public.vehicle_documents
for each row execute function public.log_vehicle_document_history();

-- ---------------------------------------------------------------------
-- MAINTENANCE
-- ---------------------------------------------------------------------
create table if not exists public.vehicle_maintenance (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references public.vehicles(id) on delete restrict,
  title           text not null,
  category        text not null,
  description     text,
  start_date      date not null,
  expected_end    date,
  actual_end      date,
  garage          text,
  mechanic        text,
  estimated_cost  numeric(12,2) default 0 check (estimated_cost >= 0),
  actual_cost     numeric(12,2) default 0 check (actual_cost >= 0),
  invoice_path    text,
  before_photos   text[],
  after_photos    text[],
  remarks         text,
  status          maintenance_status not null default 'scheduled',
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint dates_ordered check (
    (expected_end is null or expected_end >= start_date) and
    (actual_end   is null or actual_end   >= start_date)
  )
);
create index if not exists idx_maint_vehicle on public.vehicle_maintenance(vehicle_id);
create index if not exists idx_maint_status on public.vehicle_maintenance(status);
create trigger trg_maint_updated before update on public.vehicle_maintenance
for each row execute function public.set_updated_at();

-- Calculated duration in days (inclusive), open-ended jobs count to today
create or replace view public.vehicle_maintenance_duration as
select m.*,
       (coalesce(m.actual_end, current_date) - m.start_date + 1) as duration_days
from public.vehicle_maintenance m;

create table if not exists public.maintenance_expenses (
  id             uuid primary key default gen_random_uuid(),
  maintenance_id uuid not null references public.vehicle_maintenance(id) on delete cascade,
  head           text not null,             -- parts / labour / transport
  amount         numeric(12,2) not null check (amount >= 0),
  paid_to        text,
  paid_on        date,
  receipt_path   text,
  created_at     timestamptz not null default now()
);

-- Keep vehicle status in sync with maintenance state
create or replace function public.sync_vehicle_status_after_maintenance()
returns trigger language plpgsql security definer set search_path = public as $$
declare active_jobs int;
begin
  select count(*) into active_jobs from public.vehicle_maintenance
   where vehicle_id = coalesce(new.vehicle_id, old.vehicle_id) and status = 'in_progress';
  if active_jobs > 0 then
    update public.vehicles set status = 'under_maintenance' where id = coalesce(new.vehicle_id, old.vehicle_id);
  else
    update public.vehicles set status = 'available'
     where id = coalesce(new.vehicle_id, old.vehicle_id) and status = 'under_maintenance';
  end if;
  return coalesce(new, old);
end $$;

create trigger trg_maint_vehicle_sync after insert or update or delete on public.vehicle_maintenance
for each row execute function public.sync_vehicle_status_after_maintenance();

-- ---------------------------------------------------------------------
-- DRIVERS
-- ---------------------------------------------------------------------
create table if not exists public.drivers (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  mobile           text not null,
  alt_mobile       text,
  address          text,
  date_of_birth    date,
  joining_date     date not null default current_date,
  aadhaar_no       text,                    -- store masked where possible
  pan_no           text,
  licence_no       text,
  licence_issue    date,
  licence_expiry   date,
  training_no      text,
  training_expiry  date,
  blood_group      text,
  monthly_salary   numeric(12,2) default 0 check (monthly_salary >= 0),
  emergency_contact text,
  photo_path       text,
  status           employment_status not null default 'active',
  user_id          uuid references auth.users(id),
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint mobile_format check (mobile ~ '^[0-9]{10,12}$')
);
create unique index if not exists ux_drivers_licence on public.drivers(licence_no) where licence_no is not null;
create index if not exists idx_drivers_status on public.drivers(status);
create trigger trg_drivers_updated before update on public.drivers
for each row execute function public.set_updated_at();

alter table public.vehicles
  add constraint fk_vehicles_driver foreign key (current_driver_id) references public.drivers(id) on delete set null;

alter table public.profiles
  add constraint fk_profiles_driver foreign key (driver_id) references public.drivers(id) on delete set null;

create table if not exists public.driver_documents (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  doc_type    text not null,   -- aadhaar / pan / dl / training / medical / other
  doc_number  text,
  issue_date  date,
  expiry_date date,
  file_path   text,
  remarks     text,
  status      doc_status not null default 'current',
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_ddoc_driver on public.driver_documents(driver_id);
create index if not exists idx_ddoc_expiry on public.driver_documents(expiry_date);

create table if not exists public.driver_assignments (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.drivers(id) on delete restrict,
  vehicle_id  uuid not null references public.vehicles(id) on delete restrict,
  start_date  date not null default current_date,
  end_date    date,
  remarks     text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  constraint assignment_dates check (end_date is null or end_date >= start_date)
);
create index if not exists idx_assign_driver on public.driver_assignments(driver_id);
create index if not exists idx_assign_vehicle on public.driver_assignments(vehicle_id);
-- one active assignment per driver and per vehicle
create unique index if not exists ux_assign_active_driver on public.driver_assignments(driver_id) where end_date is null;
create unique index if not exists ux_assign_active_vehicle on public.driver_assignments(vehicle_id) where end_date is null;

-- ---------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_person text,
  mobile        text,
  email         citext,
  billing_address text,
  gstin         text,
  customer_type text default 'general',
  payment_terms text default '30 days',
  remarks       text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_customers_updated before update on public.customers
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- TRIPS
-- ---------------------------------------------------------------------
create table if not exists public.trips (
  id             uuid primary key default gen_random_uuid(),
  trip_no        text not null unique,
  lr_id          uuid,
  vehicle_id     uuid not null references public.vehicles(id) on delete restrict,
  driver_id      uuid references public.drivers(id) on delete set null,
  customer_id    uuid references public.customers(id) on delete set null,
  consignor      text,
  consignee      text,
  loading_loc    text,
  unloading_loc  text,
  material       text,
  quantity       text,
  loading_at     timestamptz,
  reporting_at   timestamptz,
  unloading_at   timestamptz,
  freight_rate   numeric(12,2) default 0,
  freight_type   text default 'per_trip',
  total_freight  numeric(12,2) default 0,
  detention_days int default 0 check (detention_days >= 0),
  detention_charges numeric(12,2) default 0,
  add_expenses   numeric(12,2) default 0,
  remarks        text,
  status         trip_status not null default 'planned',
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_trips_vehicle on public.trips(vehicle_id);
create index if not exists idx_trips_driver on public.trips(driver_id);
create index if not exists idx_trips_status on public.trips(status);
create trigger trg_trips_updated before update on public.trips
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- LR / TCC
-- ---------------------------------------------------------------------
create table if not exists public.lr_documents (
  id             uuid primary key default gen_random_uuid(),
  lr_no          text not null unique,
  lr_date        date not null default current_date,
  from_loc       text,
  to_loc         text,
  consignor      text not null,
  consignor_addr text,
  consignee      text not null,
  consignee_addr text,
  vehicle_id     uuid references public.vehicles(id) on delete restrict,
  driver_id      uuid references public.drivers(id) on delete set null,
  customer_id    uuid references public.customers(id) on delete set null,
  goods          text,
  quantity       text,
  gross_weight   numeric(12,2),
  tare_weight    numeric(12,2),
  net_weight     numeric(12,2) generated always as (coalesce(gross_weight,0) - coalesce(tare_weight,0)) stored,
  freight        numeric(12,2) default 0,
  value_declared text default 'not_declared',
  be_invoice_no  text,
  reporting_at   timestamptz,
  unloading_at   timestamptz,
  start_km       numeric(10,1),
  status         text not null default 'draft' check (status in ('draft','final','cancelled')),
  pdf_path       text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_lr_date on public.lr_documents(lr_date desc);
create index if not exists idx_lr_vehicle on public.lr_documents(vehicle_id);
create trigger trg_lr_updated before update on public.lr_documents
for each row execute function public.set_updated_at();

create table if not exists public.tcc_documents (
  id              uuid primary key default gen_random_uuid(),
  tcc_no          text not null unique,
  tcc_date        date not null default current_date,
  recipient       text not null,
  recipient_addr  text,
  vehicle_id      uuid references public.vehicles(id) on delete restrict,
  driver_id       uuid references public.drivers(id) on delete set null,
  on_behalf_of    text,
  previous_cargo  text,
  declaration     text not null default 'We hereby declare that the tanker has been thoroughly cleaned and is fit to carry the next product.',
  status          text not null default 'draft' check (status in ('draft','final','cancelled')),
  pdf_path        text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_tcc_date on public.tcc_documents(tcc_date desc);
create trigger trg_tcc_updated before update on public.tcc_documents
for each row execute function public.set_updated_at();

alter table public.trips add constraint fk_trips_lr foreign key (lr_id) references public.lr_documents(id) on delete set null;

-- ---------------------------------------------------------------------
-- SALARY
-- ---------------------------------------------------------------------
create table if not exists public.salary_records (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null references public.drivers(id) on delete restrict,
  salary_month  date not null,                    -- first day of month
  base_salary   numeric(12,2) not null default 0,
  bonus         numeric(12,2) not null default 0,
  additions     numeric(12,2) not null default 0,
  advance       numeric(12,2) not null default 0,
  deductions    numeric(12,2) not null default 0,
  net_salary    numeric(12,2) generated always as (base_salary + bonus + additions - advance - deductions) stored,
  payment_date  date,
  payment_method text,
  payment_reference text,
  remarks       text,
  status        salary_status not null default 'pending',
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (driver_id, salary_month)
);
create index if not exists idx_salary_month on public.salary_records(salary_month desc);
create trigger trg_salary_updated before update on public.salary_records
for each row execute function public.set_updated_at();

create table if not exists public.salary_adjustments (
  id           uuid primary key default gen_random_uuid(),
  salary_id    uuid not null references public.salary_records(id) on delete cascade,
  kind         text not null check (kind in ('bonus','addition','advance','deduction')),
  amount       numeric(12,2) not null check (amount <> 0),
  reason       text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid references public.vehicles(id) on delete set null,
  trip_id      uuid references public.trips(id) on delete set null,
  expense_date date not null default current_date,
  category     text not null,
  amount       numeric(12,2) not null check (amount > 0),
  description  text,
  receipt_path text,
  payment_method text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_exp_date on public.expenses(expense_date desc);
create index if not exists idx_exp_vehicle on public.expenses(vehicle_id);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS / LOCATIONS / AUDIT / SEQUENCES / SETTINGS
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  role_target app_role,
  title       text not null,
  body        text,
  kind        text not null default 'info',
  entity      text,
  entity_id   uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications(user_id, read_at);

create table if not exists public.driver_locations (
  id          bigserial primary key,
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  trip_id     uuid references public.trips(id) on delete set null,
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  accuracy_m  numeric(8,2),
  speed_kmph  numeric(8,2),
  consent     boolean not null default false,
  recorded_at timestamptz not null default now()
);
create index if not exists idx_loc_driver_time on public.driver_locations(driver_id, recorded_at desc);
-- retention helper: delete rows older than N days (schedule with pg_cron)
create or replace function public.purge_old_locations(days int default 30)
returns void language sql security definer as $$
  delete from public.driver_locations where recorded_at < now() - (days || ' days')::interval;
$$;

create table if not exists public.audit_logs (
  id         bigserial primary key,
  actor_id   uuid references auth.users(id),
  actor_name text,
  action     text not null,
  entity     text,
  entity_id  text,
  detail     jsonb,
  ip         inet,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_time on public.audit_logs(created_at desc);
create index if not exists idx_audit_entity on public.audit_logs(entity, entity_id);

-- Sequential LR / TCC / Trip numbering (safe under concurrency)
create table if not exists public.document_sequences (
  prefix      text primary key,        -- 'LR' | 'TCC' | 'TRIP'
  last_number int not null default 0
);
insert into public.document_sequences(prefix,last_number) values ('LR',0),('TCC',0),('TRIP',0)
on conflict (prefix) do nothing;

create or replace function public.next_document_no(p_prefix text)
returns text language plpgsql security definer as $$
declare n int;
begin
  update public.document_sequences
     set last_number = last_number + 1
   where prefix = p_prefix
  returning last_number into n;
  if n is null then
    insert into public.document_sequences(prefix,last_number) values (p_prefix,1)
    on conflict (prefix) do update set last_number = public.document_sequences.last_number + 1
    returning last_number into n;
  end if;
  return p_prefix || '/' || lpad(n::text, 4, '0');
end $$;

create table if not exists public.app_settings (
  key   text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.app_settings(key,value) values
 ('notify_days','30'::jsonb),
 ('company', jsonb_build_object(
    'name','A.H. TRANSPORT CO.',
    'address','Unit No. 11, 2nd Floor, ''A'' Wing, Sita Estate, Aziz Baug, Chembur, Mumbai - 400074',
    'email','ahtransportco@gmail.com','website','ahtransportco.com',
    'gstin','27AWAPK1208Q1ZF','pan','AWAPK1208Q',
    'phones', jsonb_build_array('99876 76737','99309 15750','98922 74370','96196 47420'))),
 ('tracking_policy','"Tracking only during trip hours with explicit driver consent. Location retained 30 days."'::jsonb)
on conflict (key) do nothing;
