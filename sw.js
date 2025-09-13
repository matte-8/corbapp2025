const CACHE = "corb-cache-v3";
const ASSETS = [
  "./",
  "./index.html","./news.html","./squadra.html","./video.html",
  "./prossima.html","./partite.html","./calendario.html","./admin.html","./settings.html",
  "./style.css","./data-store.js","./notify.js","./manifest.json"
];

// Install
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate (drop old caches)
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

// Cache-first con fallback rete
self.addEventListener("fetch", e=>{
  const req = e.request;
  if (req.method!=="GET") return;
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(net=>{
        const clone = net.clone();
        caches.open(CACHE).then(c=>c.put(req, clone));
        return net;
      });
    })
  );
});

// ===== Notifiche locali via postMessage =====
self.addEventListener('message', (event)=>{
  const msg = event.data || {};
  if (msg.type === 'notify'){
    const title = msg.title || 'CORB';
    const opts = {
      body: msg.body || '',
      icon: 'img/logo_c5.png',
      badge: 'img/logo_c5.png',
      data: msg.data || {},
    };
    self.registration.showNotification(title, opts);
  }
});

self.addEventListener('notificationclick', (event)=>{
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(list=>{
      for (const c of list){
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
