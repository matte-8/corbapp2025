// ui.js — common UI for CORB app
(() => {
  // Call when DOM is ready
  const ready = (fn) =>
    document.readyState !== 'loading'
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn);

  // Small helpers
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // Soft re-render hook (used after admin sync)
  function softRefresh() {
    try {
      if (typeof window.render === 'function') {
        // page defines a render() that reads from localStorage
        window.render();
      } else {
        // fallback: full reload to pick up new cache/data
        location.reload();
      }
    } catch {
      location.reload();
    }
  }

  // Hydrate "Ultimo aggiornamento dati" if present
  function hydrateLastSync() {
    const el = $('#ls');
    if (!el) return;
    try {
      const ts = localStorage.getItem('lastSync');
      el.textContent = ts ? new Date(ts).toLocaleString() : 'never';
    } catch {
      el.textContent = 'never';
    }
  }

  // Drawer wiring (works once per page)
  function attachDrawer() {
    const drawer   = $('[data-role="drawer"]');
    const btnOpen  = $('[data-role="menu-btn"]');
    const btnClose = $('[data-role="drawer-close"]');

    if (!drawer || !btnOpen || !btnClose) return;

    const open  = () => drawer.classList.add('open');
    const close = () => drawer.classList.remove('open');

    // Avoid double-binding if script loaded twice
    if (!btnOpen.__bound) {
      btnOpen.addEventListener('click', (e) => { e.stopPropagation(); open(); });
      btnOpen.__bound = true;
    }
    if (!btnClose.__bound) {
      btnClose.addEventListener('click', (e) => { e.stopPropagation(); close(); });
      btnClose.__bound = true;
    }

    // Click outside closes
    if (!drawer.__outsideBound) {
      document.addEventListener('click', (e) => {
        if (drawer.classList.contains('open') && !drawer.contains(e.target) && e.target !== btnOpen) {
          close();
        }
      });
      drawer.__outsideBound = true;
    }

    // ESC closes
    if (!drawer.__escBound) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });
      drawer.__escBound = true;
    }
  }

  // Listen to Admin sync and refresh pages
  function attachBroadcastRefresh() {
    try {
      const bc = new BroadcastChannel('corb-sync');
      bc.onmessage = (ev) => {
        if (ev?.data?.type === 'data-updated') {
          softRefresh();
        }
      };
    } catch {
      // BroadcastChannel not supported — nothing to do
    }
  }

  // Stemma generato con le iniziali della squadra, usato quando non abbiamo
  // un logo reale (es. avversari amatoriali senza logo ufficiale online).
  // Colore deterministico in base al nome, così la stessa squadra ha sempre
  // lo stesso colore ovunque compaia nell'app.
  function teamBadgeHTML(name, explicitUrl, size=44){
    const clean = (name||'').trim();
    const url = explicitUrl && explicitUrl.trim() ? explicitUrl : 'img/logo_avv.png';
    return `<img class="logo" src="${url}" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:${Math.round(size*0.22)}px;background:#fff" alt="${clean}">`;
  }
  window.teamBadgeHTML = teamBadgeHTML;

  // Se il tema è impostato su "automatico", ricontrolla ogni tot minuti e
  // aggiorna da solo (utile se l'app resta aperta a lungo e si attraversano
  // le 19:00 o le 7:00 senza mai ricaricare la pagina).
  function reapplyAutoTheme(){
    const auto = (localStorage.getItem('corb-theme-auto') ?? 'on') === 'on';
    if (!auto) return;
    const h = new Date().getHours();
    const theme = (h >= 19 || h < 7) ? 'dark' : 'light';
    if (document.documentElement.dataset.theme !== theme){
      document.documentElement.dataset.theme = theme;
    }
  }
  setInterval(reapplyAutoTheme, 5 * 60 * 1000);

  // ===================== Indicatori barra superiore + menu =====================
  // Tutto slim: un puntino nell'header per "oggi si gioca" e per le notifiche
  // da attivare, più un puntino sulle voci di menu News/Video se c'è qualcosa
  // di nuovo che non hai ancora aperto. Nessun banner nella Home.
  function injectTopIndicators(){
    const brand = document.querySelector('.topbar .brand');
    if (!brand) return;

    import('./data-store.js').then(({ subscribeMatches, subscribeNews, subscribeVideos }) => {

      // --- "Oggi si gioca" ---
      subscribeMatches((rows) => {
        const oggi = new Date();
        const oggiStr = `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,'0')}-${String(oggi.getDate()).padStart(2,'0')}`;
        const giocaOggi = (rows||[]).some(m => {
          const isCorb = (m.casa||'').trim().toLowerCase()==='corbiolo' || (m.fuori||'').trim().toLowerCase()==='corbiolo';
          return isCorb && m.data === oggiStr;
        });
        let dot = document.getElementById('corb-today-dot');
        if (giocaOggi){
          if (!dot){
            dot = document.createElement('span');
            dot.id = 'corb-today-dot';
            dot.title = 'Oggi si gioca!';
            dot.style.cssText = 'width:9px;height:9px;border-radius:50%;background:#22c55e;display:inline-block;margin-left:6px;box-shadow:0 0 0 2px rgba(34,197,94,.35);animation:corb-blink 1.6s infinite';
            if (!document.getElementById('corb-blink-style')){
              const st = document.createElement('style');
              st.id = 'corb-blink-style';
              st.textContent = '@keyframes corb-blink{0%,100%{opacity:1}50%{opacity:.35}}';
              document.head.appendChild(st);
            }
            brand.appendChild(dot);
          }
        } else if (dot){ dot.remove(); }
      });

      // --- Pallini "nuovo" su News e Video nel menu ---
      function wireUnread(collectionSubscribe, storageKey, selector){
        collectionSubscribe((rows) => {
          if (!rows || !rows.length) return;
          const latest = rows.reduce((max, r) => {
            const t = r.createdAt?.toMillis ? r.createdAt.toMillis() : 0;
            return t > max ? t : max;
          }, 0);
          const seen = +(localStorage.getItem(storageKey) || 0);
          const link = document.querySelector(selector);
          if (!link) return;
          let dot = link.querySelector('.corb-unread-dot');
          if (latest > seen){
            if (!dot){
              dot = document.createElement('span');
              dot.className = 'corb-unread-dot';
              dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#e0261f;display:inline-block;margin-left:6px;vertical-align:middle';
              link.appendChild(dot);
            }
          } else if (dot){ dot.remove(); }
        });
      }
      wireUnread(subscribeNews,   'corb-seen-news',   '#drawer a[href="./news.html"]');
      wireUnread(subscribeVideos, 'corb-seen-video',  '#drawer a[href="./video.html"]');
    });
  }

  // --- Promemoria notifiche non attivate, nell'header ---
  function injectNotifyReminder(){
    const right = document.querySelector('.topbar .right');
    if (!right || document.getElementById('corb-notify-reminder')) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') return;
    if (location.pathname.endsWith('settings.html')) return;

    const btn = document.createElement('a');
    btn.id = 'corb-notify-reminder';
    btn.href = './settings.html';
    btn.title = 'Attiva le notifiche partita';
    btn.className = 'iconbtn';
    btn.style.fontSize = '18px';
    btn.style.position = 'relative';
    btn.textContent = '🔔';
    const dot = document.createElement('span');
    dot.style.cssText = 'position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:#e0261f';
    btn.appendChild(dot);
    right.insertBefore(btn, right.firstChild);
  }

  ready(() => {
    injectTopIndicators();
    injectNotifyReminder();
  });

  ready(() => {
    attachDrawer();
    hydrateLastSync();
    attachBroadcastRefresh();
  });
})();
