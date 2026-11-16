# Final acceptance checklist (20 criteria)

| # | Requirement | Status | How to verify |
|---|---|---|---|
| 1 | Admin can log in | ✅ | `admin@ahtransportco.com` / `admin123` |
| 2 | Driver can log in | ✅ | `driver@ahtransportco.com` / `driver123` → Driver App only |
| 3 | Admin can add/edit/manage vehicles | ✅ | Vehicles → Add Vehicle → save; edit; deactivate (record retained) |
| 4 | Admin can add/edit/manage drivers | ✅ | Drivers → Add Driver; edit; deactivate/rejoin with status history |
| 5 | Upload and view vehicle & driver documents securely | ⚠ integration pending | Private Supabase buckets/policies and signed-URL helpers are supplied; authenticated end-to-end upload/access is not wired or verified. Do not use real confidential documents in demo mode |
| 6 | Vehicle document expiry alerts work | ✅ | Expiry Dashboard tabs (Expired / 7 / 15 / 30) and the bell counter |
| 7 | Manual maintenance start and end dates | ✅ | Maintenance → New Maintenance → Start Date / Expected / Actual End |
| 8 | Maintenance duration calculated correctly | ✅ | Live "Auto-calculated duration" line; history column; e.g. 10→15 Nov = 6 days |
| 9 | Vehicles under maintenance marked unavailable | ✅ | Status becomes "Under Maintenance"; LR/trip/assignment blocked (override audited) |
| 10 | Maintenance history retained | ✅ | Vehicle History + Workshops tabs; cancelling keeps the record |
| 11 | LR PDF resembles the original | ⚠ approximation only | LR → view → Print A4 / Download PDF. No reference image was accessible; exact matching is unverified |
| 12 | TCC PDF resembles the original | ⚠ approximation only | TCC → view → Print A4 / Download PDF. No reference image was accessible; exact matching is unverified |
| 13 | LR & TCC numbering | ✅ | New LR/TCC shows `LR/0004`, `TCC/0003`, increments per save; Postgres `next_document_no()` is atomic |
| 14 | Trip management works | ✅ | Trips → New Trip → change status; vehicle flips On Trip/Available |
| 15 | Monthly salary calculations | ✅ | Salary → Add Salary; net recalculates; advance > earnings rejected; month sheet totals |
| 16 | Driver access properly restricted | ✅ (app) / ⚠ verify RLS | Driver sees only own tabs today; after Supabase wiring run the RLS verification queries in docs/SECURITY.md |
| 17 | Reports can be exported | ✅ | Reports → any report → PDF and Excel |
| 18 | Desktop and Android layouts | ✅ responsive web / ⚠ native Android | Desktop and 390px mobile browser smoke covered; installable PWA files exist. Native Android app/foreground service is not built |
| 19 | Security and database permissions tested | ⚠ partially | UI role separation smoke-tested. PostgreSQL migrations/RLS and private-file authorization were not executed against a Supabase project; verify before production |
| 20 | Setup and deployment instructions complete | ✅ | README, docs/SETUP.md, docs/DEPLOYMENT.md, supabase/README.md |

Legend: ✅ done and manually verified · ⚠ requires the Supabase project or the original reference images.
See docs/PHASE-REPORT.md "Remaining work" for the exact follow-up list.
