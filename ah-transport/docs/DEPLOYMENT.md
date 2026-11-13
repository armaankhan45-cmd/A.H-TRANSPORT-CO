# Deployment, backup and operations

> **Current release status:** this repository builds and can be hosted as a demo, but the app UI still persists data in browser localStorage. Supabase schema, RLS and client helpers are present; authentication and CRUD writes are not yet connected end-to-end. Do **not** publish this as a production system for real staff, private records, or financial data. The Supabase environment variables alone do not complete the integration.

## Vercel demo deployment (free tier, subject to provider limits)

1. Extract the project ZIP and test locally with `npm install` then `npm run build`.
2. Create a private GitHub repository and upload the project files (exclude `node_modules/` and `dist/`).
3. In Vercel, choose **Add New → Project**, import the repository, use framework preset **Vite**, build command `npm run build`, and output directory `dist`.
4. Leave `VITE_DATA_MODE` at `demo` (or unset it). **Do not set it to `supabase` yet.** No secrets are needed for the demo build.
5. Deploy. Test the public URL using demo credentials only. Anyone who can reach a public demo can use the published demo login; do not put real data in it.
6. For production go-live, first complete Supabase Auth + repository writes + private uploads, run all migrations on a test project, verify RLS and file authorization for every role, then deploy to a restricted preview and complete the go-live checklist below.

Vercel free-tier availability, limits and terms can change. A custom domain may have separate costs. Hosting the current demo does not provide multi-user shared persistence: localStorage is per browser/device.

## Netlify / Cloudflare Pages (alternative)

- Build command `npm run build`, publish directory `dist`.
- Add the same `VITE_*` env vars. SPA fallback: `/* → /index.html (200)`.

## Backup plan

| Layer | Frequency | How |
|---|---|---|
| Database | Daily (Supabase backups) + weekly dump | `pg_dump "$DB_URL" -Fc -f ah_tms_$(date +%F).dump` in a GitHub Action; keep 8 weekly copies in a private repo/Drive |
| Storage files | Weekly | `supabase storage cp -r ss:///vehicle-docs ./backup/vehicle-docs` (CLI) |
| App snapshot | On demand | Users & Settings → Settings & Backup → Export backup (JSON) |
| Code | Every change | Git + tagged releases |

### Restore drill (do this once before go-live)

```bash
# 1. Restore schema+data into a scratch project
pg_restore --clean --no-owner -d "$SCRATCH_DB_URL" ah_tms_2026-11-01.dump
# 2. Point a preview deployment at the scratch project and log in as each role
# 3. Verify counts: vehicles, drivers, lr_documents, salary_records
```

## Monitoring & maintenance

- Uptime: free UptimeRobot ping on the deployed URL + a `/` health page.
- Supabase free projects pause after inactivity → weekly login or a scheduled
  lightweight request.
- Review `audit_logs` monthly (Users & Settings → Audit Log).
- Purge old locations: `select public.purge_old_locations(30);` via pg_cron.
- Rotate the anon key only if abused (it is public by design; RLS is the control).
- Update dependencies quarterly (`npm outdated`, `npm audit`).

## Go-live checklist

- [ ] Demo users deleted, real users created with strong passwords + MFA on admin.
- [ ] `VITE_DATA_MODE=supabase` verified; RLS queries from docs/SECURITY.md pass.
- [ ] Private buckets confirmed (never `public = true`).
- [ ] Company details confirmed in `src/company.ts` (address, phones, GSTIN, PAN).
- [ ] LR/TCC printed sample compared with the original stationery and signed off.
- [ ] Opening balances entered: vehicles, drivers, customers, live papers with real
      expiry dates, pending salaries.
- [ ] Staff trained: expiry dashboard → maintenance → LR/TCC → trips → salary.
- [ ] Backup job running and one restore tested.
