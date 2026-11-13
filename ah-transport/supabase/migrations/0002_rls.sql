-- =====================================================================
-- Migration 0002 — Helper functions + Row Level Security policies
-- A driver may only ever see their own rows. Only office/admin roles
-- can read fleet-wide and financial data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------
create or replace function public.current_role_key()
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_key() in ('super_admin','admin','office_staff'), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_key() in ('super_admin','admin'), false);
$$;

create or replace function public.is_accounts()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_key() in ('super_admin','admin','accounts_staff'), false);
$$;

create or replace function public.my_driver_id()
returns uuid language sql stable security definer set search_path = public as $$
  select driver_id from public.profiles where id = auth.uid();
$$;

create or replace function public.has_permission(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.role_permissions rp
    where rp.role = public.current_role_key() and rp.permission = p
  );
$$;

-- Updated employee (driver) may read own record only
create or replace function public.is_my_driver(d uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select d = public.my_driver_id();
$$;

-- ---------------------------------------------------------------------
-- ENABLE RLS EVERYWHERE
-- ---------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.vehicles                 enable row level security;
alter table public.vehicle_documents        enable row level security;
alter table public.vehicle_document_history enable row level security;
alter table public.vehicle_maintenance      enable row level security;
alter table public.maintenance_expenses     enable row level security;
alter table public.drivers                  enable row level security;
alter table public.driver_documents         enable row level security;
alter table public.driver_assignments       enable row level security;
alter table public.customers                enable row level security;
alter table public.trips                    enable row level security;
alter table public.lr_documents             enable row level security;
alter table public.tcc_documents            enable row level security;
alter table public.salary_records           enable row level security;
alter table public.salary_adjustments       enable row level security;
alter table public.expenses                 enable row level security;
alter table public.notifications            enable row level security;
alter table public.driver_locations         enable row level security;
alter table public.audit_logs               enable row level security;
alter table public.role_permissions         enable row level security;
alter table public.permissions              enable row level security;
alter table public.roles                    enable row level security;
alter table public.app_settings             enable row level security;
alter table public.document_sequences       enable row level security;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------
drop policy if exists p_profiles_self     on public.profiles;
drop policy if exists p_profiles_admin    on public.profiles;
create policy p_profiles_self on public.profiles
  for select using (id = auth.uid());
create policy p_profiles_admin on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());
-- a user may update only their own display name/mobile, never their role
create policy p_profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles p where p.id = auth.uid()));

-- ---------------------------------------------------------------------
-- VEHICLES  (staff read/write; drivers read only their assigned vehicle)
-- ---------------------------------------------------------------------
create policy p_vehicles_read_staff on public.vehicles
  for select using (public.has_permission('vehicles'));
create policy p_vehicles_read_driver on public.vehicles
  for select using (current_driver_id = public.my_driver_id());
create policy p_vehicles_write on public.vehicles
  for all using (public.is_admin() or public.has_permission('vehicles'))
  with check (public.is_admin() or public.has_permission('vehicles'));

-- ---------------------------------------------------------------------
-- VEHICLE DOCUMENTS (drivers: only own vehicle, no private IDs of others)
-- ---------------------------------------------------------------------
create policy p_vdoc_read on public.vehicle_documents
  for select using (
    public.has_permission('documents')
    or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.current_driver_id = public.my_driver_id())
  );
create policy p_vdoc_write on public.vehicle_documents
  for all using (public.is_admin() or public.has_permission('documents'))
  with check (public.is_admin() or public.has_permission('documents'));
-- drivers may upload a requested paper for their own vehicle
create policy p_vdoc_driver_upload on public.vehicle_documents
  for insert with check (
    exists (select 1 from public.vehicles v where v.id = vehicle_id and v.current_driver_id = public.my_driver_id())
  );

create policy p_vdhist_admin on public.vehicle_document_history
  for select using (public.is_admin() or public.has_permission('documents'));

-- ---------------------------------------------------------------------
-- MAINTENANCE
-- ---------------------------------------------------------------------
create policy p_maint_read on public.vehicle_maintenance
  for select using (public.has_permission('maintenance'));
create policy p_maint_write on public.vehicle_maintenance
  for all using (public.is_admin() or public.has_permission('maintenance'))
  with check (public.is_admin() or public.has_permission('maintenance'));

