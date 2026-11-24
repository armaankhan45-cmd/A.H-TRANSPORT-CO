import type { DB, Driver } from "./types";
import { uid } from "./company";

type SetFn = (fn: (d: DB) => void) => void;
const newToken = () => (crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 8));

export const trackUrl = (token: string) => `${location.origin}${location.pathname.replace(/\/$/, "") || ""}/?track=${token}`;

/** Gives the driver a private link token the first time it is needed. */
export function ensureTrackToken(set: SetFn, driver: Driver): string {
  if (driver.trackToken) return driver.trackToken;
  const t = newToken();
  set((d) => { const x = d.drivers.find((y) => y.id === driver.id); if (x) x.trackToken = t; });
  return t;
}

/** Stop tracking: the old link stops working and the driver's stored points are deleted. */
export function stopTracking(set: SetFn, driver: Driver, who: string) {
  set((d) => {
    const x = d.drivers.find((y) => y.id === driver.id); if (x) x.trackToken = newToken();
    const l = d.locations.find((y) => y.driverId === driver.id); if (l) l.consent = false;
    d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: who, action: "Tracking stopped", detail: `${driver.name}: link disabled, stored locations deleted` });
  });
}

export function waLink(mobile: string, name: string, url: string) {
  const num = mobile.replace(/\D/g, "").replace(/^0+/, "");
  const full = num.length === 10 ? "91" + num : num;
  const text = `Hello ${name}, this is A.H. Transport Co.
Open this link. Tap "Yes, share" so we can see your truck. You can also send us trip photos, toll receipts or a breakdown report from the same page:
${url}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

const fullNumber = (mobile: string) => { const num = mobile.replace(/\D/g, "").replace(/^0+/, ""); return num.length === 10 ? "91" + num : num; };

/** Plain-text message for SMS (no special characters, so it stays in cheap 1-2 SMS parts). */
export const smsText = (name: string, url: string) => `AH Transport: Hi ${name}, tap Yes on this link to share truck location: ${url}`;

/** sms: link that opens the phone's own messaging app with the driver's number and the text already filled in. */
export function smsLink(mobile: string, name: string, url: string) {
  const sep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "&" : "?";   // iPhone and Android differ here
  return `sms:+${fullNumber(mobile)}${sep}body=${encodeURIComponent(smsText(name, url))}`;
}

export const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function ago(iso: string): { text: string; live: boolean } {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 5) return { text: "Live now", live: true };
  if (m < 60) return { text: `${m} min ago`, live: false };
  if (m < 1440) return { text: `${Math.round(m / 60)} h ago`, live: false };
  return { text: `${Math.round(m / 1440)} d ago`, live: false };
}
