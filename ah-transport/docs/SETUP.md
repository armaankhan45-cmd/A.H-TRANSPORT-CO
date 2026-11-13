# Setup guide — A.H. Transport Co. TMS

## A. Run locally (demo mode)

Requirements: Node.js 20+ (tested on Node 20 / npm 10).

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with `admin@ahtransportco.com` / `admin123`.

Data lives in `localStorage` under the key `ah_tms_db_v1`; the session under
`ah_tms_session_v1`. **Users & Settings → Settings & Backup → Reset demo data**
restores the seed.

Useful commands:

```bash
npm run build     # production build (tsc -b && vite build)
npm run preview   # preview the built bundle
npm run lint      # oxlint
```

## B. Connect Supabase (real database, auth, private files)

1. Create a free project at https://supabase.com (region `ap-south-1`).
2. Copy Project URL + anon key into `.env.local`:

```env
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

3. Apply the migrations in order — see [../supabase/README.md](../supabase/README.md):
   `0001_init.sql` → `0002_rls.sql` → `0003_storage.sql` → `0004_seed_demo.sql` (optional).
4. Create users in Authentication, then set their role in `public.profiles`
   (`super_admin`, `admin`, `office_staff`, `accounts_staff`, `driver`).
5. For driver accounts link `profiles.driver_id` to the driver row — this is what
   makes RLS restrict them to their own data.
6. Restart `npm run dev` so Vite picks up the new env file.

### Roles to create first

| Person | profiles.role | Notes |
|---|---|---|
| Office owner | `super_admin` | full access incl. users/audit |
| Manager | `admin` | everything except user management |
| Billing clerk | `office_staff` | vehicles, drivers, LR, TCC, trips, reports |
| Accountant | `accounts_staff` | salary, expenses, LR/TCC read, reports |
| Each driver | `driver` + driver_id | driver app only |

## C. Deploy free (Vercel)

```bash
npm i -g vercel
vercel            # framework: Vite, build: npm run build, output: dist
```

Add the three `VITE_*` env vars in Vercel → Project → Settings → Environment
Variables. PWA install and the service worker require HTTPS (Vercel gives it free).

Full deployment/backup notes: [DEPLOYMENT.md](DEPLOYMENT.md).

## D. Troubleshooting

| Symptom | Fix |
|---|---|
| Login rejected | In demo mode the password must match the seeded users; in Supabase mode the user must be auto-confirmed and `profiles.is_active = true` |
| Driver sees empty screens | `profiles.driver_id` not linked to a driver row |
| "No matches" search | Search covers vehicles, drivers, LR, TCC, trips, customers |
| Upload rejected | Demo mode caps files at ~1.5 MB (browser storage). Production uses Supabase Storage (10 MB per file per bucket limit) |
| PDF text overflows | Long values wrap; shorten address/detail or adjust `splitTextToSize` in `src/pdf.ts` |
| Blank screen after deploy | Missing `VITE_SUPABASE_*` env vars while `VITE_DATA_MODE=supabase` |
| Print cuts the LR | Use A4, margins "Default"; the print stylesheet sets `@page { size: A4 }` |
