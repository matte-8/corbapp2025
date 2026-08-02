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

  ready(() => {
    attachDrawer();
    hydrateLastSync();
    attachBroadcastRefresh();
  });
})();
