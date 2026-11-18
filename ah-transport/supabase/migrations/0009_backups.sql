-- Nightly snapshot of all records, kept for 14 days. Run once in Supabase SQL Editor.
create table if not exists public.backup_snapshots (
  id bigserial primary key,
  taken_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.backup_snapshots enable row level security;
drop policy if exists p_bk_read on public.backup_snapshots;
create policy p_bk_read on public.backup_snapshots for select using (public.is_admin());

create or replace function public.take_backup() returns void
language plpgsql security definer set search_path = public as $$
declare t record; snap jsonb := '{}'::jsonb; rows jsonb;
begin
  for t in select tablename from pg_tables
           where schemaname = 'public' and tablename not in ('backup_snapshots','driver_reports')
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t.tablename) into rows;
    snap := snap || jsonb_build_object(t.tablename, rows);
  end loop;
  insert into public.backup_snapshots(data) values (snap);
  delete from public.backup_snapshots where taken_at < now() - interval '14 days';
end $$;
revoke all on function public.take_backup() from public, anon, authenticated;

-- Schedule at 02:00 IST (20:30 UTC). Needs pg_cron (Database > Extensions); skipped safely if unavailable.
do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule('ah-nightly-backup') from cron.job where jobname = 'ah-nightly-backup';
  perform cron.schedule('ah-nightly-backup', '30 20 * * *', 'select public.take_backup()');
exception when others then
  raise notice 'pg_cron not enabled: enable it under Database > Extensions, then run this file again.';
end $$;
select public.take_backup();
