import { Capacitor, registerPlugin } from "@capacitor/core";

/** True only inside the Android app (not in a browser). */
export const isNative = () => Capacitor.isNativePlatform();

export type NativeFix = { latitude: number; longitude: number; accuracy: number; speed: number | null };
type BG = {
  addWatcher(o: Record<string, unknown>, cb: (l?: NativeFix, e?: { code?: string }) => void): Promise<string>;
  removeWatcher(o: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
};
const BG = registerPlugin<BG>("BackgroundGeolocation");

/** Keeps sending location even when the screen is off or another app is open. */
export function watchInBackground(onFix: (f: NativeFix) => void, onDenied: () => void): Promise<string> {
  return BG.addWatcher(
    { backgroundTitle: "Location sharing is on", backgroundMessage: "A.H. Transport Co can see your truck.", requestPermissions: true, stale: false, distanceFilter: 25 },
    (loc, err) => {
      if (err) { if (err.code === "NOT_AUTHORIZED") { onDenied(); void BG.openSettings(); } return; }
      if (loc) onFix(loc);
    });
}
export const stopBackground = (id: string) => BG.removeWatcher({ id });

const KEY = "ah_driver_token";
export const savedToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const saveToken = (t: string) => { try { localStorage.setItem(KEY, t); } catch { /* ignore */ } };
export const forgetToken = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };
