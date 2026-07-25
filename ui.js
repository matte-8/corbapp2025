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
    const words = clean.split(/\s+/).filter(Boolean);
    const initials = (words.slice(0,2).map(w=>w[0]).join('') || '?').toUpperCase();
    let hash = 0;
    for (const c of clean) hash = (hash*31 + c.charCodeAt(0)) % 360;
    const badgeDiv = `<div class="team-badge" data-name="${clean}" style="width:${size}px;height:${size}px;border-radius:50%;background:hsl(${hash},52%,42%);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.round(size*0.38)}px;flex-shrink:0">${initials}</div>`;
    if (explicitUrl){
      return `<img class="logo" src="${explicitUrl}" style="width:${size}px;height:${size}px;object-fit:contain" data-fallback-name="${clean}" data-fallback-size="${size}" alt="">`;
    }
    return badgeDiv;
  }
  window.teamBadgeHTML = teamBadgeHTML;

  // Se un'immagine con data-fallback-name fallisce nel caricamento, la sostituisco
  // con lo stemma generato (delegation globale, funziona anche su contenuto creato dopo).
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img?.tagName === 'IMG' && img.dataset?.fallbackName){
      const size = +img.dataset.fallbackSize || 44;
      const span = document.createElement('span');
      span.innerHTML = teamBadgeHTML(img.dataset.fallbackName, '', size);
      img.replaceWith(span.firstElementChild);
    }
  }, true);

  ready(() => {
    attachDrawer();
    hydrateLastSync();
    attachBroadcastRefresh();
  });
})();
