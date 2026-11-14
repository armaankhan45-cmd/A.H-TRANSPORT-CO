-- 0005_app_integration.sql
-- Run AFTER 0001-0003 (skip 0004 demo data on a real project).
-- Adds the columns/tables the React app needs and closes a few gaps.

-- 1. Columns the app stores that the first schema lacked ------------------
alter table public.trips            add column if not exists lr_no         text;
alter table public.trips            add column if not exists customer_name text;
alter table public.driver_documents add column if not exists file_name     text;

-- 2. Driver status history (joined / resigned / rejoined) -----------------
create table if not exists public.driver_status_history (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  status_date date not null default current_date,
  status      text not null,
  note        text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table public.driver_status_history enable row level security;

drop policy if exists p_dsh_read  on public.driver_status_history;
drop policy if exists p_dsh_write on public.driver_status_history;
create policy p_dsh_read on public.driver_status_history
  for select using (public.has_permission('drivers') or public.is_my_driver(driver_id));
create policy p_dsh_write on public.driver_status_history
  for all using (public.is_admin() or public.has_permission('drivers'))
  with check (public.is_admin() or public.has_permission('drivers'));

-- 3. A driver may withdraw location consent by deleting their own rows ----
drop policy if exists p_loc_self_delete on public.driver_locations;
create policy p_loc_self_delete on public.driver_locations
  for delete using (driver_id = public.my_driver_id());

-- 4. Lock down helper functions: signed-in users only ---------------------
revoke execute on function public.next_document_no(text) from public, anon;
grant  execute on function public.next_document_no(text) to authenticated;
revoke execute on function public.purge_old_locations(int) from public, anon, authenticated;

-- 5. Helpful indexes ------------------------------------------------------
create index if not exists idx_trips_driver      on public.trips(driver_id);
create index if not exists idx_loc_driver_time   on public.driver_locations(driver_id, recorded_at desc);
create index if not exists idx_audit_created     on public.audit_logs(created_at desc);
