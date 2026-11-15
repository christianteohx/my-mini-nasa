(() => {
  'use strict';

  const splash = document.getElementById('splash');
  if (!splash) return;
  const start = document.getElementById('splash-start');
  const behind = [document.querySelector('.masthead'), document.querySelector('main')].filter(Boolean);
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let open = true;

  behind.forEach(node => { node.inert = true; });

  function close() {
    if (!open) return;
    open = false;
    behind.forEach(node => { node.inert = false; });
    splash.classList.add('is-leaving');
    const finish = () => {
      splash.hidden = true;
      document.getElementById('yard')?.focus({ preventScroll: true });
      window.dispatchEvent(new Event('splash:closed'));
    };
    if (reduceMotion) finish();
    else setTimeout(finish, 450);
  }

  // Capture keys before the yard sees them so the astronaut stays put behind the splash.
  window.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Tab') return;
    event.stopImmediatePropagation();
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault();
      if (!event.repeat) close();
    }
  }, true);

  start.addEventListener('click', close);
  splash.addEventListener('click', close);
  window.SpaceportSplash = { get open() { return open; } };
  start.focus({ preventScroll: true });
})();
