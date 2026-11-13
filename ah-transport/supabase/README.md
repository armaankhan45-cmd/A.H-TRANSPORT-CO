# Supabase setup — A.H. Transport Co. TMS

## 1. Create the project (free tier)
1. https://supabase.com → New project (region: `ap-south-1` Mumbai is closest).
2. Save the database password somewhere safe.
3. Project Settings → API → copy `Project URL` and `anon public` key into `.env.local`.

## 2. Apply migrations (in order)
SQL Editor → paste and run each file:

| Order | File | What it does |
|---|---|---|
| 1 | `migrations/0001_init.sql` | Tables, enums, constraints, indexes, triggers, sequences, settings |
| 2 | `migrations/0002_rls.sql` | Helper functions, RLS policies, role→permission seed |
| 3 | `migrations/0003_storage.sql` | Private buckets + storage policies |
| 4 | `migrations/0004_seed_demo.sql` | **Optional** demo data (fake IDs only) |

Or with the CLI:

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-ref>
supabase db push
```

## 3. Create the first Super Admin
1. Authentication → Users → **Add user** (email + password, auto-confirm).
2. Then in SQL Editor:

```sql
update public.profiles
   set role = 'super_admin', full_name = 'Super Admin'
 where email = 'admin@ahtransportco.com';
```

3. Create office/accounts users the same way, then set `role` to
   `admin` / `office_staff` / `accounts_staff`.
4. For a driver: create the driver row first, then link the auth user:

```sql
update public.profiles
   set role = 'driver',
       driver_id = (select id from public.drivers where mobile = '9820022222')
 where email = 'driver@ahtransportco.com';
```

## 4. Switch the app to Supabase
`.env.local`:
```
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 5. Verify security (do this before entering real data)
Run as a **driver** account, from the app or SQL editor with the driver JWT:

```sql
-- must return ONLY your own salary rows
select * from public.salary_records;
-- must return ONLY your own driver row
select * from public.drivers;
-- must fail / return nothing for other drivers
select * from public.drivers where id <> public.my_driver_id();
```

Run as **office_staff**: `select * from public.salary_records;` → must return 0 rows.

## 6. Housekeeping
- Enable **daily backups** (Database → Backups). Free tier is limited — also keep scheduled `pg_dump` exports.
- Schedule retention purge (needs `pg_cron`):
  `select cron.schedule('purge-locations','0 3 * * *', $$select public.purge_old_locations(30)$$);`
- Enable MFA for the Super Admin and use a unique strong password.
