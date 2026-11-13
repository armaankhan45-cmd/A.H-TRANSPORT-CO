# Security

## Principles

1. Deny by default — every Supabase table has RLS enabled; access is granted by
   explicit policies, not by table existence.
2. Least privilege — five roles, module-level permissions, row-level ownership
   for drivers.
3. Private by default — Aadhaar, PAN, DL, salary and receipts live in **private
   buckets** and are served through 60-second signed URLs.
4. Never expose secrets — only the anon key reaches the browser. The
   service-role key is server-only (Edge Functions).
5. History is immutable-ish — no hard deletes of business records; audit log for
   privileged actions.

## Role matrix (mirrors `src/store.tsx` and `role_permissions` table)

| Module | Super Admin | Admin | Office Staff | Accounts Staff | Driver |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | – |
| Vehicles | ✓ | ✓ | ✓ | view | own vehicle |
| Vehicle papers | ✓ | ✓ | ✓ | view | own vehicle |
| Maintenance | ✓ | ✓ | ✓ | – | – |
| Drivers | ✓ | ✓ | ✓ | – | own record |
| Assignments | ✓ | ✓ | ✓ | – | own |
| LR / TCC | ✓ | ✓ | ✓ | view | own |
| Trips | ✓ | ✓ | ✓ | – | own |
| Customers | ✓ | ✓ | ✓ | ✓ | – |
| Salary | ✓ | ✓ | – | ✓ | own |
| Expenses | ✓ | ✓ | – | ✓ | – |
| Reports | ✓ | ✓ | ✓ | ✓ | – |
| GPS tracking | ✓ | ✓ | ✓ | – | own consent |
| Users & audit | ✓ | – | – | – | – |

## RLS strategy (Supabase)

- `profiles.role` is the single source of truth; a trigger blocks non-admins from
  changing roles (no privilege escalation from the client).
- Helpers used inside policies: `current_role_key()`, `has_permission(p)`,
  `is_admin()`, `is_accounts()`, `my_driver_id()`.
- Driver-scoped policies restrict to `driver_id = my_driver_id()` on
  `salary_records`, `trips`, `lr_documents`, `tcc_documents`,
  `driver_documents`, `driver_assignments`, `driver_locations`.
- `driver_self_view` (security_invoker) exposes a driver's own row **without**
  Aadhaar/PAN/salary.
- `driver_locations` requires `consent = true` on insert, and admins can only
  read rows where consent is still true; `purge_old_locations(30)` supports
  retention.
- Storage policies use the first folder segment as the tenant key, e.g.
  `vehicle-docs/<vehicle_id>/…`, and check it against `current_driver_id`.

### Verification queries (run while signed in as each role)

```sql
select * from public.salary_records;       -- driver: own only | office_staff: 0 rows
select * from public.drivers;              -- driver: own only
select * from public.expenses;             -- driver: 0 rows
select * from public.driver_locations;     -- driver: own only, consent rows
```
Use Supabase's *Test RLS* feature or the SQL editor "Impersonate role" to check.

## Application-level protections already implemented

- Route/module gating by role (`PERMISSIONS`), so a driver never renders an admin page.
- Input validation: mandatory fields, 10-digit mobile check, date-order checks
  (maintenance end ≥ start, expiry ≥ issue), advance ≤ earnings, duplicate
  registration/email checks, negative amount rejection.
- Confirmation dialogs before any destructive action; deletes become
  deactivate/cancel/supersede.
- Sensitive identifiers masked by default; reveal requires Admin/Super Admin.
- Session cleared on logout; no credentials in source control (`.env.example`
  only, `.env.local` git-ignored).

## Production hardening checklist

- [ ] Enable MFA for Super Admin; strong password policy.
- [ ] Point Auth SMTP at the company mailbox; set JWT expiry ≤ 1 h + refresh rotation.
- [ ] Turn on daily backups and test a restore.
- [ ] Add rate limiting for auth (Supabase built-in) and a WAF in front of Vercel if needed.
- [ ] Restrict CORS/redirect URLs to the production domain.
- [ ] Schedule `purge_old_locations()` and review `audit_logs` monthly.
- [ ] Review `storage.objects` policies after any bucket change.
- [ ] Log out demo accounts / delete the seeded demo users before go-live.

## Known limitation (be explicit with staff)

The demo build stores data in the browser. It is **not** an access-control
boundary — anyone with the device can read localStorage. Real data must only be
entered after `VITE_DATA_MODE=supabase` with RLS verified.
