-- Two firms (A.H. Transport Co. = 'ah-transport', AH Logistic India = 'ah-logistic') share one database.
-- Every business record carries its firm; LR / TCC / TRIP numbers run separately per firm.
-- Existing rows stay with 'ah-transport'. Safe to run more than once.
do $$
declare t text;
begin
  foreach t in array array['vehicles','vehicle_documents','vehicle_maintenance','drivers','driver_documents','driver_status_history',
                           'driver_assignments','customers','trips','lr_documents','tcc_documents','salary_records','expenses']
  loop
    execute format('alter table public.%I add column if not exists firm text not null default %L', t, 'ah-transport');
    execute format('create index if not exists %I on public.%I(firm)', t || '_firm_idx', t);
  end loop;
end $$;

alter table public.document_sequences add column if not exists firm text not null default 'ah-transport';
alter table public.document_sequences drop constraint if exists document_sequences_pkey;
alter table public.document_sequences add primary key (firm, prefix);
insert into public.document_sequences(firm,prefix,last_number)
select 'ah-logistic', p, 0 from unnest(array['LR','TCC','TRIP']) p on conflict do nothing;

drop function if exists public.next_document_no(text);
create or replace function public.next_document_no(p_prefix text, p_firm text default 'ah-transport')
returns text language plpgsql security definer as $$
declare n int;
begin
  insert into public.document_sequences(firm,prefix,last_number) values (p_firm,p_prefix,1)
  on conflict (firm,prefix) do update set last_number = public.document_sequences.last_number + 1
  returning last_number into n;
  return p_prefix || '/' || lpad(n::text, 4, '0');
end $$;

-- numbers are unique per firm, not globally
alter table public.trips         drop constraint if exists trips_trip_no_key;
alter table public.lr_documents  drop constraint if exists lr_documents_lr_no_key;
alter table public.tcc_documents drop constraint if exists tcc_documents_tcc_no_key;
create unique index if not exists trips_firm_trip_no_uq on public.trips(firm, trip_no);
create unique index if not exists lr_firm_lr_no_uq      on public.lr_documents(firm, lr_no);
create unique index if not exists tcc_firm_tcc_no_uq    on public.tcc_documents(firm, tcc_no);
