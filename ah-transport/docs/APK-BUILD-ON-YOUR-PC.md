# Build the Android APK on your own computer and share it with employees

Your repo already contains the Android project (`ah-transport/android`) with background location.
The app (named **AH Driver**) opens your live website inside the phone app, so **every feature of the
website — LR, TCC, vehicles, drivers, tracking — is in the APK, and future website updates reach the
phones automatically** (no new APK needed). You only rebuild the APK when something *native* changes
(app icon, name, permissions, location plugin).

The phone still needs internet (your data lives in Supabase). iPhone cannot install an APK:
iPhone users open the website in Safari → Share → **Add to Home Screen**.

## Option 1 — Android Studio (easiest, mouse only)
1. Install **Node.js 22 LTS** and **Android Studio**. Open Android Studio once so it downloads the SDK.
2. GitHub → **Code → Download ZIP**, unzip.
3. Open **Command Prompt** in the `ah-transport` folder (type `cmd` in the folder address bar) and run:
   ```
   npm ci
   mkdir dist
   echo ok > dist\index.html
   npx cap sync android
   ```
4. In Android Studio: **File → Open →** choose the `ah-transport\android` folder. Wait until the bottom bar finishes "Gradle sync".
5. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**. When it says done, click **locate**.
   The file is `app-debug.apk` (`android\app\build\outputs\apk\debug\`). This is the file you share.

## Option 2 — one command
After step 3 above, run in the same window:
```
cd android
gradlew.bat assembleDebug
```
Same output file as above. (First run downloads Gradle; it can take 5–10 minutes.)

## Option 3 — let GitHub build it
GitHub → **Actions → Build Android app → Run workflow**. After about 5 minutes open the finished run and
download **AH-Driver-apk** (a zip containing `app-debug.apk`; kept 30 days).

## Give it to employees
1. Upload `app-debug.apk` to Google Drive and share the link (WhatsApp may refuse .apk files — zip it first).
2. On each Android phone: open the file → allow **Install unknown apps** for that app (Chrome / Drive / Files) → **Install**.
   If Play Protect says "unknown developer", choose **Install anyway** (it is your own app).
3. Open the app → sign in. Drivers get the one-time location question → **Yes**, then choose **Allow all the time**
   and allow notifications.
4. For tracking that never pauses: Settings → Apps → AH Driver → Battery → **Unrestricted**.

## Important: keep builds on ONE computer
A debug APK is signed with a key stored on the computer that built it. If you later build on a different
computer (or with the GitHub option), Android refuses to install it over the old one — the person must
uninstall first. Build every version on the same PC, or ask me to set up a permanent signing key.

## After the logo update
Rebuild the APK once (any option above) so phones get the new launcher icon and splash screen.
Phones already running the old APK keep the old icon until they install the new file; the website logo
changes for everyone immediately.
