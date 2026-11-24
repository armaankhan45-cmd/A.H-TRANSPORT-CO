-- Let a Super Admin add and delete login users from inside the app. Safe to run more than once.
create extension if not exists pgcrypto;

create or replace function public.admin_create_user(p_email text, p_password text, p_name text, p_role text, p_driver uuid default null)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid := gen_random_uuid(); em text := lower(trim(p_email));
begin
  if coalesce(public.current_role_key(), '') <> 'super_admin' then raise exception 'Only a Super Admin can add users'; end if;
  if p_role not in ('super_admin','admin','office_staff','accounts_staff','driver') then raise exception 'Unknown role'; end if;
  if em = '' or length(p_password) < 6 then raise exception 'Email and a password of 6+ characters are required'; end if;
  if exists (select 1 from auth.users where lower(email) = em) then raise exception 'This email already exists'; end if;
  insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                         created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_name), now(), now(), '', '', '', '');
  insert into auth.identities(id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  insert into public.profiles(id, email, full_name, role, driver_id) values (uid, em, coalesce(nullif(trim(p_name), ''), split_part(em, '@', 1)), p_role::app_role, p_driver)
    on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, driver_id = excluded.driver_id;
  return uid;
end $$;

create or replace function public.admin_delete_user(p_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if coalesce(public.current_role_key(), '') <> 'super_admin' then raise exception 'Only a Super Admin can delete users'; end if;
  if p_id = auth.uid() then raise exception 'You cannot delete your own account'; end if;
  delete from auth.users where id = p_id;
end $$;

create or replace function public.admin_set_password(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if coalesce(public.current_role_key(), '') <> 'super_admin' then raise exception 'Only a Super Admin can change passwords'; end if;
  if length(p_password) < 6 then raise exception 'Password must be 6+ characters'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_id;
end $$;

revoke all on function public.admin_create_user(text, text, text, text, uuid) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_create_user(text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
