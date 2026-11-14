# Going live with Supabase (A.H. Transport TMS)

## 1. Create the project
1. supabase.com → New project. Region: **Mumbai (ap-south-1)**. Save the database password somewhere safe.
2. **Authentication → Sign In / Providers → Email**: turn **OFF "Allow new users to sign up"** (otherwise anyone can create an account). Keep "Confirm email" on.
3. **Authentication → Policies**: set a minimum password length of 10.

## 2. Create the database
SQL Editor → run these files from `supabase/migrations/`, in order:
`0001_init.sql` → `0002_rls.sql` → `0003_storage.sql` → **`0005_app_integration.sql`**
(**Do NOT run `0004_seed_demo.sql`** on the real project.)

## 3. Create your admin login
1. Authentication → Users → **Add user** → your email + strong password (tick "Auto confirm").
2. SQL Editor, make yourself Super Admin:
   ```sql
   update public.profiles set role = 'super_admin', full_name = 'Armaan' where email = 'YOUR_EMAIL';
   ```
3. Add other staff the same way (Add user), then set their role in the app under Users, Roles & Security
   (or with SQL). For a driver: create the driver in the app first, then
   `update public.profiles set role='driver', driver_id='<driver uuid>' where email='...';`

## 4. Connect the app (Vercel)
Project Settings → Environment Variables (Production):
```
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```
Use the **anon** key only. Never put the `service_role` key in Vercel env vars that start with VITE_ or in the code.
Redeploy. Demo logins disappear and real sign-in is required.

## 5. Test the security BEFORE real data
- Log in as each role; confirm Office Staff can't open Salary, Driver sees only the Driver app.
- Open the site in a private window: you must see only the login screen.
- In the browser Network tab, check requests to `/rest/v1/...` return 401/empty without logging in.
- Upload a vehicle document, copy its link, wait over 1 hour: it should stop working (signed URL expired).

## 6. Switch on protection
- Settings → Auth: enable MFA (TOTP) and use it for your Super Admin account.
- Database → Backups: enable daily backups (Pro plan) or schedule `pg_dump` exports.
- Make the GitHub repo **private**.
- Rotate the Supabase keys if they were ever shared.

## What changed in the code
- `src/lib/supabase.ts`   client, private file upload, signed URLs, atomic LR/TCC/TRIP numbers
- `src/lib/mappers.ts`    app record ⇄ database row mapping
- `src/lib/sync.ts`       load everything allowed by RLS; save only what changed
- `src/store.tsx`         real Supabase login; localStorage only in demo mode
- Login / App / Admin / Expenses / Maintenance: small cloud-mode tweaks
- `0005_app_integration.sql`: extra columns, driver status history, locked-down functions

Known limits: new users are created in the Supabase dashboard (not from the app);
the Tracking page's "simulate location" button is blocked by security rules on purpose.
