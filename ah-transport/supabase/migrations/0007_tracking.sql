-- Consent-based tracking WITHOUT giving drivers a login.
-- Admin sends a driver a private link (…/?track=<token>). The driver opens it on their phone, taps "Allow",
-- and the phone sends its position. Nothing is collected until the driver taps Allow; "Stop" deletes the stored points.
-- Safe to run more than once.
alter table public.drivers add column if not exists track_token text;
create unique index if not exists drivers_track_token_uq on public.drivers(track_token) where track_token is not null;

-- what the driver sees on the consent screen
create or replace function public.tracking_info(p_token text)
returns json language sql security definer set search_path = public as $$
  select json_build_object('name', d.full_name,
           'vehicle', (select v.reg_no from public.vehicles v where v.current_driver_id = d.id limit 1))
  from public.drivers d where d.track_token = p_token and p_token is not null and length(p_token) >= 16 limit 1;
$$;

-- the phone reports a position (only valid for a real token; keeps the last 3 days)
create or replace function public.share_location(p_token text, p_lat double precision, p_lng double precision,
                                                 p_acc numeric default null, p_speed numeric default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare did uuid;
begin
  select id into did from public.drivers where track_token = p_token and p_token is not null and length(p_token) >= 16;
  if did is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then return false; end if;
  insert into public.driver_locations(driver_id, lat, lng, accuracy_m, speed_kmph, consent) values (did, p_lat, p_lng, p_acc, p_speed, true);
  delete from public.driver_locations where driver_id = did and recorded_at < now() - interval '3 days';
  return true;
end $$;

-- driver taps "Stop sharing": their stored points are removed
create or replace function public.stop_sharing(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare did uuid;
begin
  select id into did from public.drivers where track_token = p_token and p_token is not null and length(p_token) >= 16;
  if did is null then return false; end if;
  delete from public.driver_locations where driver_id = did;
  return true;
end $$;

grant execute on function public.tracking_info(text), public.share_location(text,double precision,double precision,numeric,numeric), public.stop_sharing(text) to anon, authenticated;
