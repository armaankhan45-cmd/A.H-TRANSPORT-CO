# ₹0 budget — what is actually free, and where it stops

| Service | Free tier (as of 2026) | Practical limit for this TMS | What happens when exceeded |
|---|---|---|---|
| **Supabase** | 500 MB database, 1 GB file storage, 5 GB bandwidth, 50 000 MAU, 2 projects, pauses after ~1 week of inactivity | Comfortable for a 10–30 vehicle fleet for 1–2 years if old PDFs are pruned; images dominate storage | Project read-only/paused until next cycle, or upgrade (~$25/mo Pro) |
| **Vercel** | 100 GB bandwidth/mo, Hobby (non-commercial terms) | Fine for an internal staff app | Throttled/blocked; commercial use technically needs Pro |
| **Netlify / Cloudflare Pages** | 100 GB / unlimited static requests | Good free alternatives | — |
| **GitHub** | Unlimited private repos, 2 000 CI minutes | Source control + backups of code | — |
| **PDF / Excel** | Generated in the browser with jsPDF + SheetJS | Zero server cost, unlimited documents | None — but files are produced on the device |
| **Maps / GPS** | Leaflet + OpenStreetMap tiles free; Mapbox/Nominatim have small free quotas | Admin map with driver pings is fine at low volume | Tile usage policies limit heavy commercial use |
| **Android app** | Capacitor wrapper — free | Play Store one-time $25 registration | — |

## Honest caveats

- **No unlimited storage.** Tanker paperwork scans are ~200–500 KB each; 1 GB holds
  roughly 2 000–5 000 files. Archive superseded documents to local disk/Drive.
- **Free Supabase projects pause** after inactivity. A daily visit or a scheduled
  ping keeps it awake; otherwise unscheduled wake-up is needed.
- **Continuous background GPS is not free-guaranteed in a browser.** Browsers
  throttle/kill background timers and the user can revoke permission. Reliable
  trip tracking requires the Android app's foreground service (battery + Play
  Store data-safety declarations required) — see docs/ANDROID.md.
- **Backups on free tier are limited.** Schedule your own `pg_dump` export weekly
  and keep it off-site; the Settings screen can also export a JSON snapshot.
- **E-mail/WhatsApp sharing** uses the device's own apps (`mailto:`, `wa.me`) —
  no paid API. Attach the downloaded PDF manually; automatic server-side sending
  would need a paid mail or WhatsApp Business API.
- **No SLA.** Free tiers have no uptime guarantee — for legally critical records
  keep the printable PDFs and a local backup.
