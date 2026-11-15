(() => {
  'use strict';

  function shape(ctx, fill, path, stroke, width = 1) {
    ctx.beginPath();
    path(ctx);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function polygon(ctx, points, fill, stroke, width) {
    shape(ctx, fill, p => {
      p.moveTo(...points[0]);
      points.slice(1).forEach(point => p.lineTo(...point));
      p.closePath();
    }, stroke, width);
  }

  function round(ctx, x, y, w, h, r, fill, stroke) {
    shape(ctx, fill, p => p.roundRect(x, y, w, h, r), stroke);
  }

  function oval(ctx, x, y, rx, ry, fill, stroke) {
    shape(ctx, fill, p => p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2), stroke);
  }

  function line(ctx, points, color, width) {
    shape(ctx, null, p => {
      p.moveTo(...points[0]);
      points.slice(1).forEach(point => p.lineTo(...point));
    }, color, width);
  }

  // Cartoon-vector Grant Office. Drawn in a 400-unit design space (see the
  // Grant Office concept canvas) and scaled down to the yard's machine size.
  const INK = '#2b2350';
  const CARTOON_FONT = 'Fredoka, Barlow, "Trebuchet MS", sans-serif';

  function inked(ctx, fill, path, width = 4) {
    shape(ctx, fill, path, width ? INK : null, width);
  }

  function inkPolygon(ctx, points, fill, width = 4) {
    polygon(ctx, points, fill, width ? INK : null, width);
  }

  function inkRect(ctx, x, y, w, h, r, fill, width = 4) {
    inked(ctx, fill, p => p.roundRect(x, y, w, h, r), width);
  }

  function inkCircle(ctx, x, y, r, fill, width = 4) {
    inked(ctx, fill, p => p.arc(x, y, r, 0, Math.PI * 2), width);
  }

  function cartoonText(ctx, text, x, y, size, fill, outline = 0) {
    ctx.font = `700 ${size}px ${CARTOON_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (outline) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = outline;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  function grantCoin(ctx, x, y) {
    inkCircle(ctx, x, y, 22, '#ffcc33');
    shape(ctx, null, p => p.arc(x, y, 14.5, 0, Math.PI * 2), '#e79a1c', 3);
    cartoonText(ctx, '$', x, y + 9, 24, '#b05f0c');
    oval(ctx, x - 9, y - 9, 5, 3, '#ffffffbf');
  }

  function sparkle(ctx, x, y, size, alpha) {
    if (alpha <= 0) return;
    const opacity = ctx.globalAlpha;
    ctx.globalAlpha = opacity * alpha;
    const s = size, k = size * 0.3;
    inkPolygon(ctx, [[x, y - s], [x + k, y - k], [x + s, y], [x + k, y + k], [x, y + s], [x - k, y + k], [x - s, y], [x - k, y - k]], '#fff4a8', 2.5);
    ctx.globalAlpha = opacity;
  }

  function grant(ctx, state) {
    const { active, ready, time } = state;
    const idle = !active && !ready;
    ctx.save();
    ctx.scale(0.36, 0.36);
    ctx.translate(-202, -300);

    oval(ctx, 222, 300, 112, 34, '#2b235029');
    inkPolygon(ctx, [[92, 282], [200, 336], [200, 346], [92, 292]], '#e3c98f');
    inkPolygon(ctx, [[200, 336], [308, 282], [308, 292], [200, 346]], '#c9a86a');
    inkPolygon(ctx, [[92, 282], [200, 228], [308, 282], [200, 336]], '#fff0c8');

    // Left face: door, window and striped awning.
    ctx.save();
    ctx.transform(1, 0.5, 0, 1, 0, -55);
    inkRect(ctx, 110, 170, 90, 110, 0, '#ffe3a3');
    inkRect(ctx, 110, 266, 90, 14, 0, '#e8b86a');
    inkRect(ctx, 115, 176, 7, 86, 3.5, '#fff4cf', 0);
    inkRect(ctx, 116, 222, 18, 26, 4, '#9fe8ff');
    line(ctx, [[120, 228], [120, 236]], '#ffffff', 3);
    inkRect(ctx, 142, 222, 32, 58, 5, '#4b45d9');
    inkRect(ctx, 149, 230, 18, 14, 3, '#9fe8ff', 3);
    inkCircle(ctx, 167, 256, 2.5, '#ffcc33', 2);
    for (let i = 0; i < 6; i++) inkCircle(ctx, 107.7 + i * 15.32, 213, 7.6, i % 2 ? '#fff4e0' : '#ff6b5a', 3.5);
    for (let i = 0; i < 6; i++) {
      const top = 112 + i * 14.33, bottom = 100 + i * 15.33;
      polygon(ctx, [[top, 185], [top + 14.33, 185], [bottom + 15.33, 213], [bottom, 213]], i % 2 ? '#fff4e0' : '#ff6b5a');
    }
    line(ctx, [[100, 213], [112, 185], [198, 185], [192, 213]], INK, 4);
    ctx.restore();

    // Right face: the payout screen.
    ctx.save();
    ctx.transform(1, -0.5, 0, 1, 0, 100);
    inkRect(ctx, 200, 215, 90, 110, 0, '#f2b866');
    inkRect(ctx, 200, 311, 90, 14, 0, '#d39a4c');
    inkRect(ctx, 212, 232, 66, 52, 7, idle ? '#3a4170' : '#2d3a7a');
    cartoonText(ctx, '$', 229, 270, 30, idle ? '#9c9466' : '#ffd23f');
    const bars = [[15, 7, 7], [20, 6, 5.7], [15, 5, 7.9], [20, 6, 5.2]];
    bars.forEach(([mid, amp, speed], i) => {
      const height = active ? mid + amp * Math.sin(time * speed + i * 1.3) : 8 + i * 6;
      round(ctx, 248 + i * 7, 278 - height, 5, height, 1.5, idle ? '#6f7aa8' : '#7de3ff');
    });
    inkRect(ctx, 208, 283, 74, 7, 3.5, '#fff4e0', 3);
    ctx.restore();

    // Roof, dish and sign.
    inkPolygon(ctx, [[100, 168], [200, 218], [200, 231], [100, 181]], '#3a9e66');
    inkPolygon(ctx, [[200, 218], [300, 168], [300, 181], [200, 231]], '#2f8556');
    inkPolygon(ctx, [[100, 168], [200, 118], [300, 168], [200, 218]], '#5ccf8a');
    polygon(ctx, [[120, 168], [200, 128], [280, 168], [200, 208]], '#4bb877');
    line(ctx, [[110, 163], [194, 121]], '#c8f5d8', 3);
    line(ctx, [[132, 160], [132, 146]], INK, 4);
    ctx.save();
    ctx.translate(134, 140);
    ctx.rotate(-25 * Math.PI / 180);
    inked(ctx, '#fff4e0', p => p.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2));
    ctx.restore();
    line(ctx, [[134, 140], [145, 129]], INK, 3);
    const blink = active && Math.sin(time * 6) > 0;
    inkCircle(ctx, 146, 128, 4, blink ? '#ffe27a' : '#ff6b5a', 2.5);
    for (const x of [168, 232]) {
      line(ctx, [[x, 110], [x, 156]], INK, 8);
      line(ctx, [[x, 110], [x, 156]], '#8a7fb5', 3);
    }
    inkRect(ctx, 122, 66, 156, 46, 12, '#ffd23f');
    round(ctx, 130, 71, 140, 7, 3.5, '#fff1a8');
    cartoonText(ctx, 'GRANTS', 200, 99, 26, INK);

    const bob = active ? -3 - 3 * Math.sin(time * 4.5) : 0;
    grantCoin(ctx, 200, 38 + bob);

    if (active) {
      sparkle(ctx, 240, 22, 10, Math.sin(time * 5.2));
      sparkle(ctx, 158, 44, 8, Math.sin(time * 5.2 + Math.PI));
      const lift = -3.5 - 3.5 * Math.sin(time * 6.3);
      inkPolygon(ctx, [[112, 292 + lift], [124, 286 + lift], [136, 292 + lift], [124, 298 + lift]], '#9fe8ff', 3);
      inkPolygon(ctx, [[112, 292 + lift], [124, 298 + lift], [124, 312 + lift], [112, 306 + lift]], '#4fb7e8', 3);
      inkPolygon(ctx, [[124, 298 + lift], [136, 292 + lift], [136, 306 + lift], [124, 312 + lift]], '#2f8fc9', 3);
      const cycle = (time % 1.8) / 1.8;
      const opacity = ctx.globalAlpha;
      ctx.globalAlpha = opacity * (cycle < 0.6 ? 1 : 1 - (cycle - 0.6) / 0.4);
      cartoonText(ctx, '+$8', 322, 122 - 34 * cycle, 30, '#23854a', 8);
      ctx.globalAlpha = opacity;
    }

    if (ready) {
      const hop = -3.5 - 3.5 * Math.sin(time * 6.3);
      ctx.save();
      ctx.translate(0, hop);
      inkPolygon(ctx, [[116, 270], [132, 270], [124, 286]], '#ffffff');
      inkRect(ctx, 66, 230, 116, 42, 15, '#ffffff');
      inkCircle(ctx, 86, 251, 9, '#ffcc33', 3);
      ctx.textAlign = 'left';
      ctx.font = `700 17px ${CARTOON_FONT}`;
      ctx.fillStyle = INK;
      ctx.fillText('COLLECT', 100, 258);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- Cartoon kit shared by every facility ----
  // Each facility draws in the same 400-unit design space as the Grant Office:
  // a standard building's front base corner sits at (200, 325).
  const STAGE = 0.36;

  function stage(ctx) {
    ctx.save();
    ctx.scale(STAGE, STAGE);
    ctx.translate(-202, -300);
  }

  function cartoonSlab(ctx, [top, left, right], hw = 108, cx = 200, front = 336) {
    const side = front - hw / 2, back = front - hw;
    oval(ctx, cx + 22, side + 18, hw + 4, hw * 0.32, '#2b235029');
    inkPolygon(ctx, [[cx - hw, side], [cx, front], [cx, front + 10], [cx - hw, side + 10]], left);
    inkPolygon(ctx, [[cx, front], [cx + hw, side], [cx + hw, side + 10], [cx, front + 10]], right);
    inkPolygon(ctx, [[cx - hw, side], [cx, back], [cx + hw, side], [cx, front]], top);
  }

  // An isometric box whose front base corner is (cx, base); hw is its half width.
  function isoBox(ctx, cx, base, hw, h, [top, left, right], width = 4) {
    const side = base - hw / 2, back = base - hw;
    inkPolygon(ctx, [[cx - hw, side - h], [cx, base - h], [cx, base], [cx - hw, side]], left, width);
    inkPolygon(ctx, [[cx, base - h], [cx + hw, side - h], [cx + hw, side], [cx, base]], right, width);
    inkPolygon(ctx, [[cx - hw, side - h], [cx, back - h], [cx + hw, side - h], [cx, base - h]], top, width);
  }

  // Draw flat artwork onto a box face. On the left face, local y matches global y at
  // x = cx - hw; on the right face, local y matches global y at x = cx.
  function onLeftFace(ctx, cx, hw, draw) {
    ctx.save();
    ctx.transform(1, 0.5, 0, 1, 0, -0.5 * (cx - hw));
    draw();
    ctx.restore();
  }

  function onRightFace(ctx, cx, draw) {
    ctx.save();
    ctx.transform(1, -0.5, 0, 1, 0, 0.5 * cx);
    draw();
    ctx.restore();
  }

  function isoCylinder(ctx, cx, base, r, h, [body, shade, top], ry = r / 2) {
    const t = base - h;
    const hull = p => {
      p.moveTo(cx - r, t);
      p.lineTo(cx - r, base);
      p.ellipse(cx, base, r, ry, 0, Math.PI, 0, true);
      p.lineTo(cx + r, t);
      p.closePath();
    };
    shape(ctx, body, hull);
    ctx.save();
    ctx.beginPath();
    hull(ctx);
    ctx.clip();
    ctx.fillStyle = shade;
    ctx.fillRect(cx + r * 0.38, t - ry, r, h + ry * 2);
    ctx.fillStyle = '#ffffff59';
    ctx.fillRect(cx - r * 0.72, t, r * 0.12, h + ry);
    ctx.restore();
    shape(ctx, null, hull, INK, 4);
    inked(ctx, top, p => p.ellipse(cx, t, r, ry, 0, 0, Math.PI * 2));
  }

  function blinkLight(ctx, x, y, on, r = 5) {
    inkCircle(ctx, x, y, r, on ? '#c8ff59' : '#5fd88a', 2.5);
    oval(ctx, x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.22, '#ffffffcc');
  }

  function blinking(state, speed = 5.5) {
    return state.active && Math.sin(state.time * speed) > -0.2;
  }

  function star(ctx, x, y, r, fill, width = 3) {
    const points = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 ? r * 0.45 : r;
      points.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
    }
    inkPolygon(ctx, points, fill, width);
  }

  function gear(ctx, x, y, r, angle, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const points = [];
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16;
      const radius = i % 4 < 2 ? r * 1.3 : r;
      points.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }
    inkPolygon(ctx, points, fill, 2.5);
    inkCircle(ctx, 0, 0, r * 0.38, '#2d3a7a', 2.5);
    ctx.restore();
  }

  function puff(ctx, x, y, r, alpha) {
    if (alpha <= 0) return;
    const opacity = ctx.globalAlpha;
    ctx.globalAlpha = opacity * alpha;
    inkCircle(ctx, x, y, r, '#ffffff', 3);
    ctx.globalAlpha = opacity;
  }

  function ground(ctx, state) {
    const { active, time } = state;
    stage(ctx);
    cartoonSlab(ctx, ['#e6fbff', '#a9dbe8', '#86bfd2']);
    isoBox(ctx, 200, 325, 80, 72, ['#c6f4ff', '#7de3ff', '#4fb7e8']);
    onLeftFace(ctx, 200, 80, () => {
      inkRect(ctx, 124, 220, 7, 58, 3.5, '#e6fbff', 0);
      inkRect(ctx, 136, 228, 54, 34, 6, '#2d3a7a');
      const phase = active ? time * 6 : 0;
      const wave = [];
      for (let i = 0; i <= 12; i++) wave.push([140 + i * 3.8, 245 + Math.sin(phase + i * 0.9) * 7]);
      line(ctx, wave, '#7de3ff', 3);
      inkRect(ctx, 132, 266, 62, 7, 3.5, '#e6fbff', 3);
    });
    onRightFace(ctx, 200, () => {
      inkRect(ctx, 214, 268, 28, 57, 5, '#4b45d9');
      inkRect(ctx, 220, 276, 16, 12, 3, '#9fe8ff', 3);
      for (let i = 0; i < 3; i++) inkRect(ctx, 252, 284 + i * 10, 18, 5, 2.5, '#2f8fc9', 2.5);
      blinkLight(ctx, 262, 270, blinking(state));
    });

    // Roof solar panel and dish.
    const panel = [[136, 214], [180, 192], [180, 172], [136, 194]];
    line(ctx, [[158, 203], [158, 190]], INK, 5);
    inkPolygon(ctx, panel, '#4b45d9');
    for (let k = 1; k < 3; k++) line(ctx, [[136 + 44 * k / 3, 214 - 22 * k / 3], [136 + 44 * k / 3, 194 - 22 * k / 3]], '#9fe8ff', 2);
    line(ctx, [[136, 204], [180, 182]], '#9fe8ff', 2);
    inked(ctx, '#e6fbff', p => p.ellipse(222, 214, 14, 7, 0, 0, Math.PI * 2), 3);
    line(ctx, [[222, 214], [222, 160]], INK, 9);
    line(ctx, [[222, 214], [222, 160]], '#9fe8ff', 3);
    const tilt = -0.5 + (active ? 0.08 * Math.sin(time * 2.5) : 0);
    ctx.save();
    ctx.translate(222, 150);
    ctx.rotate(tilt);
    inked(ctx, '#fff8e8', p => p.ellipse(0, 0, 48, 22, 0, 0, Math.PI * 2));
    shape(ctx, '#c6f4ff', p => p.ellipse(0, 2, 34, 14, 0, 0, Math.PI * 2));
    line(ctx, [[0, 0], [0, -34]], INK, 4);
    inkCircle(ctx, 0, -38, 6, '#ff6b5a', 3);
    ctx.restore();
    if (active) {
      const fx = 222 + 38 * Math.sin(tilt), fy = 150 - 38 * Math.cos(tilt);
      for (let k = 0; k < 2; k++) {
        const wave = ((time * 1.2) + k * 0.5) % 1;
        const opacity = ctx.globalAlpha;
        ctx.globalAlpha = opacity * (1 - wave);
        shape(ctx, null, p => p.arc(fx, fy, 14 + wave * 34, -2.5, -0.9), '#4b45d9', 4);
        ctx.globalAlpha = opacity;
      }
    }
    ctx.restore();
  }

  function flame(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    inked(ctx, '#ffd23f', p => {
      p.moveTo(0, -26);
      p.bezierCurveTo(14, -10, 16, 4, 0, 12);
      p.bezierCurveTo(-16, 4, -14, -10, 0, -26);
      p.closePath();
    }, 3.5);
    shape(ctx, '#ff6b5a', p => {
      p.moveTo(0, -8);
      p.bezierCurveTo(7, 0, 7, 6, 0, 9);
      p.bezierCurveTo(-7, 6, -7, 0, 0, -8);
      p.closePath();
    });
    ctx.restore();
  }

  function fuel(ctx, state) {
    const { active, time } = state;
    stage(ctx);
    cartoonSlab(ctx, ['#fff0d6', '#ecc48c', '#d2a364']);
    isoCylinder(ctx, 252, 292, 32, 140, ['#fff4e0', '#e8cfa8', '#ffffff']);
    inkRect(ctx, 244, 190, 16, 70, 8, '#2d3a7a', 3);
    const level = active ? 40 + 14 * Math.sin(time * 5) : 34;
    round(ctx, 248, 256 - level, 8, level, 4, '#ff8a4c');
    const pipe = [[160, 200], [160, 136], [252, 136], [252, 152]];
    line(ctx, pipe, INK, 14);
    line(ctx, pipe, '#ffd23f', 7);
    isoCylinder(ctx, 160, 316, 46, 110, ['#ff8a4c', '#e05a3a', '#ffc06b']);
    shape(ctx, null, p => p.ellipse(160, 300, 46, 23, 0, 0.15, Math.PI - 0.15), '#fff4e0', 7);
    flame(ctx, 152, 256, active ? 1 + 0.08 * Math.sin(time * 14) : 1);
    isoBox(ctx, 236, 334, 34, 34, ['#fff1a8', '#ffd23f', '#e7a92a']);
    onRightFace(ctx, 236, () => blinkLight(ctx, 254, 316, blinking(state)));
    if (active) {
      for (let k = 0; k < 2; k++) {
        const rise = ((time * 0.8) + k * 0.5) % 1;
        puff(ctx, 252 + 10 * Math.sin(rise * 5 + k), 140 - rise * 46, 8 + rise * 8, 1 - rise);
      }
    }
    ctx.restore();
  }

  function engineering(ctx, state) {
    const { active, time } = state;
    stage(ctx);
    cartoonSlab(ctx, ['#e3ecff', '#a9b8e8', '#8a9bd2']);
    isoBox(ctx, 200, 325, 90, 80, ['#c6d8ff', '#7da7ff', '#5a7fe0']);
    onLeftFace(ctx, 200, 90, () => {
      inkRect(ctx, 114, 206, 7, 68, 3.5, '#e3ecff', 0);
      inkRect(ctx, 126, 214, 64, 66, 6, '#ffd23f');
      for (let y = 226; y < 278; y += 11) line(ctx, [[130, y], [186, y]], '#e7a92a', 3);
    });
    onRightFace(ctx, 200, () => {
      inkRect(ctx, 214, 258, 62, 44, 7, '#2d3a7a');
      gear(ctx, 245, 280, 13, active ? time * 2 : 0, '#7de3ff');
      blinkLight(ctx, 280, 314, blinking(state));
    });

    // Workpiece and robot arm on the roof.
    isoBox(ctx, 160, 204, 14, 12, ['#fff4e0', '#e3ecff', '#a9b8e8'], 3);
    isoCylinder(ctx, 238, 206, 18, 12, ['#ff8a4c', '#e05a3a', '#ffc06b']);
    const swing = active ? Math.sin(time * 5.8) * 18 : 0;
    const shoulder = [238, 192], elbow = [214 + swing * 0.5, 128], hand = [162 + swing, 160];
    line(ctx, [shoulder, elbow, hand], INK, 16);
    line(ctx, [shoulder, elbow, hand], '#ff8a4c', 9);
    inkCircle(ctx, ...shoulder, 10, '#ffd23f', 3);
    inkCircle(ctx, ...elbow, 9, '#ffd23f', 3);
    line(ctx, [[hand[0] - 8, hand[1] + 14], hand, [hand[0] + 8, hand[1] + 14]], INK, 5);
    if (active && Math.sin(time * 13) > 0.4) sparkle(ctx, hand[0], hand[1] + 22, 9, 1);
    ctx.restore();
  }

  function research(ctx, state) {
    const { active, time } = state;
    stage(ctx);
    cartoonSlab(ctx, ['#f3e8ff', '#cdb3ee', '#b097d8']);
    isoBox(ctx, 200, 325, 90, 96, ['#f0d4ff', '#c99bff', '#a374e8']);
    onLeftFace(ctx, 200, 90, () => {
      inkRect(ctx, 114, 190, 7, 84, 3.5, '#f8ecff', 0);
      inkRect(ctx, 126, 200, 64, 60, 8, '#2d3a7a');
      const lift = active ? Math.sin(time * 4.5) * 2 : 0;
      ctx.save();
      ctx.translate(0, lift);
      const flask = p => {
        p.moveTo(152, 214);
        p.lineTo(164, 214);
        p.lineTo(164, 228);
        p.lineTo(180, 252);
        p.quadraticCurveTo(182, 256, 177, 256);
        p.lineTo(139, 256);
        p.quadraticCurveTo(134, 256, 136, 252);
        p.lineTo(152, 228);
        p.closePath();
      };
      shape(ctx, '#e6fbff', flask);
      shape(ctx, '#7dffe1', p => {
        p.moveTo(145.3, 238);
        p.lineTo(170.7, 238);
        p.lineTo(180, 252);
        p.quadraticCurveTo(182, 256, 177, 256);
        p.lineTo(139, 256);
        p.quadraticCurveTo(134, 256, 136, 252);
        p.closePath();
      });
      shape(ctx, null, flask, INK, 3.5);
      ctx.restore();
      if (active) {
        for (let k = 0; k < 3; k++) {
          const rise = ((time * 0.9) + k / 3) % 1;
          inkCircle(ctx, 152 + k * 6, 236 - rise * 30, 3, '#ffffff', 1.5);
        }
      }
      inkRect(ctx, 122, 262, 72, 7, 3.5, '#f8ecff', 3);
    });
    onRightFace(ctx, 200, () => {
      inkRect(ctx, 222, 268, 30, 57, 5, '#4b45d9');
      inkRect(ctx, 229, 276, 16, 12, 3, '#c6f4ff', 3);
      inkRect(ctx, 260, 252, 20, 26, 4, '#c6f4ff');
    });

    // Rooftop observatory and antenna.
    isoCylinder(ctx, 196, 196, 40, 14, ['#fff4e0', '#e8dcc8', '#ffffff']);
    const swivel = active ? Math.sin(time * 1.6) * 0.15 : 0;
    inked(ctx, '#fff8e8', p => {
      p.ellipse(196, 182, 40, 40, 0, Math.PI, 0);
      p.closePath();
    });
    ctx.save();
    ctx.translate(196, 182);
    ctx.rotate(swivel);
    round(ctx, -6, -38, 12, 38, 6, '#2d3a7a');
    line(ctx, [[0, -22], [26, -50]], INK, 12);
    line(ctx, [[0, -22], [26, -50]], '#c99bff', 6);
    ctx.restore();
    line(ctx, [[272, 190], [272, 140]], INK, 5);
    blinkLight(ctx, 272, 136, blinking(state, 4));
    ctx.restore();
  }

  function trainee(ctx, x, y) {
    inkRect(ctx, x - 28, y - 4, 12, 22, 6, '#fff4e0', 3);
    inkRect(ctx, x + 16, y - 4, 12, 22, 6, '#fff4e0', 3);
    inkRect(ctx, x - 18, y - 8, 36, 30, 10, '#fff4e0', 3.5);
    inkRect(ctx, x - 18, y + 8, 36, 6, 2, '#ff6b5a', 0);
    inkCircle(ctx, x, y - 22, 20, '#fff9ec', 3.5);
    inked(ctx, '#4b45d9', p => p.ellipse(x + 4, y - 22, 14, 10, 0, 0, Math.PI * 2), 3);
    oval(ctx, x + 9, y - 26, 4, 2, '#ffffffcc');
  }

  function academy(ctx, state) {
    const { active, time } = state;
    stage(ctx);
    cartoonSlab(ctx, ['#ffe6f1', '#efb3cc', '#d896b2']);
    isoCylinder(ctx, 200, 298, 80, 34, ['#ff8fb8', '#e0679a', '#ffc2da']);
    inkCircle(ctx, 150, 292, 8, '#9fe8ff', 3);
    inkCircle(ctx, 250, 292, 8, '#9fe8ff', 3);
    star(ctx, 200, 302, 11, '#ffd23f');
    const top = 264;
    const bob = active ? Math.sin(time * 4) * 7 - 6 : 0;
    trainee(ctx, 200, 252 + bob);
    const dome = p => {
      p.ellipse(200, top, 76, 76, 0, Math.PI, 0);
      p.ellipse(200, top, 76, 38, 0, 0, Math.PI);
      p.closePath();
    };
    shape(ctx, '#9fe8ff73', dome, INK, 4);
    shape(ctx, null, p => p.arc(200, top, 60, -2.7, -2.0), '#ffffff', 6);
    line(ctx, [[278, 280], [292, 280], [292, 196]], INK, 5);
    blinkLight(ctx, 292, 192, blinking(state));
    ctx.restore();
  }

  function scrap(ctx, state) {
    const { active, time } = state;
    stage(ctx);
    cartoonSlab(ctx, ['#e0fff2', '#a7dcc5', '#86c2a8'], 88, 200, 330);
    isoBox(ctx, 200, 322, 70, 56, ['#2b4a52', '#5fd8a8', '#3fae84']);
    inkPolygon(ctx, [[130, 231], [200, 196], [186, 160], [116, 195]], '#4fbf8f');
    inkPolygon(ctx, [[200, 196], [270, 231], [284, 195], [214, 160]], '#3fae84');
    const shake = active ? Math.sin(time * 18) * 1.5 : 0;
    line(ctx, [[180 + shake, 236], [172 + shake, 206]], INK, 10);
    line(ctx, [[180 + shake, 236], [172 + shake, 206]], '#ffb46b', 5);
    gear(ctx, 216 - shake, 222, 11, 0.3, '#e596ff');
    onLeftFace(ctx, 200, 70, () => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(134, 258, 62, 12, 3);
      ctx.clip();
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(134, 258, 62, 12);
      for (let x = 126; x < 200; x += 14) polygon(ctx, [[x, 270], [x + 7, 270], [x + 19, 258], [x + 12, 258]], INK);
      ctx.restore();
      inkRect(ctx, 134, 258, 62, 12, 3, null, 3);
      inkCircle(ctx, 146, 287, 6, '#6f7aa8', 3);
      inkCircle(ctx, 186, 287, 6, '#6f7aa8', 3);
    });
    onRightFace(ctx, 200, () => {
      shape(ctx, null, p => p.arc(236, 290, 12, 0.4, 5.6), '#fff4e0', 5);
      polygon(ctx, [[245, 276], [254, 288], [240, 289]], '#fff4e0');
      blinkLight(ctx, 258, 270, blinking(state));
    });
    ctx.restore();
  }

  function launch(ctx, state) {
    const { time, liftoff, ignition = 0 } = state;
    const firing = ignition > 0 || liftoff > 0;
    stage(ctx);
    oval(ctx, 222, 352, 214, 66, '#2b235029');
    isoCylinder(ctx, 200, 344, 192, 30, ['#c6d8ff', '#8a9bd2', '#e6eeff'], 62);
    const top = 314;
    ctx.setLineDash([22, 14]);
    shape(ctx, null, p => p.ellipse(200, top, 150, 48, 0, 0, Math.PI * 2), '#ffd23f', 7);
    ctx.setLineDash([]);
    inked(ctx, '#3a4170', p => p.ellipse(200, top, 96, 31, 0, 0, Math.PI * 2));
    line(ctx, [[150, top], [250, top]], '#6f7aa8', 3);
    line(ctx, [[200, top - 24], [200, top + 24]], '#6f7aa8', 3);
    for (const dx of [-150, -90, 0, 90, 150]) {
      const y = 344 + 62 * Math.sqrt(1 - (dx / 192) ** 2) - 14;
      const on = firing && Math.sin(time * 14 + dx) > 0;
      inkCircle(ctx, 200 + dx, y, 6, on ? '#fff083' : '#ffd23f', 2.5);
    }

    // Service tower.
    for (const x of [300, 334]) {
      line(ctx, [[x, 292], [x, 60]], INK, 12);
      line(ctx, [[x, 292], [x, 60]], '#ff6b5a', 6);
    }
    for (let y = 272; y > 90; y -= 38) line(ctx, [[300, y], [334, y - 19], [300, y - 38]], INK, 5);
    inkRect(ctx, 290, 46, 54, 16, 6, '#ffd23f');
    line(ctx, [[317, 46], [317, 16]], INK, 5);
    const beacon = firing && Math.sin(time * 14) > 0;
    inkCircle(ctx, 317, 12, 8, beacon ? '#fff083' : '#ff6b5a', 3);
    // The service arm swings clear as the engines light.
    if (ignition < 1) {
      ctx.save();
      ctx.translate(302, 156);
      ctx.rotate(-ignition * 1.2);
      inkRect(ctx, -52, -6, 52, 12, 4, '#ffd23f', 3);
      ctx.restore();
    }
    ctx.restore();

    if (firing && liftoff < 80) {
      const glow = Math.min(1, ignition + liftoff / 40) * (1 - liftoff / 80);
      oval(ctx, 0, 2, 22 + 22 * glow, 7 + 6 * glow, `rgba(255, 196, 92, ${0.55 * glow})`);
    }
    ctx.save();
    ctx.translate(0, -liftoff);
    rocket(ctx, { ...state, thrust: liftoff > 0 ? 1 : ignition });
    ctx.restore();
  }

  // The rocket is drawn in yard units so lift-off keeps its existing distance scale.
  function rocket(ctx, state) {
    const w = 1.5;
    const thrust = state.thrust ?? (state.liftoff > 0 ? 1 : 0);
    if (thrust > 0) {
      const length = 12 + 34 * thrust + 7 * Math.sin(state.time * 27);
      const spread = 9 + 6 * thrust;
      shape(ctx, 'rgba(255, 138, 76, 0.45)', p => {
        p.moveTo(-spread - 4, -4);
        p.quadraticCurveTo(-spread, length * 0.8, 0, length * 1.25);
        p.quadraticCurveTo(spread, length * 0.8, spread + 4, -4);
        p.closePath();
      });
      shape(ctx, '#ffd23f', p => {
        p.moveTo(-11, -4);
        p.quadraticCurveTo(-9, length * 0.7, 0, length);
        p.quadraticCurveTo(9, length * 0.7, 11, -4);
        p.closePath();
      }, INK, w);
      shape(ctx, '#fff4a8', p => {
        p.moveTo(-5, -4);
        p.quadraticCurveTo(-4, length * 0.45, 0, length * 0.62);
        p.quadraticCurveTo(4, length * 0.45, 5, -4);
        p.closePath();
      });
    }
    shape(ctx, '#e0503f', p => {
      p.moveTo(10, -43);
      p.quadraticCurveTo(24, -31, 29, -6);
      p.lineTo(22, -8);
      p.lineTo(11, -20);
      p.closePath();
    }, INK, w);
    shape(ctx, '#ff6b5a', p => {
      p.moveTo(-12, -48);
      p.quadraticCurveTo(-28, -32, -31, -6);
      p.lineTo(-23, -7);
      p.lineTo(-10, -20);
      p.closePath();
    }, INK, w);
    shape(ctx, '#6f7aa8', p => p.roundRect(-9, -12, 18, 11, 3), INK, w);
    const body = p => {
      p.moveTo(0, -137);
      p.bezierCurveTo(-8, -136, -20, -104, -21, -75);
      p.bezierCurveTo(-22, -51, -17, -23, -12, -11);
      p.quadraticCurveTo(0, -4, 12, -11);
      p.bezierCurveTo(17, -23, 22, -51, 21, -75);
      p.bezierCurveTo(20, -104, 8, -136, 0, -137);
      p.closePath();
    };
    shape(ctx, '#fff8e8', body);
    ctx.save();
    ctx.beginPath();
    body(ctx);
    ctx.clip();
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(8, -140, 20, 140);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-16, -96, 3.5, 66);
    ctx.restore();
    shape(ctx, null, body, INK, w);
    shape(ctx, '#ff6b5a', p => {
      p.moveTo(0, -137);
      p.bezierCurveTo(-5.5, -137, -13.5, -118, -17, -104);
      p.quadraticCurveTo(0, -99, 17, -104);
      p.bezierCurveTo(13.5, -118, 5.5, -137, 0, -137);
      p.closePath();
    }, INK, w);
    shape(ctx, '#c6d8ff', p => p.arc(-1, -80, 13, 0, Math.PI * 2), INK, w);
    shape(ctx, '#4b45d9', p => p.arc(-1, -80, 9.5, 0, Math.PI * 2), INK, 1.1);
    oval(ctx, -4.5, -84, 3.2, 1.8, '#ffffffcc');
    shape(ctx, null, p => {
      p.moveTo(-16, -26);
      p.quadraticCurveTo(0, -17, 16, -26);
    }, INK, w);
    star(ctx, -1, -54, 7.5, '#ffd23f', 1.2);
    shape(ctx, '#ff6b5a', p => p.roundRect(-3.5, -42, 7, 13, 3), INK, 1.1);
  }

  function gate(ctx, w) {
    const x = w / 2 - 9;
    for (const pole of [-x, x]) {
      oval(ctx, pole, 15, 6.5, 2.9, '#2b235033');
      shape(ctx, '#ff6b5a', p => p.roundRect(pole - 3, -2, 6, 17, 2), INK, 1.4);
      shape(ctx, '#ffd23f', p => p.arc(pole, -3, 3.2, 0, Math.PI * 2), INK, 1.4);
    }
    const chain = p => {
      p.moveTo(-x, 5);
      p.quadraticCurveTo(0, 18, x, 5);
    };
    shape(ctx, null, chain, INK, 3.6);
    shape(ctx, null, chain, '#ffd23f', 1.8);
    shape(ctx, null, p => {
      p.moveTo(-3.5, 6);
      p.lineTo(-3.5, 3.5);
      p.arc(0, 3.5, 3.5, Math.PI, 0);
      p.lineTo(3.5, 6);
    }, INK, 2.4);
    shape(ctx, '#ffcc33', p => p.roundRect(-6, 5, 12, 10, 3), INK, 1.4);
    shape(ctx, INK, p => p.arc(0, 9.5, 1.4, 0, Math.PI * 2));
  }

  const machines = { ground, grant, fuel, engineering, research, academy, scrap, launch };
  const aliases = {
    groundStation: 'ground', data: 'ground', grantOffice: 'grant', fuelPlant: 'fuel', parts: 'engineering',
    lab: 'research', researchLab: 'research', crew: 'academy', scrapBin: 'scrap', pad: 'launch', launchPad: 'launch',
  };

  // A gold star floats over a factory holding a special product; a burst plays when one is made.
  const SPECIAL_TOP = { engineering: -78, research: -78, academy: -58 };
  const SPECIAL_FLASH = 1.4;

  function specialBadge(ctx, top, time, holding, flash) {
    const opacity = ctx.globalAlpha;
    if (flash < SPECIAL_FLASH) {
      const t = flash / SPECIAL_FLASH;
      ctx.globalAlpha = opacity * (1 - t);
      shape(ctx, null, p => p.arc(0, top, 10 + t * 34, 0, Math.PI * 2), '#ffd23f', 3.5 * (1 - t) + 0.5);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + t;
        const inner = 14 + t * 20, outer = 20 + t * 30;
        line(ctx, [[Math.cos(a) * inner, top + Math.sin(a) * inner], [Math.cos(a) * outer, top + Math.sin(a) * outer]], '#fff4a8', 2.2);
      }
      ctx.globalAlpha = opacity;
    }
    const pop = flash < 0.35 ? 1 + 0.6 * Math.sin(flash / 0.35 * Math.PI) : 1;
    const bob = Math.sin(time * 3.2) * 2.5;
    if (!holding && flash >= 0.6) return;
    ctx.save();
    ctx.translate(0, top + bob);
    ctx.scale(pop, pop);
    shape(ctx, '#ffd23f40', p => p.arc(0, 0, 13 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2));
    star(ctx, 0, 0, 9.5, '#ffd23f', 1.6);
    oval(ctx, -2.5, -3, 2.4, 1.4, '#fffbe0');
    ctx.restore();
  }

  function draw(ctx, id, x, y, scale = 1, options = {}) {
    const machineId = aliases[id] || id;
    const machine = machines[machineId];
    if (!machine) return;
    const { active = false, locked = false, ready = false, special = false, flash = Infinity, time = 0, liftoff = 0, ignition = 0 } = options;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const opacity = ctx.globalAlpha;
    if (locked) ctx.globalAlpha = opacity * 0.39;
    machine(ctx, { active: active && !locked, ready: ready && !locked, time, liftoff, ignition });
    if (locked) {
      ctx.globalAlpha = opacity;
      gate(ctx, machineId === 'scrap' ? 58 : 76);
    } else if (special || flash < SPECIAL_FLASH) {
      specialBadge(ctx, SPECIAL_TOP[machineId] ?? -76, time, special, flash);
    }
    ctx.restore();
  }

  window.SpaceportMachines = Object.freeze({ draw });
})();
