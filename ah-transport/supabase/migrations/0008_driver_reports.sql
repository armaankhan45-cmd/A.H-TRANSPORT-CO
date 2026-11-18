-- Driver self-service: a driver opens the same private link used for location and can send the office
-- a trip photo, a toll receipt or a breakdown report. No login. Safe to run more than once.
create table if not exists public.driver_reports (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  kind text not null check (kind in ('Trip photo','Toll receipt','Breakdown')),
  note text,
  photo text,
  status text not null default 'New' check (status in ('New','Done')),
  created_at timestamptz not null default now()
);
create index if not exists driver_reports_created_idx on public.driver_reports(created_at desc);
alter table public.driver_reports enable row level security;

drop policy if exists p_dr_read   on public.driver_reports;
drop policy if exists p_dr_write  on public.driver_reports;
create policy p_dr_read  on public.driver_reports for select using (public.is_admin() or public.has_permission('drivers'));
create policy p_dr_write on public.driver_reports for all    using (public.is_admin() or public.has_permission('drivers'))
                                                             with check (public.is_admin() or public.has_permission('drivers'));

-- the only way a driver can add a report: a valid private token, a known type, a sane size, max 40 a day
create or replace function public.submit_driver_report(p_token text, p_kind text, p_note text, p_photo text)
returns boolean language plpgsql security definer set search_path = public as $$
declare did uuid;
begin
  select id into did from public.drivers where track_token = p_token and p_token is not null and length(p_token) >= 16;
  if did is null then return false; end if;
  if p_kind not in ('Trip photo','Toll receipt','Breakdown') then return false; end if;
  if coalesce(length(p_photo), 0) > 900000 or coalesce(length(p_note), 0) > 2000 then return false; end if;
  if coalesce(length(p_photo), 0) = 0 and coalesce(length(trim(p_note)), 0) = 0 then return false; end if;
  if (select count(*) from public.driver_reports where driver_id = did and created_at > now() - interval '1 day') >= 40 then return false; end if;
  insert into public.driver_reports(driver_id, kind, note, photo) values (did, p_kind, nullif(trim(p_note), ''), nullif(p_photo, ''));
  return true;
end $$;
grant execute on function public.submit_driver_report(text, text, text, text) to anon, authenticated;
