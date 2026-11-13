# Android & PWA

## 1. Install the PWA today (no store, no cost)

1. Deploy over HTTPS (Vercel/Netlify).
2. Open the site in Chrome on Android → **⋮ → Add to Home screen → Install**.
3. The app opens full-screen, keeps its own icon, and the shell works offline
   (live data needs network).
4. iOS: Safari → Share → Add to Home Screen.

Limitations of the browser build:

- Background GPS is **not** reliable — the OS suspends background tabs.
- No push notifications on iOS < 16.4 and limited on Android without push setup.
- Camera/file uploads work through the normal file picker or camera capture.

## 2. Add a Play-Store Android app (Capacitor, free)

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "AH TMS" com.ahtransportco.tms --web-dir=dist
npm run build
npx cap add android
npx cap sync android
npx cap open android          # opens Android Studio
```

`capacitor.config.ts` essentials:

```ts
export default {
  appId: "com.ahtransportco.tms",
  appName: "AH TMS",
  webDir: "dist",
  server: { androidScheme: "https" },
};
```

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## 3. Foreground location service (only for continuous tracking)

A browser/PWA cannot guarantee continuous tracking — be honest with drivers.
Implement it natively:

1. Use `@capacitor-community/background-geolocation` (or a small Kotlin
   `Service` with `startForeground()` and a persistent notification:
   *"AH TMS — trip tracking active"*).
2. Request `ACCESS_FINE_LOCATION` first; request `ACCESS_BACKGROUND_LOCATION`
   only when the driver opts in, and explain why (Play Store requires a
   prominent-disclosure screen + data-safety declaration).
3. Push points to Supabase only while a trip is active and consent is true:

```ts
await supabase.from("driver_locations").insert({
  driver_id: myDriverId, trip_id: activeTripId,
  lat: p.latitude, lng: p.longitude,
  accuracy_m: p.accuracy, speed_kmph: p.speed, consent: true,
});
```

4. Stop the service when the trip completes or the driver revokes consent, and
   keep the retention job (`purge_old_locations(30)`) running.

## 4. Release checklist

- Generate a signed AAB (`Build → Generate Signed Bundle`), keep the keystore safe.
- Play Console: privacy policy URL (store policy text from docs/SECURITY.md),
  data-safety form (location + personal IDs), content rating.
- One-time $25 developer registration is the only unavoidable cost.
- Keep the PWA live in parallel: staff use desktop, drivers use the app.

## 5. Desktop

No install needed — any current Chrome/Edge/Firefox works. Chrome/Edge can also
"Install" the PWA so it opens in its own window like a desktop app.
