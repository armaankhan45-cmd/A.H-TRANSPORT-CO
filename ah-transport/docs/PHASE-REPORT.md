# Phase report — A.H. Transport Co. TMS

## Phase 1 — Foundation, authentication, roles, dashboard, vehicles, drivers ✅
- Vite + React + TypeScript + Tailwind v4, responsive branded shell and company details.
- Five-role model, dashboard with fleet, expiry, finance, maintenance and activity metrics.
- Vehicle and driver CRUD, status and assignment details.

## Phase 2 — Papers, expiry, maintenance, assignments, notifications ✅
- Vehicle/driver document registers, expiry tiers, renewal history and private-storage integration helpers.
- Maintenance start/expected/actual dates, calculated duration, calendar, history, costs and vehicle availability guard/override.
- Assignment history and in-app notifications.

## Phase 3 — LR, TCC, PDFs, printing ✅
- Sequential LR/TCC numbers, draft/final workflow, A4 preview/print, PDF, share actions, search/history.
- LR weight calculation, customer/vehicle/driver autofill and company details.
- **Reference-image limitation:** the LR and TCC photos mentioned in the request were not attached in the accessible conversation/workspace. These are careful standard-format approximations, not verified exact replicas. Supply the photos to tune them.

## Phase 4 — Trips, customers, salary, expenses ✅
- Nine trip statuses; customer records; salary formula and payment status; expenses and exports.

## Phase 5 — Driver app, consent-based GPS, reports ✅
- Driver-scoped portal for own vehicle, papers, trips, salary, and permitted documents; no salary navigation for drivers.
- Explicit-consent location sharing and disclosure that PWA cannot guarantee continuous background tracking.
- Reports with PDF and Excel export.

## Phase 6 — Verification, deployment documentation, PWA ✅ (integration caveats listed below)
- PWA files and icons; Supabase/Postgres schema, RLS policies and private-storage policy migrations; setup, security, deployment, Android and free-tier documentation.
- Production build passes. Automated Playwright smoke test passes with no browser console errors.

### Automated smoke results
`node tests/smoke.mjs` passed:
- Admin login and navigation across all 15 modules.
- LR sequential number, net-weight calculation, finalise action and A4 preview.
- Maintenance duration (sample = 6 days) and calendar display.
- Salary net calculation (sample = ₹31,500).
- XLSX and PDF export downloads.
- Maintenance availability guard.
- Driver portal tabs shown; salary navigation absent.
- Mobile menu presence at 390px.
- No console errors.

Screenshots saved under `tests/`: `dashboard.png`, `vehicles.png`, `lr-preview.png`, `maintenance-calendar.png`, `driver-salary.png`, `mobile-driver.png`. Dashboard and LR preview were visually reviewed; mobile driver view was reviewed at 390px. Layouts appear coherent and responsive.

`npm run build` passes (`tsc -b` + Vite). Vite reports one advisory: main JS chunk ~1.14 MB minified (~348 KB gzip), above its 500 KB warning threshold; build succeeds, but route-level code splitting is a sensible optimization before broad production rollout.

### Corrections made during verification
- Playwright exposed missing Users & Settings visibility for admin roles; permission navigation was corrected.
- Added Escape-key dismissal for modal dialogs, enabling keyboard dismissal and stable mobile test flow.
- LR/TCC saved-customer selection was changed to searchable datalist inputs while keeping free-text entry and address auto-fill.
- Added `tests/workflow.mjs`: duplicate seeded `MH43CK8150` opens the existing record; unique vehicle create opens details; custom vehicle paper number/expiry/image save; driver create synchronizes the vehicle assignment; LR creation is visible from the vehicle's new LRs tab.
- Vehicle/driver direct assignment now mirrors into assignment history; retired drivers release their vehicle link. Custom vehicle/driver document names are accepted. Browser uploads compress images and reject oversized PDFs; localStorage failures show a warning rather than throwing silently.
- Removed generated fake GPS positions. Admin can stop an active share but cannot grant driver consent; the driver must share location on their own device.

### Remaining work / honest production caveats
1. **Supabase persistence/auth integration:** schema, RLS, storage migrations and client helpers are supplied, but the UI still uses the localStorage demo adapter. Supabase write/auth paths are not yet wired end-to-end. Do not treat the demo app as a production multi-user service until this is completed and tested against a configured Supabase project.
2. **Database migration execution:** PostgreSQL is not installed in this workspace; migrations were reviewed, but not executed against a real Supabase/Postgres instance. Run them in a test project and verify the RLS checklist before real data.
3. **Confidential documents:** private bucket policies are provided, but end-to-end authenticated upload/access against Supabase remains to be integrated and verified. Do not upload real Aadhaar, PAN, licence, salary or bank documents in demo/localStorage mode.
4. **LR/TCC fidelity:** the source reference photos were unavailable, so exact layout matching is unverified.
5. **Operational follow-ups:** backups, 2FA, Android foreground GPS service, push notifications and performance code splitting require deployment/configuration work.
6. **Free tier:** Supabase/Vercel quotas and inactivity/retention limits can change; see `FREE-TIER-LIMITS.md`. Free hosting is not a guarantee of unlimited storage, uptime or backup.

## Files and database changes
- App: `src/`, including pages for dashboard, vehicles, documents, maintenance, drivers, assignments, LR, TCC, trips, customers, salary, expenses, reports, tracking, administration and driver portal.
- Database: `supabase/migrations/0001_init.sql` through `0004_seed_demo.sql`; RLS, private storage, indexes, generated values, triggers, sequences and labelled demo seed data.
- Tests: `tests/smoke.mjs`, `tests/workflow.mjs`, six screenshots.
- Docs: `README.md`, `.env.example`, `docs/`, `supabase/README.md`.

## Run instructions
```bash
cd ah-transport
npm install
npm run dev
```
Open the Vite URL shown in the terminal. Demo credentials:
- Super Admin: `admin@ahtransportco.com` / `admin123`
- Office: `office@ahtransportco.com` / `office123`
- Accounts: `accounts@ahtransportco.com` / `accounts123`
- Driver: `driver@ahtransportco.com` / `driver123`

Build and smoke test:
```bash
npm run build
node tests/smoke.mjs
node tests/workflow.mjs  # both need dev server on http://127.0.0.1:5173 and Playwright Chromium
```
Supabase setup: follow `supabase/README.md`, `docs/SETUP.md`, and `.env.example`; migrations must be applied and RLS tested in a non-production project before any sensitive data is entered.
