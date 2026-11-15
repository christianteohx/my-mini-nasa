/* Vector-only UI icons: no system emoji font fallback. */
(() => {
  'use strict';
  const paths = {
  "arrow": "M5 19 19 5M5 5h14v14",
  "right": "M4 12h16M13 5l7 7-7 7",
  "up": "M12 20V4M5 11l7-7 7 7",
  "down": "M12 4v16M5 13l7 7 7-7",
  "return": "M9 5 3 11l6 6M3 11h11a6 6 0 0 1 0 12",
  "star": "M12 2 15 8.5 22 9.5 17 14.5 18 22 12 18.5 6 22 7 14.5 2 9.5 9 8.5Z",
  "check": "M4 12l5 5L20 6",
  "close": "M5 5l14 14M19 5 5 19",
  "plus": "M12 4v16M4 12h16",
  "minus": "M4 12h16",
  "cube": "M12 2 22 7v10l-10 5-10-5V7ZM2 7l10 5 10-5M12 12v10",
  "fuel": "M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z",
  "part": "M8 3h8v5h5v8h-5v5H8v-5H3V8h5Z",
  "paper": "M5 2h10l4 4v16H5ZM14 2v5h5M8 11h8M8 15h8M8 19h6",
  "crew": "M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-3a8 8 0 0 1 16 0v3",
  "bag": "M7 7V5a5 5 0 0 1 10 0v2M4 7h16v15H4ZM8 12h8v6H8Z",
  "menu": "M4 6h16M4 12h16M4 18h16",
  "play": "M6 3l15 9-15 9Z",
  "orbit": "M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M3 5c-5 5 14 18 18 14S7 0 3 5Z",
  "map": "M2 5l7-3 6 3 7-3v17l-7 3-6-3-7 3ZM9 2v17M15 5v17",
  "settings": "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0"
};
  const svg = name => `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name]}"/></svg>`;
  function draw(ctx, name, x, y, size, color) {
    ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(paths[name])); ctx.restore();
  }
  window.NasaIcons = {svg, draw};
})();
