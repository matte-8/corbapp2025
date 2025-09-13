(() => {
  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }

  ready(() => {
    const drawer   = document.querySelector('[data-role="drawer"]');
    const btnOpen  = document.querySelector('[data-role="menu-btn"]');
    const btnClose = document.querySelector('[data-role="drawer-close"]');

    if (!drawer || !btnOpen || !btnClose) return;

    const open  = () => drawer.classList.add('open');
    const close = () => drawer.classList.remove('open');

    btnOpen.addEventListener('click', (e) => { e.stopPropagation(); open(); });
    btnClose.addEventListener('click', close);

    // chiudi cliccando fuori
    document.addEventListener('click', (e) => {
      if (drawer.classList.contains('open') && !drawer.contains(e.target) && e.target !== btnOpen) {
        close();
      }
    });

    // chiudi con ESC
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  });
})();
