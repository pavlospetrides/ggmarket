const CACHE = "ggmarket-shell-v3";
const SHELL = ["/offline", "/icon.svg"];
self.addEventListener("install", (event) => event.waitUntil(Promise.all([
  caches.open(CACHE).then((cache) => cache.addAll(SHELL)),
  self.skipWaiting(),
])));
self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()),
));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline")));
    return;
  }
  const url = new URL(event.request.url);
  if (url.pathname !== "/icon.svg") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
