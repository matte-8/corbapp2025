// sw.js — CORB PWA
const CACHE = "corb-cache-v3"; // ⬅️ bumpa questo quando cambi asset importanti

// Precaching: metti qui i file locali che vuoi sempre offline
const ASSETS = [
  "./",
  "./index.html",
  "./news.html",
  "./squadra.html",
  "./video.html",
  "./prossima.html",
  "./partite.html",
  "./calendario.html",
  "./admin.html",

  // asset versionati (cache-buster)
  "./style.css?v=33",
  "./ui.js?v=33",

  // core
  "./data-store.js",
  "./manifest.json",

  // immagini essenziali
  "./img/logo_c5.png",
  "./img/logo_avv.png",
  "./img/player.png",
  "./img/icons/icon-192.png",
  "./img/icons/icon-512.png"
];

// ===== install =====
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
  self.skipWaiting(); // prendi subito il controllo alla prossima attivazione
});

// ===== activate =====
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Helpers
const sameOrigin = (url) => new URL(url).origin === self.location.origin;

// Network-first per HTML (navigate richieste)
async function networkFirst(event) {
  try {
    const fresh = await fetch(event.request, { cache: "no-store" });
    const cache = await caches.open(CACHE);
    cache.put(event.request, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    // fallback: prova index se è una navigazione
    return caches.match("./index.html");
  }
}

// Cache-first con revalidate per asset statici (js/css/img/font)
async function cacheFirst(event) {
  const cached = await caches.match(event.request);
  if (cached) {
    // aggiorna in background (non blocca la risposta)
    event.waitUntil(
      fetch(event.request).then(async (resp) => {
        if (sameOrigin(event.request.url) && resp.ok) {
          const cache = await caches.open(CACHE);
          cache.put(event.request, resp.clone());
        }
      }).catch(() => {})
    );
    return cached;
  }
  // non in cache: prendi rete e metti in cache solo se same-origin
  const resp = await fetch(event.request);
  if (sameOrigin(event.request.url) && resp.ok) {
    const cache = await caches.open(CACHE);
    cache.put(event.request, resp.clone());
  }
  return resp;
}

// ===== fetch =====
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // ignora metodi non-GET
  if (req.method !== "GET") return;

  // HTML (navigazioni): network-first
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirst(event));
    return;
  }

  // asset statici: cache-first (con revalidate)
  const dest = req.destination;
  if (["style", "script", "image", "font"].includes(dest)) {
    event.respondWith(cacheFirst(event));
    return;
  }

  // default: prova cache poi rete (senza scrivere in cache cross-origin)
  event.respondWith(
    caches.match(req).then((res) => res || fetch(req).then((net) => {
      if (sameOrigin(req.url) && net.ok) {
        caches.open(CACHE).then((c) => c.put(req, net.clone()));
      }
      return net;
    }))
  );
});
