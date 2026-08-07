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
  // Tutto slim: un pallone che rimbalza per "oggi si gioca" (con popup al tocco),
  // una campanella per le notifiche da attivare (con popup al tocco), più un
  // puntino su News/Video sia nel menu che nelle card Home se c'è qualcosa di
  // nuovo che non hai ancora aperto.

  // Piccolo popup generico, riutilizzabile, senza dipendere dallo stile di ogni pagina.
  function showSlimPopup(html){
    let overlay = document.getElementById('corb-slim-overlay');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id = 'corb-slim-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:20px';
      overlay.addEventListener('click', (e)=>{ if (e.target===overlay) overlay.remove(); });
      const card = document.createElement('div');
      card.id = 'corb-slim-card';
      card.style.cssText = 'background:var(--card,#fff);color:var(--text,#2b1d22);border-radius:16px;padding:18px;max-width:320px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.35)';
      overlay.appendChild(card);
      document.body.appendChild(overlay);
    }
    document.getElementById('corb-slim-card').innerHTML = html;
    overlay.style.display = 'flex';
  }

  // Popup piccolo "ancorato" a un elemento (tipo la campanella): esce da lì
  // invece di comparire al centro dello schermo, come un menu a tendina.
  function showAnchoredPopup(anchorEl, html){
    document.getElementById('corb-anchor-catcher')?.remove();
    document.getElementById('corb-anchor-card')?.remove();

    const catcher = document.createElement('div');
    catcher.id = 'corb-anchor-catcher';
    catcher.style.cssText = 'position:fixed;inset:0;z-index:499;background:transparent';
    catcher.addEventListener('click', () => { catcher.remove(); card.remove(); });
    document.body.appendChild(catcher);

    const rect = anchorEl.getBoundingClientRect();
    const card = document.createElement('div');
    card.id = 'corb-anchor-card';
    const right = Math.max(8, window.innerWidth - rect.right);
    card.style.cssText = `position:fixed;top:${rect.bottom+10}px;right:${right}px;z-index:500;
      background:var(--card,#fff);color:var(--text,#2b1d22);border-radius:14px;padding:14px;
      width:min(260px, calc(100vw - 24px));box-shadow:0 12px 30px rgba(0,0,0,.3);
      animation:corb-pop .15s ease-out`;
    card.innerHTML = html;
    document.body.appendChild(card);

    if (!document.getElementById('corb-pop-style')){
      const st = document.createElement('style');
      st.id = 'corb-pop-style';
      st.textContent = '@keyframes corb-pop{from{transform:translateY(-6px);opacity:0}to{transform:translateY(0);opacity:1}}';
      document.head.appendChild(st);
    }
  }

  // --- Connessione assente: piccolo avviso giallo nella barra, solo quando serve ---
  function injectConnectionStatus(){
    const nav = document.querySelector('.topbar .nav');
    if (!nav || document.getElementById('corb-offline-badge')) return;

    const badge = document.createElement('span');
    badge.id = 'corb-offline-badge';
    badge.textContent = '⚠️ Connessione assente';
    badge.style.cssText = 'display:none;font-size:11px;font-weight:700;color:#3a2f00;background:#facc15;padding:3px 8px;border-radius:999px;margin-left:8px;white-space:nowrap';
    nav.appendChild(badge);

    function refresh(){
      badge.style.display = navigator.onLine ? 'none' : 'inline-block';
    }
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    refresh();
  }

  function injectTopIndicators(){
    const brand = document.querySelector('.topbar .brand');
    if (!brand) return;

    import('./data-store.js').then(({ subscribeMatches, subscribeNews, subscribeVideos }) => {

      // --- "Oggi si gioca": pallone che rimbalza + popup con la partita ---
      subscribeMatches((rows) => {
        const oggi = new Date();
        const oggiStr = `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,'0')}-${String(oggi.getDate()).padStart(2,'0')}`;
        const partitaOggi = (rows||[]).find(m => {
          const isCorb = (m.casa||'').trim().toLowerCase()==='corbiolo' || (m.fuori||'').trim().toLowerCase()==='corbiolo';
          return isCorb && m.data === oggiStr;
        });
        let ball = document.getElementById('corb-today-ball');
        if (partitaOggi){
          if (!ball){
            ball = document.createElement('button');
            ball.id = 'corb-today-ball';
            ball.type = 'button';
            ball.title = 'Oggi si gioca! Tocca per i dettagli';
            ball.style.cssText = 'background:none;border:0;cursor:pointer;font-size:16px;margin-left:6px;display:inline-block;animation:corb-bounce 1s infinite;line-height:1;padding:0';
            ball.textContent = '⚽';
            if (!document.getElementById('corb-bounce-style')){
              const st = document.createElement('style');
              st.id = 'corb-bounce-style';
              st.textContent = '@keyframes corb-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}';
              document.head.appendChild(st);
            }
            brand.appendChild(ball);
          }
          ball.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            const casa = partitaOggi.casa || 'Corbiolo';
            const fuori = partitaOggi.fuori || 'Avversario';
            const ora = partitaOggi.ora ? ` alle ${partitaOggi.ora}` : '';
            showSlimPopup(`
              <div style="font-weight:800;font-size:16px;margin-bottom:8px">⚽ Il Corbiolo oggi gioca!</div>
              <div style="font-size:14px">${casa} vs ${fuori}${ora}</div>
              <button onclick="document.getElementById('corb-slim-overlay').remove()"
                style="margin-top:14px;width:100%;padding:10px;border:0;border-radius:10px;background:#6b0f1a;color:#fff;font-weight:700;cursor:pointer">Ok</button>
            `);
          };
        } else if (ball){ ball.remove(); }
      });

      // --- Pallini "nuovo" su News e Video: sia nel menu che nelle card Home ---
      function wireUnread(collectionSubscribe, storageKey, drawerSel, cardSel){
        collectionSubscribe((rows) => {
          const seen = +(localStorage.getItem(storageKey) || 0);
          const count = (rows||[]).filter(r => {
            const t = r.createdAt?.toMillis ? r.createdAt.toMillis() : 0;
            return t > seen;
          }).length;

          // Nel menu: pallino inline accanto al testo, col numero dentro
          document.querySelectorAll(drawerSel).forEach(link => {
            let dot = link.querySelector('.corb-unread-dot');
            if (count > 0){
              if (!dot){
                dot = document.createElement('span');
                dot.className = 'corb-unread-dot';
                dot.style.cssText = 'min-width:16px;height:16px;padding:0 3px;border-radius:999px;background:#e0261f;color:#fff;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;margin-left:6px;vertical-align:middle';
                link.appendChild(dot);
              }
              dot.textContent = count;
            } else if (dot){ dot.remove(); }
          });

          // Nelle card Home: badge nell'angolo in alto a destra della card
          document.querySelectorAll(cardSel).forEach(card => {
            card.style.position = 'relative';
            let dot = card.querySelector('.corb-unread-badge');
            if (count > 0){
              if (!dot){
                dot = document.createElement('span');
                dot.className = 'corb-unread-badge';
                dot.style.cssText = 'position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#e0261f;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25)';
                card.appendChild(dot);
              }
              dot.textContent = count;
            } else if (dot){ dot.remove(); }
          });
        });
      }
      wireUnread(subscribeNews,   'corb-seen-news',  '#drawer a[href="./news.html"]',  'a.home-box[href="./news.html"]');
      wireUnread(subscribeVideos, 'corb-seen-video', '#drawer a[href="./video.html"]', 'a.home-box[href="./video.html"]');
    });
  }

  // --- Campanella notifiche: vicino al menu, con popup + scossa periodica ---
  function injectNotifyReminder(){
    const right = document.querySelector('.topbar .right');
    if (!right || document.getElementById('corb-notify-reminder')) return;
    if (typeof Notification === 'undefined') return;
    const savedState = localStorage.getItem('corb-notif-enabled');
    const isEnabled = savedState === null ? (Notification.permission === 'granted') : (savedState === 'yes');
    if (isEnabled) return;
    // Se hai "skippato" il promemoria di recente, non ricomparire subito
    const dismissedAt = +(localStorage.getItem('corb-notify-reminder-dismissed') || 0);
    if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) return; // 3 giorni
    if (location.pathname.endsWith('settings.html')) return;

    if (!document.getElementById('corb-shake-style')){
      const st = document.createElement('style');
      st.id = 'corb-shake-style';
      st.textContent = '@keyframes corb-shake{0%,100%{transform:rotate(0)}20%{transform:rotate(-15deg)}40%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(5deg)}}';
      document.head.appendChild(st);
    }

    const btn = document.createElement('button');
    btn.id = 'corb-notify-reminder';
    btn.type = 'button';
    btn.title = 'Attiva le notifiche partita';
    btn.className = 'iconbtn';
    btn.style.fontSize = '18px';
    btn.style.position = 'relative';
    btn.textContent = '🔔';
    const dot = document.createElement('span');
    dot.style.cssText = 'position:absolute;top:-4px;right:-4px;min-width:15px;height:15px;padding:0 3px;border-radius:999px;background:#e0261f;color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px var(--granata,#6b0f1a)';
    dot.textContent = '1';
    btn.appendChild(dot);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showAnchoredPopup(btn, `
        <div style="display:flex;justify-content:flex-end;margin:-4px -4px 4px 0">
          <button id="corb-notif-skip" style="border:0;background:transparent;color:var(--muted,#7a5d66);font-weight:600;cursor:pointer;font-size:11px;padding:4px 6px">Non ora ✕</button>
        </div>
        <div style="font-weight:800;font-size:14px;margin-bottom:6px">🔔 Non perderti nulla!</div>
        <div style="font-size:12px;color:var(--muted,#7a5d66)">Attiva le notifiche per sapere subito quando si gioca e quando arriva un gol.</div>
        <a href="./settings.html" style="display:block;text-align:center;margin-top:12px;width:100%;padding:9px;border:0;border-radius:10px;background:#6b0f1a;color:#fff;font-weight:700;cursor:pointer;text-decoration:none;box-sizing:border-box;font-size:13px">Attiva le notifiche</a>
      `);
      document.getElementById('corb-notif-skip').onclick = () => {
        localStorage.setItem('corb-notify-reminder-dismissed', String(Date.now()));
        btn.remove();
        document.getElementById('corb-anchor-catcher')?.remove();
        document.getElementById('corb-anchor-card')?.remove();
      };
    });
    right.insertBefore(btn, right.firstChild);

    // Ogni tanto la campanella "trema" per farsi notare, senza essere invadente
    setInterval(() => {
      btn.style.animation = 'corb-shake .5s';
      setTimeout(() => { btn.style.animation = ''; }, 600);
    }, 20000);
  }

  ready(() => {
    injectTopIndicators();
    injectNotifyReminder();
    injectConnectionStatus();
  });

  ready(() => {
    attachDrawer();
    hydrateLastSync();
    attachBroadcastRefresh();
  });
})();
