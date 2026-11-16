/* A.H. Transport TMS — app-shell service worker.
   SECURITY: only caches this site's own static files. It NEVER touches Supabase/API
   requests, so salary, Aadhaar, documents etc. are never stored in the browser cache. */
const CACHE = "ah-tms-v2";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/index.html", "/manifest.webmanifest"])).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "clear") caches.delete(CACHE); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // Supabase & other hosts: browser handles, no caching
  if (req.mode === "navigate") {                               // pages: always try network first so new deploys show up
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put("/index.html", c)); return r; }).catch(() => caches.match("/index.html")));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok && url.pathname.startsWith("/assets/")) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); } return r; })));
});