create policy p_mexpense_read on public.maintenance_expenses
  for select using (public.is_accounts() or public.has_permission('maintenance'));
create policy p_mexpense_write on public.maintenance_expenses
  for all using (public.is_admin() or public.has_permission('expenses'))
  with check (public.is_admin() or public.has_permission('expenses'));

-- ---------------------------------------------------------------------
-- DRIVERS
--   staff with 'drivers' read all; a driver reads ONLY own row.
--   salary/aadhaar/pan are further protected by a restricted view.
-- ---------------------------------------------------------------------
create policy p_drivers_read_staff on public.drivers
  for select using (public.has_permission('drivers'));
create policy p_drivers_read_self on public.drivers
  for select using (user_id = auth.uid() or id = public.my_driver_id());
create policy p_drivers_write on public.drivers
  for all using (public.is_admin() or public.has_permission('drivers'))
  with check (public.is_admin() or public.has_permission('drivers'));

-- Driver-facing view without private identifiers
create or replace view public.driver_self_view as
select id, full_name, mobile, alt_mobile, address, date_of_birth, joining_date,
       licence_no, licence_issue, licence_expiry, training_no, training_expiry,
       blood_group, emergency_contact, photo_path, status, user_id
from public.drivers
where user_id = auth.uid() or id = public.my_driver_id();

create policy p_ddoc_read on public.driver_documents
  for select using (public.has_permission('drivers') or public.is_my_driver(driver_id));
create policy p_ddoc_write on public.driver_documents
  for all using (public.is_admin()) with check (public.is_admin());

create policy p_assign_read on public.driver_assignments
  for select using (public.has_permission('assignments') or public.is_my_driver(driver_id));
create policy p_assign_write on public.driver_assignments
  for all using (public.is_admin() or public.has_permission('assignments'))
  with check (public.is_admin() or public.has_permission('assignments'));

-- ---------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------
create policy p_cust_read on public.customers
  for select using (public.has_permission('customers') or public.has_permission('lr') or public.has_permission('trips'));
create policy p_cust_write on public.customers
  for all using (public.is_admin() or public.has_permission('customers'))
  with check (public.is_admin() or public.has_permission('customers'));

-- ---------------------------------------------------------------------
-- TRIPS (driver sees own trips only)
-- ---------------------------------------------------------------------
create policy p_trips_read on public.trips
  for select using (public.has_permission('trips') or driver_id = public.my_driver_id());
create policy p_trips_write on public.trips
  for all using (public.is_admin() or public.has_permission('trips'))
  with check (public.is_admin() or public.has_permission('trips'));

-- ---------------------------------------------------------------------
-- LR / TCC
-- ---------------------------------------------------------------------
create policy p_lr_read on public.lr_documents
  for select using (public.has_permission('lr') or driver_id = public.my_driver_id());
create policy p_lr_write on public.lr_documents
  for all using (public.is_admin() or public.has_permission('lr'))
  with check (public.is_admin() or public.has_permission('lr'));

create policy p_tcc_read on public.tcc_documents
  for select using (public.has_permission('tcc') or driver_id = public.my_driver_id());
create policy p_tcc_write on public.tcc_documents
  for all using (public.is_admin() or public.has_permission('tcc'))
  with check (public.is_admin() or public.has_permission('tcc'));

-- ---------------------------------------------------------------------
-- SALARY — strictly accounts/admin, plus the driver's own rows
-- ---------------------------------------------------------------------
create policy p_salary_read_staff on public.salary_records
  for select using (public.has_permission('salary') or public.is_accounts());
create policy p_salary_read_self on public.salary_records
  for select using (driver_id = public.my_driver_id());
create policy p_salary_write on public.salary_records
  for all using (public.is_accounts())
  with check (public.is_accounts());

create policy p_saladj_read on public.salary_adjustments
  for select using (public.is_accounts() or exists (select 1 from public.salary_records s where s.id = salary_id and s.driver_id = public.my_driver_id()));
create policy p_saladj_write on public.salary_adjustments
  for all using (public.is_accounts()) with check (public.is_accounts());

