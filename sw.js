const CACHE = "corb-cache-v1";
const ASSETS = [
  "./","./index.html","./news.html","./squadra.html","./video.html","./prossima.html","./partite.html","./calendario.html","./admin.html",
  "./style.css","./data-store.js","./manifest.json"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
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
