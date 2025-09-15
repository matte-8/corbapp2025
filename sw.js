// sw.js
const CACHE = "corb-cache-v4"; // <- bumpa quando fai modifiche
const ASSETS = [
  "./",
  "./index.html","./news.html","./squadra.html","./video.html",
  "./prossima.html","./partite.html","./calendario.html","./admin.html",
  "./settings.html",                 // se l’hai aggiunta
  "./style.css?v=33",
  "./data-store.js",
  "./ui.js",
  "./manifest.json",
  // icone/logo
  "./img/logo_c5.png","./img/logo_avv.png","./img/player.png",
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener("fetch", e=>{
  const {request} = e;
  if (request.method!=="GET") return;
  e.respondWith(
    caches.match(request).then(res=> res || fetch(request).then(net=>{
      const clone = net.clone();
      caches.open(CACHE).then(c=>c.put(request, clone));
      return net;
    }).catch(()=>res))
  );
});