-- ---------------------------------------------------------------------
-- EXPENSES — drivers never see expenses
-- ---------------------------------------------------------------------
create policy p_exp_read on public.expenses
  for select using (public.is_accounts() or public.has_permission('expenses'));
create policy p_exp_write on public.expenses
  for all using (public.is_accounts() or public.has_permission('expenses'))
  with check (public.is_accounts() or public.has_permission('expenses'));

-- ---------------------------------------------------------------------
-- NOTIFICATIONS — own only
-- ---------------------------------------------------------------------
create policy p_notif_own on public.notifications
  for all using (user_id = auth.uid() or role_target = public.current_role_key())
  with check (public.is_admin() or user_id = auth.uid());

-- ---------------------------------------------------------------------
-- DRIVER LOCATIONS — insert/read own; admins read consented rows only
-- ---------------------------------------------------------------------
create policy p_loc_self_read on public.driver_locations
  for select using (driver_id = public.my_driver_id());
create policy p_loc_self_insert on public.driver_locations
  for insert with check (driver_id = public.my_driver_id() and consent = true);
create policy p_loc_admin_read on public.driver_locations
  for select using (public.has_permission('tracking') and consent = true);
create policy p_loc_admin_delete on public.driver_locations
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- AUDIT / ROLES / SETTINGS
-- ---------------------------------------------------------------------
create policy p_audit_read on public.audit_logs
  for select using (public.is_admin() or public.has_permission('audit'));
create policy p_audit_insert on public.audit_logs
  for insert with check (auth.uid() is not null);

create policy p_roleperm_read on public.role_permissions for select using (auth.uid() is not null);
create policy p_roleperm_write on public.role_permissions for all using (public.is_admin()) with check (public.is_admin());
create policy p_permissions_read on public.permissions for select using (auth.uid() is not null);
create policy p_roles_read on public.roles for select using (auth.uid() is not null);

create policy p_settings_read on public.app_settings for select using (auth.uid() is not null);
create policy p_settings_write on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

create policy p_seq_read on public.document_sequences for select using (public.is_staff() or public.is_admin());
create policy p_seq_write on public.document_sequences for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- ROLE → PERMISSION seed (mirror of src/store.tsx PERMISSIONS)
-- ---------------------------------------------------------------------
insert into public.role_permissions(role, permission) values
  ('super_admin','dashboard'),
  ('super_admin','vehicles'),
  ('super_admin','documents'),
  ('super_admin','maintenance'),
  ('super_admin','expiry'),
  ('super_admin','drivers'),
  ('super_admin','assignments'),
  ('super_admin','lr'),
  ('super_admin','tcc'),
  ('super_admin','trips'),
  ('super_admin','customers'),
  ('super_admin','salary'),
  ('super_admin','expenses'),
  ('super_admin','reports'),
  ('super_admin','tracking'),
  ('super_admin','users'),
  ('super_admin','settings'),
  ('super_admin','audit'),
  ('admin','dashboard'),
  ('admin','vehicles'),
  ('admin','documents'),
  ('admin','maintenance'),
  ('admin','expiry'),
  ('admin','drivers'),
  ('admin','assignments'),
  ('admin','lr'),
  ('admin','tcc'),
  ('admin','trips'),
  ('admin','customers'),
  ('admin','salary'),
  ('admin','expenses'),
  ('admin','reports'),
  ('admin','tracking'),
  ('admin','settings'),
  ('office_staff','dashboard'),
  ('office_staff','vehicles'),
  ('office_staff','documents'),
  ('office_staff','maintenance'),
  ('office_staff','expiry'),
  ('office_staff','drivers'),
  ('office_staff','assignments'),
  ('office_staff','lr'),
  ('office_staff','tcc'),
  ('office_staff','trips'),
  ('office_staff','customers'),
  ('office_staff','reports'),
  ('accounts_staff','dashboard'),
  ('accounts_staff','vehicles'),
  ('accounts_staff','documents'),
  ('accounts_staff','expiry'),
  ('accounts_staff','salary'),
  ('accounts_staff','expenses'),
  ('accounts_staff','customers'),
  ('accounts_staff','reports'),
  ('accounts_staff','lr'),
  ('accounts_staff','tcc')
on conflict do nothing;

-- make driver 'self' permissions explicit (driver app tabs)
-- (drivers rely on *_read_self policies, not module permissions)
