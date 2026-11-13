# Architecture

## Stack

- **React 19 + TypeScript + Vite** — single-page app, code-split-free but small.
- **Tailwind CSS v4** (`@tailwindcss/vite`) — utility styling, white/light-grey
  surface with dark-green (`green-800/900/950`) company branding.
- **lucide-react** — professional icon set.
- **jsPDF** — A4 LR/TCC/report PDFs generated client-side (no server cost).
- **SheetJS (`xlsx`)** — real `.xlsx` exports for every register.
- **PWA** — `manifest.webmanifest` + `sw.js` app-shell cache, installable on Android.
- **Supabase** — Postgres + Auth + private Storage + RLS (migrations included).
  Until it is connected the app runs on a localStorage adapter in demo mode.

## Folder map

```
src/
  App.tsx                 shell: sidebar, topbar, search, notifications, routing
  store.tsx               global state, RBAC permission matrix, toasts, demo seed port
  types.ts                domain types (Vehicle, Driver, Maintenance, LR, TCC, …)
  company.ts              company master + formatting/calc helpers
  seed.ts                 clearly-labelled demo dataset
  ui.tsx                  design-system primitives (Card, Table, Modal, Badge, …)
  pdf.ts                  LR / TCC / report PDF builders (A4)
  lib/supabase.ts         Supabase client, private storage helpers, repo skeleton
  components/
    LRPreview.tsx         printed A4 LR layout (HTML, print-friendly)
    TCCPreview.tsx        printed A4 TCC layout
  pages/
    Login.tsx  Dashboard.tsx  Vehicles.tsx  Documents.tsx  Maintenance.tsx
    Drivers.tsx  Assignments.tsx  LR.tsx  TCC.tsx  Trips.tsx  Customers.tsx
    Salary.tsx  Expenses.tsx  Reports.tsx  Tracking.tsx  Admin.tsx  DriverPortal.tsx
supabase/migrations/      0001 schema · 0002 RLS · 0003 storage · 0004 demo data
docs/                     setup, architecture, security, limits, android, phases
```

## State flow

```
UI event → useStore().set(mutator) → immutable copy → React re-render
                                   → persist (localStorage | Supabase repo)
                                   → audit entry (who / what / when)
```

Every important mutation writes to `audits`, which powers the dashboard activity
feed and the audit log screen. Records are **never hard-deleted**: vehicles are
deactivated, maintenance is cancelled, documents are superseded — history is kept
for statutory/tax purposes.

## Business rules encoded in the app

1. A vehicle with an `in_progress` maintenance job is **Under Maintenance** and
   cannot be assigned to a trip or driver without an **audited admin override**.
2. Completing/releasing maintenance recalculates the vehicle status
   (`Available`, or `On Trip` if a live trip exists).
3. Maintenance duration = `actual_end ?? today − start + 1` days; open jobs are
   shown as ongoing and included in downtime.
4. Document renewal marks the old row `Superseded` and stores it in
   `vehicle_document_history`; only `current` rows drive expiry alerts.
5. LR/TCC numbers come from a sequence (`LR/0001`, `TCC/0001`, `TRIP/0001`).
   In Supabase this is `next_document_no()` — atomic under concurrency.
6. Net salary = base + bonus + additions − advance − deductions.
7. Trip status changes move the vehicle between `On Trip` and `Available`,
   except when it is under maintenance.

## PDF pipeline

Two independent paths, so print and download always agree on data:

1. **HTML preview → print**: the same component is rendered into a new window
   with `@page { size: A4; margin: 8mm }` so the browser's print dialog produces
   the stationery-accurate page.
2. **jsPDF**: A4 `210 × 297 mm`, company header band, bordered field rows,
   weight sub-table, declaration and signature blocks; saved as
   `LR_0001_LR.pdf` / `TCC_0001_TCC.pdf`.

Both are fed from a single `LR`/`TCC` record plus the vehicle and driver, so no
data duplication.

## PWA / mobile

- Responsive breakpoints: sidebar becomes a drawer < 1024 px; tables scroll
  horizontally; all forms become single column on phones.
- `viewport-fit=cover`, `theme-color` dark green, maskable 192/512 icons.
- Installable from Chrome on Android ("Add to Home screen"); standalone display.
- Path to a Play-Store app: wrap in Capacitor (docs/ANDROID.md) and add a
  foreground location service for continuous GPS.
