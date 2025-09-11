<script>
(() => {
  // Evita doppie inizializzazioni se lo script venisse incluso due volte
  if (window.__uiInit) return; window.__uiInit = true;

  const q = sel => document.querySelector(sel);
  const btn  = q('[data-role="menu-btn"]');
  const drw  = q('[data-role="drawer"]');
  const cls  = q('[data-role="drawer-close"]');

  if (!btn || !drw || !cls) return;

  const open  = e => { e?.stopPropagation?.(); drw.classList.add('open'); };
  const close = () => drw.classList.remove('open');

  btn.addEventListener('click', open);
  cls.addEventListener('click', close);

  // Chiudi se tocchi fuori
  document.addEventListener('click', (e) => {
    if (!drw.classList.contains('open')) return;
    const insideDrawer = drw.contains(e.target);
    const isButton = btn.contains(e.target);
    if (!insideDrawer && !isButton) close();
  });

  // Chiudi con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();
</script>
