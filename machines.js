(() => {
  'use strict';

  const palette = { cyan: '#7efaff', lime: '#c8ff59', apricot: '#ffe15a', violet: '#e596ff' };
  const edge = '#17276c52';

  function gradient(ctx, x0, y0, x1, y1, stops) {
    const value = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([stop, color]) => value.addColorStop(stop, color));
    return value;
  }

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

  function light(ctx, x, y, color, size = 2.4) {
    oval(ctx, x, y, size + 1.8, size, '#0b1f2f9a');
    oval(ctx, x, y, size, size - 0.3, color);
    oval(ctx, x - 0.5, y - 0.6, size / 2, size / 3, '#fff8df');
  }

  function led(ctx, x, y, state) {
    const bright = state.active && Math.sin(state.time * 5.5) > -0.2;
    const color = state.active ? (bright ? palette.lime : '#49b936') : '#8ad95c';
    if (bright) oval(ctx, x, y, 6.7, 5.5, '#d0ff6380');
    light(ctx, x, y, color, state.active ? 2.6 : 1.9);
  }

  function block(ctx, x, y, width, height, depth, colors) {
    const dx = depth * 0.64;
    const front = gradient(ctx, x, y, x + width, y + height, [[0, colors[1]], [1, colors[2]]]);
    polygon(ctx, [[x, y], [x + width, y], [x + width, y + height], [x, y + height]], front, edge);
    polygon(ctx, [[x + width, y], [x + width + dx, y - depth], [x + width + dx, y + height - depth],
      [x + width, y + height]], colors[2], edge);
    polygon(ctx, [[x, y], [x + dx, y - depth], [x + width + dx, y - depth], [x + width, y]], colors[0], edge);
    line(ctx, [[x + 1, y + 1], [x + width - 0.5, y + 1]], '#fffff19b', 1.25);
  }

  function foundation(ctx, w, colors) {
    oval(ctx, 5, 10, w * 0.59, 19, '#54303935');
    oval(ctx, 1, 7, w * 0.53, 15, '#49345331');
    block(ctx, -w / 2 - 5, 10, w, 7, 17, colors);
    line(ctx, [[-w / 2 + 2, 15], [-w / 2 + 13, 15]], '#f4dbad77', 1.2);
    line(ctx, [[w / 2 - 18, 15], [w / 2 - 7, 15]], '#0b273d60', 1.2);
  }

  function cylinder(ctx, x, y, radius, top, height, colors, ry = radius * 0.32) {
    const [shine, center, shade, cap] = colors;
    const hull = gradient(ctx, x - radius, top, x + radius, top, [
      [0, shade], [0.19, shine], [0.42, center], [0.83, shade], [1, shade],
    ]);
    shape(ctx, hull, p => {
      p.moveTo(x - radius, top);
      p.lineTo(x - radius, y);
      p.ellipse(x, y, radius, ry, 0, Math.PI, 0, true);
      p.lineTo(x + radius, top);
      p.closePath();
    }, edge);
    oval(ctx, x, top, radius, ry, cap, edge);
    if (height > 9) {
      line(ctx, [[x - radius * 0.54, top + ry], [x - radius * 0.54, y + 1]], '#fff9df33', 1);
    }
  }

  function bolts(ctx, left, right, y, fill = '#435c68') {
    oval(ctx, left, y, 1.5, 1.1, fill);
    oval(ctx, right, y, 1.5, 1.1, fill);
  }

  function vents(ctx, x, y, n, width = 4) {
    for (let i = 0; i < n; i++) {
      round(ctx, x + i * (width + 2), y, width, 2.2, 1, '#142c4195');
    }
  }

  function panel(ctx, x, y, width, height, accent = palette.cyan) {
    round(ctx, x, y, width, height, 3, '#173245', '#ecf7ef8c');
    const waveform = [[0.12, 0.67], [0.26, 0.67], [0.36, 0.3], [0.48, 0.72], [0.59, 0.54], [0.86, 0.54]];
    line(ctx, waveform.map(([px, py]) => [x + width * px, y + height * py]), accent, 1.2);
    line(ctx, [[x + 2, y + height - 3], [x + width - 2, y + height - 3]], '#c3f4f038', 0.8);
  }

  function marking(ctx, x, y, label, color, size = 7) {
    ctx.font = `800 ${size}px ui-monospace, monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, x, y);
  }

  function badge(ctx, x, y, label, color, width = 19) {
    round(ctx, x - width / 2, y - 8, width, 11, 4.5, '#fff7d9', '#353b7f68');
    marking(ctx, x, y, label, color, 7.4);
  }

  function antenna(ctx, x, y, height, state, color = palette.cyan) {
    round(ctx, x - 5, y - 2, 10, 7, 1.5, '#496779', edge);
    line(ctx, [[x, y], [x, y - height]], '#36556b', 2.5);
    line(ctx, [[x - 0.7, y], [x - 0.7, y - height]], '#c4e6e4', 0.9);
    light(ctx, x, y - height, state.active ? palette.lime : color, 2.4);
  }

  function stripes(ctx, x, y, w, h, color = '#ffd07a') {
    round(ctx, x, y, w, h, 1.4, '#263948');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 1.4);
    ctx.clip();
    for (let i = x - h; i < x + w; i += 8) {
      polygon(ctx, [[i, y + h], [i + 4, y + h], [i + 4 + h, y], [i + h, y]], color);
    }
    ctx.restore();
  }

  function photovoltaic(ctx, x, y, width, tilt) {
    const front = [[x, y], [x + width, y + tilt], [x + width + 7, y + tilt - 21], [x + 7, y - 21]];
    const face = gradient(ctx, x, y, x + width, y - 21, [[0, '#2467d3'], [0.55, '#598eff'], [1, '#4932a7']]);
    polygon(ctx, front.map(([px, py]) => [px + 1, py + 3]), '#214e9d', '#304087');
    polygon(ctx, front, face, '#b3eeff', 1.6);
    for (let i = 1; i < 5; i++) {
      const step = i / 5;
      line(ctx, [[x + width * step, y + tilt * step], [x + width * step + 7, y + tilt * step - 21]], '#a7c5e27a', 0.8);
    }
    line(ctx, [[x + 3, y - 10], [x + width + 3, y + tilt - 10]], '#a7c5e28a', 0.8);
  }

  function ground(ctx, state) {
    foundation(ctx, 91, ['#b0fff4', '#54dce0', '#2995c5']);
    photovoltaic(ctx, -47, 1, 32, -5);
    photovoltaic(ctx, 15, -3, 40, 4);
    block(ctx, -26, -9, 51, 22, 11, ['#d5fff6', '#50eada', '#298bbf']);
    round(ctx, -21, -6, 25, 16, 3, '#2c6895', '#d1fff2');
    panel(ctx, -18, -4, 19, 12);
    vents(ctx, 10, 3, 2);
    led(ctx, 14, -3, state);
    cylinder(ctx, 0, -18, 13, -28, 10, ['#a2fffc', '#4ac6e7', '#3281b7', '#cefaff']);
    line(ctx, [[0, -25], [0, -57]], '#3b85bd', 8);
    line(ctx, [[-1.8, -25], [-1.8, -57]], '#c7ffef', 2.6);
    ctx.save();
    ctx.translate(-3, -61);
    ctx.rotate(0.38 + 0.06 * Math.sin(2.5 * state.time));
    shape(ctx, '#56c6e7', p => {
      p.moveTo(-32, -7);
      p.bezierCurveTo(-27, 30, 27, 31, 32, -7);
      p.closePath();
    }, '#257caf', 1.7);
    shape(ctx, gradient(ctx, -32, -9, 18, 15, [[0, '#ffffe9'], [0.48, '#efffff'], [1, '#84d9eb']]), p => {
      p.moveTo(-34, -8);
      p.bezierCurveTo(-27, -32, 26, -32, 34, -8);
      p.bezierCurveTo(30, 17, -28, 17, -34, -8);
      p.closePath();
    }, '#f8f9ef', 1.5);
    line(ctx, [[-24, -13], [-6, 2], [19, -11]], '#6dbbdc', 1.1);
    line(ctx, [[-21, 1], [4, -26], [28, -7]], '#448bc7', 1.6);
    line(ctx, [[-21, 0], [4, -28], [28, -8]], '#efffff', 1.4);
    light(ctx, 4, -27, palette.cyan, 3.3);
    const signal = (state.time * 1.4) % 1;
    ctx.globalAlpha *= 1 - signal;
    shape(ctx, null, p => {
      p.moveTo(0 - 5 * signal, -32 - 5 * signal);
      p.quadraticCurveTo(4, -38 - 12 * signal, 9 + 5 * signal, -33 - 5 * signal);
    }, '#32c4ff', 2.1);
    ctx.restore();
  }

  function grant(ctx, state) {
    foundation(ctx, 81, ['#eaffb1', '#bde85e', '#71a341']);
    block(ctx, -34, -40, 63, 49, 16, ['#dfff9b', '#9de245', '#4bac58']);
    block(ctx, -36, -49, 68, 12, 16, ['#fff598', '#ffcf3b', '#e38c28']);
    block(ctx, -34, 3, 64, 7, 14, ['#b8ed83', '#8cda55', '#488c49']);
    round(ctx, -28, -34, 48, 32, 4, '#49934c', '#e8ffb3');
    round(ctx, -25, -31, 42, 20, 3, '#245c5e', '#60be66');
    marking(ctx, -7, -17, '$', state.active ? '#ebff6d' : '#acf783', 15);
    for (let i = 0; i < 4; i++) {
      const bar = 4 + i * 2 + (state.active ? Math.sin(state.time * 10 + i) * 1.5 : 0);
      round(ctx, 2 + i * 3, -14 - bar, 1.7, bar, 0.5, '#affff3');
    }
    round(ctx, -22, -8, 20, 2.5, 1, '#20291f');
    light(ctx, 9, -6, '#ffb74c', 1.7);
    led(ctx, 14, -6, state);
    linesOnCanopy(ctx, -31, -48, 62);
    antenna(ctx, 25, -56, 15, state, palette.apricot);
    oval(ctx, -29, -43, 2.4, 1.4, '#fff0c4');
    oval(ctx, 29, -43, 2.4, 1.4, '#fff0c4');
    const side = [[26, -33], [36, -39], [36, -26], [26, -20]];
    polygon(ctx, side, '#3c8355', '#a1e58c');
    line(ctx, [[29, -28], [34, -31]], '#e4fa6c', 1.5);
    oval(ctx, -5, -57, 12, 4, '#d39d32');
    oval(ctx, -5, -59, 12, 4, '#ffe258', '#edaa2c');
    oval(ctx, -6, -60, 8, 2, '#fff397');
  }

  function linesOnCanopy(ctx, x, y, w) {
    for (let i = 4; i < w; i += 9) {
      line(ctx, [[x + i, y], [x + i, y + 8]], '#f18c35', 1.9);
      line(ctx, [[x + i + 1.7, y + 1], [x + i + 1.7, y + 6]], '#fff3a4', 0.8);
    }
  }

  function fuel(ctx, state) {
    foundation(ctx, 76, ['#fff0ad', '#ffb74b', '#cb7648']);
    cylinder(ctx, -17, 0, 20, -48, 48, ['#ffc453', '#ff834a', '#e04a49', '#ffbe65']);
    cylinder(ctx, 19, -6, 15, -60, 54, ['#fff8dc', '#fff0ba', '#de945e', '#fff7cf']);
    cylinder(ctx, -17, -37, 20.5, -45, 8, ['#ffffad', '#ffc854', '#f17f35', '#ffdda0']);
    cylinder(ctx, 19, -53, 15.4, -60, 7, ['#fffb9e', '#ffd447', '#d78536', '#ffe48e']);
    cylinder(ctx, -17, -57, 7, -65, 8, ['#ffe37d', '#ff9a46', '#e55044', '#ffc970']);
    cylinder(ctx, 19, -65, 5, -72, 7, ['#fff2a1', '#ffd768', '#d98742', '#fff2bd']);
    line(ctx, [[-17, -63], [-17, -76], [4, -76], [4, -19], [29, -19]], '#b34e45', 7.5);
    line(ctx, [[-17, -64], [-17, -77], [4, -77], [4, -20], [29, -20]], '#ffbd53', 5.2);
    round(ctx, -35, -23, 27, 18, 5, '#d64945', '#ffcf77');
    shape(ctx, '#fff2a4', p => {
      p.moveTo(-22, -21);
      p.quadraticCurveTo(-15, -12, -22, -8);
      p.quadraticCurveTo(-28, -11, -22, -21);
    });
    round(ctx, 12, -45, 9, 21, 3, '#c27258', '#fff1b8');
    round(ctx, 13.5, -43.5, 6, 18, 2, '#ffe390');
    const fill = state.active ? 10 + 5 * Math.sin(state.time * 5) : 8;
    round(ctx, 14.5, -27 - fill, 4, fill, 1.5, '#fb734a');
    block(ctx, 7, -8, 23, 16, 6, ['#fff39b', '#f49645', '#c65747']);
    led(ctx, 20, -2, state);
    vents(ctx, 12, 3, 2, 3);
    stripes(ctx, -23, 8, 29, 4);
  }

  function engineering(ctx, state) {
    foundation(ctx, 76, ['#b5f7ff', '#70c8ff', '#4978cc']);
    block(ctx, -29, -8, 57, 16, 13, ['#8de7ff', '#50b0ff', '#3765bb']);
    stripes(ctx, -24, 1, 37, 4, '#ffdf56');
    block(ctx, 15, -43, 17, 34, 9, ['#9bdbff', '#65bdff', '#3957c9']);
    block(ctx, -29, -40, 10, 31, 8, ['#a4e4ff', '#63beff', '#4c6bc6']);
    block(ctx, -30, -47, 61, 10, 10, ['#84dfff', '#54a9ff', '#4f53c8']);
    stripes(ctx, -26, -45, 53, 5, '#ffe264');
    const swing = state.active ? Math.sin(state.time * 5.8) * 7 : 0;
    oval(ctx, 16, -33, 8, 6, '#293b92', '#8de7ff');
    line(ctx, [[16, -33], [4 + swing, -60], [-9 + swing, -42], [-9 + swing, -22]], '#463b38', 9);
    line(ctx, [[16, -33], [4 + swing, -60], [-9 + swing, -42], [-9 + swing, -22]], '#ffb459', 5);
    oval(ctx, 4 + swing, -60, 6, 5.5, '#ffe263', '#da873b');
    oval(ctx, -9 + swing, -42, 4, 4, '#fff08d', '#d99243');
    oval(ctx, 4 + swing, -60, 2, 2, '#664b46');
    line(ctx, [[-13 + swing, -20], [-9 + swing, -25], [-5 + swing, -20]], '#324855', 3.6);
    block(ctx, -14, -13, 20, 11, 7, ['#c5faff', '#8ae5ff', '#4f7ba7']);
    bolts(ctx, -10, 2, -7, '#243f60');
    panel(ctx, 17, -19, 12, 9, '#fac074');
    led(ctx, 24, -24, state);
    if (state.active && Math.sin(state.time * 13) > 0.4) {
      line(ctx, [[-8 + swing, -20], [-4 + swing, -16]], '#fff486', 2);
      line(ctx, [[-12 + swing, -19], [-16 + swing, -15]], '#ffbb55', 1.5);
    }
    round(ctx, -22, -56, 17, 12, 4.5, '#fff4b2', '#35428870');
    polygon(ctx, [[-13, -55], [-17, -50], [-13, -50], [-14, -46], [-10, -52], [-14, -52]], '#ec9228');
  }

  function research(ctx, state) {
    foundation(ctx, 76, ['#fbcaff', '#cd84fd', '#8357c9']);
    block(ctx, -29, -30, 62, 35, 14, ['#f3acff', '#b974fa', '#8550ca']);
    round(ctx, -25, -27, 47, 28, 5, '#6036a7', '#fce2ff');
    round(ctx, -22, -24, 41, 21, 3, gradient(ctx, -22, -24, 18, 4, [[0, '#8670e8'], [1, '#5346a7']]));
    line(ctx, [[-20, -21], [-7, -21]], '#e8e5ff7b', 1.4);
    line(ctx, [[4, -21], [16, -21]], '#e8e5ff52', 1.4);
    const lift = state.active ? Math.sin(state.time * 4.5) * 1.3 : 0;
    shape(ctx, '#a5fff7', p => {
      p.moveTo(-8, -23 + lift);
      p.lineTo(-1, -23 + lift);
      p.lineTo(-1, -17 + lift);
      p.lineTo(4, -8 + lift);
      p.quadraticCurveTo(4, -6 + lift, 2, -6 + lift);
      p.lineTo(-11, -6 + lift);
      p.quadraticCurveTo(-13, -6 + lift, -13, -8 + lift);
      p.lineTo(-8, -17 + lift);
      p.closePath();
    }, '#cefbf5');
    oval(ctx, -5, -10 + lift, 3, 2, '#5fdcbd');
    if (state.active) {
      const bubble = (state.time * 8) % 12;
      oval(ctx, -15, -9 - bubble, 1.9, 1.9, '#e2d2ff');
      oval(ctx, 9, -23 + bubble, 1.5, 1.5, '#f7bfff');
    }
    vents(ctx, 25, -15, 1, 3);
    led(ctx, 27, -22, state);
    block(ctx, -28, -39, 60, 9, 14, ['#f8c6ff', '#c485ff', '#8351ca']);
    block(ctx, 2, -49, 22, 10, 9, ['#ffe0ff', '#ee9dff', '#a054ce']);
    antenna(ctx, 10, -50, 17, state, palette.violet);
    badge(ctx, -11, -36, 'LAB', '#8e4ac7', 24);
  }

  function academy(ctx, state) {
    foundation(ctx, 76, ['#ffd0e8', '#ff91aa', '#c95993']);
    cylinder(ctx, 0, 2, 29, -12, 14, ['#ffd7e8', '#ff8daf', '#d05392', '#ffc7e6']);
    const glass = gradient(ctx, -24, -43, 22, -20, [[0, '#eaffff'], [0.22, '#91f1fc'], [1, '#4baddd']]);
    shape(ctx, glass, p => {
      p.moveTo(-26, -12);
      p.bezierCurveTo(-26, -64, 26, -64, 26, -12);
      p.bezierCurveTo(25, 2, -25, 2, -26, -12);
      p.closePath();
    }, '#efffff', 1.6);
    shape(ctx, null, p => {
      p.moveTo(-19, -19);
      p.quadraticCurveTo(-18, -37, -8, -43);
    }, '#e4fff3a8', 1.7);
    line(ctx, [[12, -39], [17, -31], [20, -25]], '#d3f5f17a', 1);
    ctx.save();
    ctx.translate(0, state.active ? Math.sin(state.time * 4) * 2.5 - 1 : 0);
    round(ctx, -9, -20, 18, 15, 4, '#fff2cc', '#5aaacf');
    round(ctx, -12, -20, 5, 11, 2.5, '#ffe4b5', '#5aaacf');
    round(ctx, 7, -21, 5, 11, 2.5, '#ffe4b5', '#5aaacf');
    oval(ctx, 0, -25, 9.2, 9, '#fff9e1', '#578fc7');
    round(ctx, -5.5, -30, 11, 8, 2.7, '#344886', '#678bd2');
    line(ctx, [[-3, -28], [2, -28]], '#92f3ff', 1.5);
    light(ctx, 0, -14, state.active ? palette.lime : '#ff9a67', 1.2);
    ctx.restore();
    block(ctx, -36, -8, 12, 18, 9, ['#ffe0f0', '#ff9ab7', '#d25d9f']);
    block(ctx, 18, -8, 13, 18, 9, ['#ffe0f0', '#ff9ab7', '#d25d9f']);
    led(ctx, 24, -2, state);
    antenna(ctx, 27, -27, 18, state, '#ff9dc4');
  }

  function scrap(ctx, state) {
    foundation(ctx, 58, ['#c9ffe1', '#61d7a9', '#42989a']);
    block(ctx, -24, -19, 43, 27, 14, ['#a1ffe2', '#53d7a0', '#238788']);
    polygon(ctx, [[-21, -20], [-13, -31], [23, -31], [17, -20]], '#2b6870', '#d5ffd5');
    polygon(ctx, [[-23, -21], [-15, -31], [-20, -45], [-28, -33]], '#53cbaa', '#c6ffde');
    polygon(ctx, [[19, -21], [26, -31], [32, -43], [26, -32]], '#52d09f', '#b8f9e0');
    stripes(ctx, -20, -8, 34, 6, '#fed45a');
    bolts(ctx, -17, 12, 1);
    led(ctx, 3, -14, state);
    line(ctx, [[-8, -19], [-5, -22], [-6, -31], [-2, -36]], '#ffae6b', 3.3);
    polygon(ctx, [[1, -21], [4, -27], [9, -26], [11, -22]], '#cf8af5', '#e7b4ff');
  }

  function launch(ctx, state) {
    oval(ctx, 7, 17, 77, 24, '#71445646');
    oval(ctx, 1, 12, 73, 23, '#7344632a');
    cylinder(ctx, 0, 16, 68, 5, 11, ['#fff3b8', '#ffcfa1', '#d77c66', '#ffe8c4'], 22);
    cylinder(ctx, 0, 7, 55, 0, 7, ['#8fddff', '#76bfff', '#4b71ba', '#a6e1fe'], 18);
    oval(ctx, 0, 0, 51, 15.6, '#64a3db', '#f8ffffb3');
    oval(ctx, 0, 0, 39, 11.8, '#4a83bb', '#ffe26c');
    oval(ctx, 0, 0, 34, 10, '#41669d', '#94cee4');
    line(ctx, [[-18, 0], [18, 0]], '#d7cdc287', 0.85);
    line(ctx, [[0, -7], [0, 7]], '#d7cdc287', 0.85);
    [[-59, 7], [-48, 13], [0, 21], [48, 13], [59, 7]].forEach(([x, y]) => {
      round(ctx, x - 1.5, y, 3.5, 5, 1, '#476271');
      oval(ctx, x, y, 2.2, 1.4, '#fff0bd');
    });
    block(ctx, -55, -6, 14, 9, 7, ['#d4f9ff', '#75cbf1', '#597bc9']);
    block(ctx, 43, -4, 15, 8, 7, ['#ffe79f', '#ffc35c', '#bd7170']);
    stripes(ctx, 44, -2, 12, 3);
    light(ctx, -48, -1, state.liftoff > 0 ? '#f67759' : palette.cyan, 1.5);
    const tower = '#548fc7';
    line(ctx, [[34, -9], [34, -81], [45, -87], [45, -14]], '#4266af', 4.7);
    line(ctx, [[34, -10], [34, -81], [45, -87], [45, -15]], '#92e3ff', 2.6);
    for (let y = -28; y >= -74; y -= 13) {
      line(ctx, [[34, y + 7], [45, y], [34, y - 7]], tower, 1.8);
      line(ctx, [[34, y], [45, y - 5]], '#bbebff', 1.2);
    }
    line(ctx, [[45, -86], [45, -107]], '#395a73', 2.7);
    line(ctx, [[44, -93], [47, -93]], '#abc9ca', 3.2);
    const beacon = state.liftoff > 0 && Math.sin(state.time * 14) > 0;
    light(ctx, 45, -107, beacon ? '#fff083' : '#ff9366', 3.1);
    block(ctx, 29, -44, 16, 8, 7, ['#fff2ad', '#ffd86b', '#c77b56']);
    if (state.liftoff === 0) {
      shape(ctx, null, p => {
        p.moveTo(34, -43);
        p.bezierCurveTo(25, -43, 27, -69, 13, -65);
      }, '#16465b', 2.5);
      oval(ctx, 13, -65, 3, 2.1, '#7c8290');
      oval(ctx, 3, 1, 30, 9, '#1427389e');
    }
    ctx.save();
    ctx.translate(0, -state.liftoff);
    rocket(ctx, state);
    ctx.restore();
  }

  function rocket(ctx, state) {
    if (state.liftoff > 0) {
      const length = 15 + 4 * Math.sin(state.time * 27);
      shape(ctx, gradient(ctx, 0, 0, 0, length, [[0, '#fffbd5'], [0.31, '#ffc76e'], [1, '#f26a5580']]), p => {
        p.moveTo(-10, -3);
        p.quadraticCurveTo(-8, length * 0.72, 0, length);
        p.quadraticCurveTo(8, length * 0.9, 10, -3);
        p.closePath();
      });
    }
    const redFin = gradient(ctx, -28, -41, -7, -8, [[0, '#ffad6c'], [0.47, '#ff674b'], [1, '#c73d64']]);
    const rightFin = gradient(ctx, 9, -39, 35, 0, [[0, '#f0615b'], [1, '#c9486e']]);
    shape(ctx, rightFin, p => {
      p.moveTo(10, -43);
      p.quadraticCurveTo(24, -31, 29, -6);
      p.lineTo(22, -8);
      p.lineTo(11, -20);
      p.closePath();
    }, '#713849', 1.1);
    shape(ctx, redFin, p => {
      p.moveTo(-12, -48);
      p.quadraticCurveTo(-28, -32, -31, -6);
      p.lineTo(-23, -7);
      p.lineTo(-10, -20);
      p.closePath();
    }, '#883747', 1.1);
    line(ctx, [[-25, -19], [-18, -32], [-12, -36]], '#ffba8c', 1.6);
    const shell = gradient(ctx, -20, -77, 21, -74, [
      [0, '#b9d7ec'], [0.16, '#e9f6f9'], [0.38, '#fffeee'], [0.68, '#f6f2ec'], [1, '#a3c2e4'],
    ]);
    cylinder(ctx, 0, -1, 11, -10, 9, ['#aec0c2', '#96a5ae', '#2a495e', '#8294a1']);
    shape(ctx, shell, p => {
      p.moveTo(0, -137);
      p.bezierCurveTo(-8, -136, -20, -104, -21, -75);
      p.bezierCurveTo(-22, -51, -17, -23, -12, -11);
      p.quadraticCurveTo(0, -4, 12, -11);
      p.bezierCurveTo(17, -23, 22, -51, 21, -75);
      p.bezierCurveTo(20, -104, 8, -136, 0, -137);
      p.closePath();
    }, '#476c79', 1.3);
    const cap = gradient(ctx, -18, -130, 17, -105, [[0, '#ffb471'], [0.42, '#ff724d'], [1, '#cc385c']]);
    shape(ctx, cap, p => {
      p.moveTo(0, -137);
      p.bezierCurveTo(-5.5, -137, -13.5, -118, -17, -104);
      p.quadraticCurveTo(0, -99, 17, -104);
      p.bezierCurveTo(13.5, -118, 5.5, -137, 0, -137);
      p.closePath();
    }, '#d95957', 0.8);
    shape(ctx, null, p => {
      p.moveTo(-5, -128);
      p.quadraticCurveTo(-11, -118, -14, -108);
    }, '#ffbc99', 1.7);
    shape(ctx, null, p => {
      p.moveTo(-18, -99);
      p.quadraticCurveTo(0, -94, 18, -99);
    }, '#fff6e6');
    oval(ctx, -1, -80, 13.8, 14.9, '#8cb9d8', '#f6ffff');
    oval(ctx, -1, -80, 11.5, 12.2, '#284e85', '#3e6fac');
    const visor = gradient(ctx, -10, -91, 8, -70, [[0, '#78d2fb'], [0.55, '#438dce'], [1, '#304f9e']]);
    oval(ctx, -1, -80.5, 9.5, 10, visor);
    shape(ctx, null, p => {
      p.moveTo(-7.8, -83);
      p.quadraticCurveTo(-4.6, -88.2, 1.8, -88.8);
    }, '#b1ebf3', 2.3);
    oval(ctx, 5.5, -75, 1.3, 1.3, '#a0ebff');
    boltedBand(ctx);
    line(ctx, [[-15, -66], [-14, -48], [-11, -31]], '#fdf9e9', 1.4);
    oval(ctx, -1, -52, 7.6, 7.6, '#fff4bb', '#93aace');
    polygon(ctx, [[-1, -58], [0.4, -54], [4.5, -51.9], [0.6, -50.7], [-1, -46.5],
      [-2.7, -50.8], [-6, -52], [-2.7, -54]], '#fb874d');
    round(ctx, -3.5, -37, 7, 21, 3, '#e4535d', '#9c4968');
    round(ctx, -2.7, -37, 2.6, 18, 1.3, '#ff966d');
  }

  function boltedBand(ctx) {
    shape(ctx, null, p => {
      p.moveTo(-16, -26);
      p.quadraticCurveTo(0, -17, 16, -26);
    }, '#8395a2', 1.05);
    shape(ctx, null, p => {
      p.moveTo(-15, -23);
      p.quadraticCurveTo(0, -14, 15, -23);
    }, '#f9f4e1', 1.2);
    oval(ctx, -8, -22, 1.1, 1.3, '#5b6e7d');
    oval(ctx, 7, -22, 1.1, 1.3, '#5b6e7d');
  }

  function gate(ctx, w) {
    const x = w / 2 - 9;
    [-x, x].forEach(pole => {
      oval(ctx, pole, 15, 6.5, 2.9, '#553b654f');
      line(ctx, [[pole, 14], [pole, -1]], '#b65b63', 5.5);
      line(ctx, [[pole - 0.7, 6], [pole - 0.7, 0]], '#ffd169', 2.6);
      light(ctx, pole, -2, '#ffb648', 2.4);
    });
    shape(ctx, null, p => {
      p.moveTo(-x, 5);
      p.quadraticCurveTo(0, 18, x, 5);
    }, '#d48060', 3.2);
    shape(ctx, null, p => {
      p.moveTo(-x, 4);
      p.quadraticCurveTo(0, 17, x, 4);
    }, '#ffe589', 1.5);
    round(ctx, -8, 0, 16, 14, 4, '#fff0b1', '#bc755e');
    shape(ctx, null, p => {
      p.moveTo(-2.8, 6);
      p.lineTo(-2.8, 4.6);
      p.quadraticCurveTo(0, 0.8, 2.8, 4.6);
      p.lineTo(2.8, 6);
    }, '#a75959', 1.5);
    round(ctx, -4, 5.5, 8, 5.1, 1.3, '#a75959');
  }

  const machines = { ground, grant, fuel, engineering, research, academy, scrap, launch };
  const aliases = {
    groundStation: 'ground', data: 'ground', grantOffice: 'grant', fuelPlant: 'fuel', parts: 'engineering',
    lab: 'research', researchLab: 'research', crew: 'academy', scrapBin: 'scrap', pad: 'launch', launchPad: 'launch',
  };

  function draw(ctx, id, x, y, scale = 1, options = {}) {
    const machineId = aliases[id] || id;
    const machine = machines[machineId];
    if (!machine) return;
    const { active = false, locked = false, time = 0, liftoff = 0 } = options;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const opacity = ctx.globalAlpha;
    if (locked) ctx.globalAlpha = opacity * 0.39;
    machine(ctx, { active: active && !locked, time, liftoff });
    if (locked) {
      ctx.globalAlpha = opacity;
      gate(ctx, machineId === 'scrap' ? 58 : 76);
    }
    ctx.restore();
  }

  window.SpaceportMachines = Object.freeze({ draw });
})();
