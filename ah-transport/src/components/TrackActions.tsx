import { MessageCircle, MessageSquareText, Copy, Ban, MapPin } from "lucide-react";
import { useStore } from "../store";
import { Badge, Button } from "../ui";
import { caps } from "../lib/caps";
import { DATA_MODE } from "../lib/supabase";
const CLOUD = DATA_MODE === "supabase";
import type { Driver } from "../types";
import { ago, ensureTrackToken, isPhone, smsLink, smsText, stopTracking, trackUrl, waLink } from "../tracking";

/** Status + Send / Copy / Stop for one driver. The driver must open the link and tap Allow — nothing is collected before that. */
export default function TrackActions({ driver, compact }: { driver: Driver; compact?: boolean }) {
  const { db, set, toast, user } = useStore();
  const loc = db.locations.find((l) => l.driverId === driver.id && l.consent);
  const st = loc ? ago(loc.updated) : null;
  const usable = !CLOUD || caps.track;
  const link = () => { if (!usable) { toast("Run supabase/migrations/0007_tracking.sql first (tracking upgrade)", "error"); return null; } return trackUrl(ensureTrackToken(set, driver)); };
  return (
    <div className={compact ? "flex flex-wrap items-center gap-1.5 justify-end" : "space-y-2"}>
      {st ? <Badge cls={st.live ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{st.live ? "● Sharing live" : `Last seen ${st.text}`}</Badge> : <Badge cls="bg-gray-100 text-gray-600">Not shared yet</Badge>}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" onClick={async () => {
          const u = link(); if (!u) return;
          const first = driver.name.split(" ")[0];
          if (isPhone()) { window.location.href = smsLink(driver.mobile, first, u); return; }          // opens the phone's SMS app, message ready
          try { await navigator.clipboard.writeText(smsText(first, u)); toast(`SMS text copied. Send it to ${driver.mobile} from your phone.`); }   // computer: no SMS app
          catch { window.prompt(`Send this SMS to ${driver.mobile}`, smsText(first, u)); }
        }}><MessageSquareText className="w-3.5 h-3.5" /> Send by SMS</Button>
        <Button size="sm" variant="secondary" onClick={() => { const u = link(); if (u) window.open(waLink(driver.mobile, driver.name.split(" ")[0], u), "_blank"); }}><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</Button>
        <Button size="sm" variant="secondary" onClick={async () => { const u = link(); if (!u) return; try { await navigator.clipboard.writeText(u); toast("Link copied"); } catch { window.prompt("Copy this link", u); } }}><Copy className="w-3.5 h-3.5" /> Copy</Button>
        {loc && <Button size="sm" variant="secondary" onClick={() => window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, "_blank")}><MapPin className="w-3.5 h-3.5" /> Map</Button>}
        {(driver.trackToken || loc) && <Button size="sm" variant="secondary" onClick={() => { stopTracking(set, driver, user?.name || "Admin"); toast("Tracking stopped — link disabled"); }}><Ban className="w-3.5 h-3.5" /> Stop</Button>}
      </div>
    </div>
  );
}
