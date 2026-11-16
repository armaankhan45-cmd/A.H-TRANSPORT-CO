# A.H. Transport Co. — Transport Management System (TMS)

A working, mobile-first transport management application for **A.H. Transport Co.**
(Fleet Owners & Transport Contractors — Chemical Oil & Bulk Cargo), covering the
complete transport business in one application:

> **Unit No. 11, 2nd Floor, 'A' Wing, Sita Estate, Aziz Baug, Chembur, Mumbai – 400074**
> ahtransportco@gmail.com · ahtransportco.com · GSTIN 27AWAPK1208Q1ZF · PAN AWAPK1208Q
> 99876 76737 · 99309 15750 · 98922 74370 · 96196 47420

---

## What is inside

| # | Module | Highlights |
|---|---|---|
| 1 | **Dashboard** | Fleet KPIs, expiry/expired counts, monthly income–expense–salary–pending, availability table, maintenance, activity, notification bell, global search, month filter, quick actions |
| 2 | **Vehicles** | Full CRUD + photo, chassis/engine, capacity, status; per-vehicle detail with documents, maintenance and trip tabs |
| 3 | **Vehicle Papers** | RC, insurance, fitness, PUC, national/state permit, road tax, tanker inspection; issue/expiry dates, file upload, renewal **with history retained** |
| 4 | **Expiry Dashboard** | Colour-coded 30/15/7-day + expired tiers, filters (vehicle, document type, expiry month), configurable alert period |
| 5 | **Maintenance** | Manual start/end/expected dates, **duration auto-calculated**, open jobs keep vehicle "Under Maintenance", release action, list + calendar + vehicle history + workshop history, before/after photos, invoice |
| 6 | **Drivers** | Complete driver database, licence & hazmat card expiry, private document vault, status history (joining/resigned/rejoined), masked Aadhaar/PAN |
| 7 | **Assignments** | Assign / change / remove with start–end dates, full history, maintenance-block + authorised override (audited) |
| 8 | **LR** | Sequential auto numbering, auto-fill from customers/vehicle, draft → final, **A4 printed layout**, print, PDF, WhatsApp, email, search, reprint |
| 9 | **TCC** | Tanker Cleaning Certificate with auto vehicle/driver fill, declaration, A4 layout, PDF/print/share, numbering, history |
| 10 | **Trips** | 9-state lifecycle, freight types, detention, expenses, auto vehicle status, pending-unloading tracking |
| 11 | **Salary** | Base + bonus + additions − advance − deductions = net, month sheet, pending, advance register, CSV/Excel + PDF |
| 12 | **Expenses** | 11 categories, receipt upload, vehicle-wise and category-wise reporting |
| 13 | **Customers** | Consignor/consignee master used to auto-populate LR, TCC and trips |
| 14 | **Reports** | 15 reports with PDF and real `.xlsx` export |
| 15 | **Notifications** | Paper expiry, driver licence/training, maintenance due/overdue, pending salary, trip status — configurable periods |
| 16 | **Driver App** | Separate driver login: own profile, own vehicle + papers, own trips, own salary, own LR/TCC PDFs, consented one-tap location share, document upload |
| 17 | **Security** | RBAC (5 roles), module permission matrix, audit log, backup/restore, RLS policies + private storage SQL |

---

## Quick start (2 minutes, no keys needed)

```bash
npm install
npm run dev          # http://localhost:5173
```

The app starts in **demo mode** — data is stored in the browser (`localStorage`)
and seeded with clearly-labelled demo records.

### Demo logins

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@ahtransportco.com` | `admin123` |
| Office Staff | `office@ahtransportco.com` | `office123` |
| Accounts Staff | `accounts@ahtransportco.com` | `accounts123` |
| Driver | `driver@ahtransportco.com` | `driver123` |

> Change these before real use. Demo data must be removed:
> **Users & Settings → Settings & Backup → Reset demo data**.

### Build / preview

```bash
npm run build        # tsc + vite production build → dist/
npm run preview      # serve the production build
```

---

## Connecting real Supabase (Postgres + Auth + private Storage)

The relational schema, RLS policies, private storage buckets and concurrency-safe LR/TCC sequence function are in `supabase/migrations/`. However, the app UI's Supabase Auth, CRUD write path and authenticated uploads are **not yet integrated end-to-end**. Setting `VITE_DATA_MODE=supabase` and adding the keys does not make the app production-ready. Follow `supabase/README.md` only for reviewing/setting up the database; do not enter real personal or financial data until integration and RLS/file-access tests are complete. Never expose the service-role key in the browser.

---

## Documentation

| Document | Contents |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Local setup, Supabase wiring, first users, troubleshooting |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Folder structure, data model, state flow, PDF pipeline, PWA |
| [docs/SECURITY.md](docs/SECURITY.md) | Roles, permission matrix, RLS strategy, file privacy, audit, backups, threat notes |
| [docs/FREE-TIER-LIMITS.md](docs/FREE-TIER-LIMITS.md) | Honest ₹0 budget limits (Supabase, Vercel, GPS, PDFs) |
| [docs/ANDROID.md](docs/ANDROID.md) | PWA install, Play-Store-bound Capacitor wrapper, background GPS foreground service |
| [docs/PHASE-REPORT.md](docs/PHASE-REPORT.md) | What was built per phase, files, DB changes, test results, remaining work |
| [docs/ACCEPTANCE-CHECKLIST.md](docs/ACCEPTANCE-CHECKLIST.md) | The 20 final acceptance criteria and how each is verified |

---

## Reference documents (LR / TCC)

The LR and TCC screens reproduce the printed stationery layout: green company
header with logo block, GSTIN/PAN panel, title bar, bordered field table,
declaration and three signature areas, A4 print CSS. All company details are
injected from `src/company.ts`, so a single edit updates every document.

If you have the original printed LR/TCC photos, place them in
`docs/reference/` and adjust the field list/border weights in
`src/components/LRPreview.tsx` / `TCCPreview.tsx` and the matching
`src/pdf.ts` builders. Both renderers are independent of the form code.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · lucide-react · jsPDF · SheetJS ·
PWA manifest + service worker · Supabase (Postgres, Auth, Storage, RLS) ·
deployable to Vercel/Netlify free tier.
