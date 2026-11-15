(() => {
  'use strict';

  // Full-screen confetti for successful launches. The layer is a manual popover so it
  // draws above the modal flight report, which lives in the browser's top layer.
  const COLORS = ['#ffd23f', '#ff6b5a', '#4b45d9', '#5fd88a', '#7de3ff', '#ff8fb8', '#ffffff'];
  const INK = '#2b2350';
  const GRAVITY = 820;
  const MAX_LIFE = 5.5;
  let layer = null;
  let canvas = null;
  let ctx = null;
  let pieces = [];
  let frame = 0;
  let last = 0;
  let ratio = 1;

  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const random = (min, max) => min + Math.random() * (max - min);

  function ensureLayer() {
    if (layer) return;
    layer = document.createElement('div');
    layer.className = 'confetti-layer';
    layer.setAttribute('aria-hidden', 'true');
    if ('popover' in HTMLElement.prototype) layer.popover = 'manual';
    canvas = document.createElement('canvas');
    layer.append(canvas);
    document.body.append(layer);
    ctx = canvas.getContext('2d');
  }

  function showLayer() {
    layer.hidden = false;
    if (!layer.popover) return;
    try {
      // Re-showing moves the layer above anything opened since, such as the report dialog.
      if (layer.matches(':popover-open')) layer.hidePopover();
      layer.showPopover();
    } catch {
      // Older browsers fall back to the fixed-position layer.
    }
  }

  function hideLayer() {
    if (!layer) return;
    try {
      if (layer.popover && layer.matches(':popover-open')) layer.hidePopover();
    } catch {}
    layer.hidden = true;
  }

  function resize() {
    ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    return { width, height };
  }

  function piece(x, y, vx, vy) {
    const roll = Math.random();
    return {
      x, y, vx, vy,
      angle: random(0, Math.PI * 2),
      spin: random(-9, 9),
      sway: random(0, Math.PI * 2),
      size: random(7, 13),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: roll < 0.14 ? 'star' : roll < 0.45 ? 'ribbon' : roll < 0.7 ? 'dot' : 'square',
      life: 0,
    };
  }

  function cannon(fromLeft, count, width, height) {
    const x = fromLeft ? -10 : width + 10;
    const direction = fromLeft ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const speed = random(620, 1080);
      const angle = random(0.95, 1.35); // radians above horizontal
      pieces.push(piece(x, height * random(0.72, 0.9), Math.cos(angle) * speed * direction, -Math.sin(angle) * speed));
    }
  }

  function rain(count, width) {
    for (let i = 0; i < count; i++) {
      pieces.push(piece(random(0, width), random(-260, -20), random(-60, 60), random(40, 220)));
    }
  }

  function star(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    }
    ctx.closePath();
  }

  function drawPiece(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    // Flip around one axis so flat pieces appear to tumble.
    ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(p.angle * 1.7 + p.sway))));
    ctx.fillStyle = p.color;
    if (p.shape === 'star') {
      star(0, 0, p.size * 0.85);
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = INK;
      ctx.stroke();
    } else if (p.shape === 'dot') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'ribbon') {
      ctx.fillRect(-p.size * 0.18, -p.size * 0.75, p.size * 0.36, p.size * 1.5);
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
    }
    ctx.restore();
  }

  function step(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    const { width, height } = resize();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const p of pieces) {
      p.life += dt;
      p.vy += GRAVITY * dt * (p.vy > 0 ? 0.35 : 1);
      p.vx *= p.vy > 0 ? 0.985 : 0.995;
      if (p.vy > 140) p.vy = 140 + (p.vy - 140) * 0.9;
      p.sway += dt * 4;
      p.x += (p.vx + Math.sin(p.sway) * 40) * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
    pieces = pieces.filter(p => p.y < height + 40 && p.life < MAX_LIFE);
    for (const p of pieces) {
      ctx.globalAlpha = p.life > MAX_LIFE - 0.8 ? Math.max(0, (MAX_LIFE - p.life) / 0.8) : 1;
      drawPiece(p);
    }
    ctx.globalAlpha = 1;
    if (pieces.length) frame = requestAnimationFrame(step);
    else {
      frame = 0;
      hideLayer();
    }
  }

  function burst(stars = 3) {
    if (reduceMotion() || !stars) return;
    ensureLayer();
    showLayer();
    const { width, height } = resize();
    const scale = Math.min(1.4, Math.max(0.6, width / 1200));
    const amount = (stars === 3 ? 110 : stars === 2 ? 60 : 34) * scale;
    cannon(true, amount / 2, width, height);
    cannon(false, amount / 2, width, height);
    if (stars === 3) {
      rain(amount * 0.6, width);
      // A second volley right after the first makes the three-star moment land.
      setTimeout(() => {
        if (!layer || layer.hidden) return;
        cannon(true, amount / 3, width, height);
        cannon(false, amount / 3, width, height);
        run();
      }, 420);
    }
    run();
  }

  function run() {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(step);
  }

  window.SpaceportCelebrate = { burst };
})();
