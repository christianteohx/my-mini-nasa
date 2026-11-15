(() => {
  'use strict';

  const WIDTH = 1190;
  const HEIGHT = 800;
  const FLOOR = { width: 728, height: 392 };
  const PROJECTION = { x: 202, y: 167, width: 1.22, depth: 1.30, slant: 0.335, tilt: 0.058 };
  const SCENERY_RATIO = 1.25;
  const MOBILE_BREAKPOINT = 760;
  const PAINT_INTERVAL = 1 / 30;
  const PIXEL_RATIO_LIMIT = 1.5;
  const PICKUP_INTERVAL = 0.45;
  const SCRAP_HOLD = 0.85;
  const PAD_SETTLE = 0.35;
  const TRANSFER_TIME = 0.45;
  const TRANSFER_STAGGER = 0.07;
  const EARTH = { x: 874, y: 102, padding: 120 };
  const SCENE_THEMES = {
    Earth: { sky: ['#78cef8', '#bdf3ef', '#a4dff4'], soil: ['#cfe97f', '#b6e875', '#a8df71'], edge: '#eaf8ab', wall: ['#8cb97e', '#64a28a', '#5b9b79'], crater: ['#8ac56e', '#a6d668', '#dbef8d', '#79b772', '#95ce76'] },
    Moon: { sky: ['#535882', '#858ebd', '#6b80a5'], soil: ['#e1deed', '#bdbed9', '#b4bad9'], edge: '#eeebf8', wall: ['#8790bc', '#7b83ad', '#5d648f'], crater: ['#babbd7', '#cdd1e8', '#ebedfa', '#999bc2', '#acb0d0'] },
    Mars: { sky: ['#c87565', '#f6b99b', '#dea8ba'], soil: ['#ffc187', '#eeb173', '#ed9c74'], edge: '#ffdfaa', wall: ['#b97467', '#a66664', '#8c5256'], crater: ['#d4926b', '#f1af7e', '#ffca9b', '#b67966', '#d3946d'] },
    Sun: { sky: ['#4c3f7c', '#de9070', '#6061a6'], soil: ['#ebd8a2', '#d2b987', '#b8a5a1'], edge: '#fff0ac', wall: ['#947c87', '#897590', '#77607e'], crater: ['#bda48e', '#dfc58f', '#fff0b0', '#948192', '#b09e97'] },
  };
  const START = { u: 94, v: 332 };
  const COLORS = {
    data: ['#c6fff3', '#26e4cc', '#0b9c97'],
    cash: ['#f5ffb0', '#9ee747', '#5d9d36'],
    fuel: ['#fff090', '#ff9644', '#b64e25'],
    part: ['#e1f4ff', '#58a9ff', '#4b63ad'],
    paper: ['#f8d9ff', '#ba7aff', '#7746b5'],
    crew: ['#ffe3d6', '#ff8ca9', '#ba4d79'],
    crate: ['#fff2b4', '#ffbd62', '#a46439'],
    primePart: ['#fff6c2', '#ffcc33', '#b57a12'],
    prizePaper: ['#fff6c2', '#ffd23f', '#b57a12'],
    eliteCrew: ['#fff6c2', '#ffcc33', '#b57a12'],
  };
  const SPECIAL_SHAPE = { primePart: 'part', prizePaper: 'paper', eliteCrew: 'crew' };

  function specialStar(ctx, x, y, r) {
    const points = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 ? r * 0.45 : r;
      points.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
    }
    polygon(ctx, points, '#ffe14d', '#2b2350', 1.2);
  }
  const STATIONS = {
    launch: { u: 332, v: 61, label: 'Launch Pad', tint: '#f67b68', input: [0, 40] },
    scrap: { u: 630, v: 57, label: 'Scrap Bin', tint: '#64dfaf', input: [0, 32] },
    fuel: { u: 114, v: 180, label: 'Fuel Plant', tint: '#ffa34a', both: [0, 39], item: 'fuel' },
    engineering: { u: 282, v: 180, label: 'Engineering', tint: '#78afff', both: [0, 39], item: 'part' },
    research: { u: 455, v: 180, label: 'Research Lab', tint: '#c383f9', both: [0, 39], item: 'paper' },
    academy: { u: 626, v: 180, label: 'Academy', tint: '#fc91ad', both: [0, 39], item: 'crew' },
    ground: { u: 224, v: 327, label: 'Ground Station', tint: '#43e1ce', output: [8, 39], item: 'data' },
    grant: { u: 400, v: 314, label: 'Grant Office', tint: '#a9e958', both: [0, 39], item: 'cash' },
    cargo: { u: 650, v: 310, label: 'Cargo Shelf', tint: '#ffc583', output: [1, 35] },
    returns: { u: 470, v: 51, label: 'Return Supplies', tint: '#85e586', input: [0, 26] },
  };
  const UPGRADE_PADS = [
    { id: 'carry', zone: 'upgrade', label: 'Bigger bag', u: 102, v: 302, tint: '#ffd958' },
    { id: 'intern', zone: 'upgrade', label: 'Hire intern', u: 530, v: 329, tint: '#aeed6f' },
  ];
  const EXPANSION_PAD = { id: 'expansion', zone: 'expansion', u: 158, v: 86 };
  const HOLD_ZONES = ['upgrade', 'expansion'];
  const STATION_HEIGHTS = { launch: 146, ground: 101, scrap: 64, cargo: 69, returns: 65 };
  const HUD_SELECTOR = '.masthead .brand, .header-actions, .telemetry, .order-card, #directory-toggle, .directive, .yard-bar, #mission-control, #notice, #yard-launch, #yard-cargo';

  function point(u, v) {
    const { x, y, width, depth, slant, tilt } = PROJECTION;
    return { x: x + u * width - v * slant, y: y + u * tilt + v * depth };
  }

  function unproject(dx, dy) {
    const { width, depth, slant, tilt } = PROJECTION;
    const v = (dy - dx * tilt / width) / (depth + slant * tilt / width);
    return { u: (dx + v * slant) / width, v };
  }

  function local(x, y) {
    return unproject(x - PROJECTION.x, y - PROJECTION.y);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distance(a, b) {
    return Math.hypot(a.u - b.u, a.v - b.v);
  }

  function makeRandom(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function polygon(ctx, points, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function plane(ctx, corners, fill, stroke, width) {
    polygon(ctx, corners.map(([u, v]) => {
      const { x, y } = point(u, v);
      return [x, y];
    }), fill, stroke, width);
  }

  function round(ctx, x, y, w, h, r, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
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

  function oval(ctx, x, y, rx, ry, fill, stroke, width = 1, angle = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
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

  function line(ctx, ax, ay, bx, by, stroke, width = 1) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function planeLine(ctx, u1, v1, u2, v2, stroke, width) {
    const a = point(u1, v1);
    const b = point(u2, v2);
    line(ctx, a.x, a.y, b.x, b.y, stroke, width);
  }

  function type(ctx, content, x, y, size, fill, weight = 600, align = 'left', mono = false) {
    ctx.font = `${weight} ${size}px ${mono ? '"IBM Plex Mono", "Courier New", monospace' : '"Space Grotesk", "Trebuchet MS", system-ui, sans-serif'}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fill;
    ctx.fillText(content, x, y);
  }

  function drawItem(ctx, x, y, item, scale = 1) {
    const [light, main, dark] = COLORS[item] || COLORS.data;
    const name = SPECIAL_SHAPE[item] || item;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (name === 'fuel') {
      round(ctx, -7, -12, 14, 14, 4, main, dark, 1.3);
      oval(ctx, 0, -11, 6.4, 2.7, light, dark);
      round(ctx, -3, -16, 6, 3.5, 0.7, light, dark);
      line(ctx, -5, -5, 5, -5, light, 1.3);
    } else if (name === 'paper' || name === 'cash') {
      polygon(ctx, [[-9, -4], [4, -8], [10, -5], [10, 0], [-3, 4], [-9, 1]], dark, '#446763');
      polygon(ctx, [[-9, -4], [4, -8], [10, -5], [-3, -1]], light, main);
      line(ctx, -3.5, -5, 3.5, -7, dark);
      line(ctx, -1.5, -3.5, 5, -5.5, dark);
    } else if (name === 'crew') {
      round(ctx, -5, -2, 10, 6, 2.5, main, dark);
      oval(ctx, 0, -6, 7, 6.5, light, dark, 1.2);
      oval(ctx, 1.5, -6, 4.8, 3.5, '#674d75');
      oval(ctx, 3.1, -7.5, 1.8, 0.8, light);
    } else {
      polygon(ctx, [[-8, -9], [0, -5], [0, 4], [-8, 0]], dark, '#3a6470');
      polygon(ctx, [[0, -5], [8, -9], [8, 0], [0, 4]], main, '#3a6470');
      polygon(ctx, [[-8, -9], [0, -13], [8, -9], [0, -5]], light, '#3a6470');
      if (name === 'crate') {
        line(ctx, -4, -11, 4, -7, '#ac7145', 1.3);
        line(ctx, -4, -1.5, -2, -0.5, light, 1.6);
      } else if (name === 'part') {
        polygon(ctx, [[-4, -9], [0, -11], [4, -9], [0, -7]], dark);
        oval(ctx, 0, -9, 1.7, 0.9, light);
      } else {
        line(ctx, 3.2, -4.4, 5.8, -5.8, light, 1.3);
      }
    }
    if (SPECIAL_SHAPE[item]) specialStar(ctx, 7, -11, 4.6);
    ctx.restore();
  }

  function earth(ctx) {
    const { x, y } = EARTH;
    const r = 67;
    const glow = ctx.createRadialGradient(x, y, 40, x, y, 114);
    glow.addColorStop(0, 'rgba(229, 255, 247, .8)');
    glow.addColorStop(0.58, 'rgba(206, 253, 247, .48)');
    glow.addColorStop(1, 'rgba(215, 246, 254, 0)');
    oval(ctx, x, y, 114, 114, glow);
    oval(ctx, x, y, 97, 38, null, '#fff0be', 1.4, -0.39);
    oval(ctx, x, y, 109, 45, null, '#c3f5fd', 1.2, -0.39);
    ctx.save();
    ctx.translate(x, y);
    const ocean = ctx.createRadialGradient(-22, -26, 5, 0, 0, 78);
    ocean.addColorStop(0, '#76ebf7');
    ocean.addColorStop(0.44, '#38bde3');
    ocean.addColorStop(0.8, '#267fbf');
    ocean.addColorStop(1, '#3562af');
    oval(ctx, 0, 0, r, r, ocean, '#ecfff3', 2.4);
    ctx.clip();
    const land = [
      [[-48, -48], [-31, -62], [-17, -59], [-12, -51], [0, -48], [-1, -35], [-10, -28], [-27, -26], [-28, -17], [-35, -15], [-41, -27], [-60, -29]],
      [[-24, -22], [-14, -23], [-13, -15], [-3, -11], [4, -1], [13, 4], [5, 16], [-7, 19], [-11, 35], [-21, 47], [-27, 29], [-25, 13], [-31, 2], [-31, -12]],
      [[16, -57], [28, -61], [48, -51], [44, -40], [33, -38], [24, -43], [18, -37], [9, -42]],
      [[24, -33], [37, -40], [56, -38], [65, -20], [66, -4], [54, -8], [43, -5], [38, 10], [33, 23], [23, 23], [20, 10], [12, 0], [11, -17]],
      [[43, 26], [52, 21], [65, 25], [62, 39], [50, 44], [41, 36]],
    ];
    land.forEach(shape => polygon(ctx, shape, '#afe775', '#86d86e', 1));
    ctx.globalAlpha = 0.5;
    line(ctx, -57, -39, -12, -48, '#d0e9db', 3);
    line(ctx, -37, 13, -8, 7, '#b1ddd4', 1.2);
    line(ctx, 17, -22, 56, -30, '#c5ece1', 2.4);
    line(ctx, -17, 52, 44, 41, '#9cd2cd', 2.2);
    ctx.globalAlpha = 1;
    const shade = ctx.createLinearGradient(-24, -40, 52, 49);
    shade.addColorStop(0, 'rgba(248, 255, 221, 0)');
    shade.addColorStop(0.65, 'rgba(38, 93, 193, .01)');
    shade.addColorStop(1, 'rgba(31, 74, 175, .52)');
    oval(ctx, 0, 0, r, r, shade);
    ctx.restore();
    oval(ctx, 969, 72, 3.1, 3.1, '#fffcea');
    oval(ctx, 969, 72, 7, 7, 'rgba(248,255,214,.38)');
    oval(ctx, 779, 134, 1.9, 1.9, '#fff3c6');
  }

  function drawFleet(ctx, satelliteCount, time) {
    const tilt = -0.39;
    const visible = Math.min(8, satelliteCount);
    for (let i = 0; i < visible; i += 1) {
      const angle = (time * (0.21 + i * 0.013) + i * 2.39) % (Math.PI * 2);
      const u = 97 * Math.cos(angle);
      const v = 38 * Math.sin(angle);
      const x = EARTH.x + u * Math.cos(tilt) - v * Math.sin(tilt);
      const y = EARTH.y + u * Math.sin(tilt) + v * Math.cos(tilt);
      if (v < 0 && Math.hypot(x - EARTH.x, y - EARTH.y) < 67) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.5);
      round(ctx, -13, -3.2, 8.5, 6.4, 1.4, '#4e90b5', '#a8ded8');
      round(ctx, 4.5, -3.2, 8.5, 6.4, 1.4, '#4e90b5', '#a8ded8');
      line(ctx, -10, 0, 10, 0, '#c2e4c6', 1);
      round(ctx, -4.5, -5, 9, 10, 2, '#fcf0bd', '#4d888d', 1);
      oval(ctx, 0.5, -1, 1.6, 1.6, '#ed875f');
      ctx.restore();
    }
  }

  function drawDestination(ctx, destination) {
    const moon = destination === 'Moon';
    const solar = destination === 'Sun';
    const light = solar ? '#fff2a5' : moon ? '#fff4df' : '#ffd8a8';
    const middle = solar ? '#ffae48' : moon ? '#d5c4ce' : '#e98e65';
    const shadow = solar ? '#ee6538' : moon ? '#807596' : '#a35058';
    const halo = ctx.createRadialGradient(0, 0, 37, 0, 0, 118);
    halo.addColorStop(0, solar ? '#fff5b7' : '#ecd3debd');
    halo.addColorStop(0.6, solar ? '#ff9b537f' : '#f7e1cd49');
    halo.addColorStop(1, '#ffeab900');
    oval(ctx, 0, 0, 116, 116, halo);
    oval(ctx, 0, 0, 97, 38, null, '#fff0be9e', 1.4, -0.39);
    if (solar) {
      for (let i = 0; i < 13; i += 1) {
        const angle = i * Math.PI * 2 / 13;
        ctx.save();
        ctx.rotate(angle);
        polygon(ctx, [[55, -10], [87 + i % 4 * 4, -4], [64, 14]], i % 2 === 0 ? '#ffd66abf' : '#ff9b5379');
        ctx.restore();
      }
    }
    const disk = ctx.createRadialGradient(-23, -24, 3, 0, 0, 79);
    disk.addColorStop(0, light);
    disk.addColorStop(0.61, middle);
    disk.addColorStop(1, shadow);
    oval(ctx, 0, 0, 67, 67, disk, light, 2.3);
    ctx.save();
    ctx.clip();
    if (moon) {
      for (const [x, y, radius] of [[-29, -33, 14], [21, -24, 11], [12, 9, 18], [-31, 23, 9], [42, 18, 8], [10, 39, 11], [-12, -3, 6]]) {
        oval(ctx, x, y, radius, radius * 0.74, '#9686a05e', '#f5e7d1a1', 2, -0.3);
        oval(ctx, x + 2, y + 2, radius * 0.74, radius * 0.5, '#866e9869', null, 1, -0.3);
      }
    } else if (solar) {
      for (const [x, y, radius] of [[-57, -20, 24], [-11, -14, 35], [39, -37, 26], [38, 19, 32], [-34, 30, 41], [9, 49, 23]]) {
        oval(ctx, x, y, radius, radius * 0.35, '#fff99728', '#ffe8996e', 3, -0.28);
        oval(ctx, x + 4, y + 3, radius * 0.76, radius * 0.22, '#fac64a26', '#ff8d374a', 1.8, -0.28);
      }
    } else {
      polygon(ctx, [[-60, -8], [-38, -31], [-21, -16], [4, -20], [26, -7], [55, -22], [69, -4], [52, 14], [36, 13], [18, 27], [-4, 10], [-41, 16]], '#b65b5e86');
      polygon(ctx, [[-46, -37], [-31, -58], [-11, -68], [12, -66], [28, -53], [18, -49], [0, -56], [-15, -50], [-29, -49]], '#fff0cdad');
      line(ctx, -44, 31, 27, 23, '#ffca887d', 4);
      line(ctx, -30, -6, 24, -19, '#ffd19069', 3);
    }
    ctx.restore();
  }

  function makeCelestial(destination) {
    const scene = document.createElement('canvas');
    const extent = EARTH.padding * 2;
    scene.width = extent * PIXEL_RATIO_LIMIT;
    scene.height = extent * PIXEL_RATIO_LIMIT;
    const context = scene.getContext('2d');
    context.scale(PIXEL_RATIO_LIMIT, PIXEL_RATIO_LIMIT);
    if (destination === 'Earth') {
      context.translate(EARTH.padding - EARTH.x, EARTH.padding - EARTH.y);
      earth(context);
    } else {
      context.translate(EARTH.padding, EARTH.padding);
      drawDestination(context, destination);
    }
    return scene;
  }

  function crater(ctx, u, v, radius, theme) {
    const { x, y } = point(u, v);
    const [rim, inner, glint, pit, floor] = theme.crater;
    oval(ctx, x + 1, y + 3, radius, radius * 0.31, rim);
    oval(ctx, x, y - 1, radius * 0.94, radius * 0.3, inner, glint, 1.3);
    oval(ctx, x - 1, y + 1, radius * 0.75, radius * 0.2, pit);
    oval(ctx, x + 3, y + 2, radius * 0.58, radius * 0.14, floor);
  }

  function rocks(ctx, u, v, scale) {
    const { x, y } = point(u, v);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    oval(ctx, 6, 2, 25, 6, 'rgba(51,79,83,.20)');
    polygon(ctx, [[-12, 3], [-20, -5], [-14, -15], [-6, -17], [0, -10], [2, 3]], '#a3b2ab', '#829e9a');
    polygon(ctx, [[-20, -5], [-14, -15], [-6, -17], [0, -10], [-9, -8]], '#d9dfcf');
    polygon(ctx, [[-12, 3], [0, -10], [2, 3]], '#829e9a');
    polygon(ctx, [[5, 6], [2, -2], [10, -11], [19, -6], [23, 2], [16, 7]], '#acb7aa', '#819d96');
    polygon(ctx, [[2, -2], [10, -11], [19, -6], [12, 0]], '#d9dfcf');
    ctx.restore();
  }

  function barrier(ctx, u, v, span, color = '#ce8353') {
    const a = point(u, v);
    const b = point(u + span, v);
    line(ctx, a.x + 6, a.y + 2, b.x + 7, b.y + 2, 'rgba(40,59,67,.14)', 3);
    line(ctx, a.x, a.y - 11, b.x, b.y - 11, color, 3.5);
    line(ctx, a.x, a.y - 14, b.x, b.y - 14, '#fff1ad', 2.2);
    for (let i = 0; i <= span; i += 23) {
      const p = point(u + i, v);
      line(ctx, p.x, p.y, p.x, p.y - 15, color, 3);
      line(ctx, p.x - 1, p.y - 15, p.x + 1, p.y - 15, '#fcfeeb', 1.5);
    }
  }

  function cloud(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    oval(ctx, 0, 10, 66, 15, 'rgba(245,255,252,.57)');
    oval(ctx, -19, 0, 35, 17, 'rgba(246,255,251,.67)');
    oval(ctx, 16, 3, 38, 20, 'rgba(245,255,252,.65)');
    ctx.restore();
  }

  function drawSky(ctx, width, height, destination) {
    const sky = ctx.createLinearGradient(width * 0.12, 0, width * 0.8, height);
    const [top, middle, bottom] = SCENE_THEMES[destination].sky;
    sky.addColorStop(0, top);
    sky.addColorStop(0.48, middle);
    sky.addColorStop(1, bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const scale = clamp(width / 1020, 0.52, 1.65);
    const clouds = [[0.08, 0.25, 1.22], [0.28, 0.14, 0.82], [0.66, 0.075, 1], [0.97, 0.42, 1.1], [0.9, 0.81, 1.56], [0.07, 0.92, 1.6]];
    if (destination === 'Earth' || destination === 'Mars') {
      ctx.save();
      ctx.globalAlpha = destination === 'Mars' ? 0.45 : 1;
      for (const [x, y, size] of clouds) cloud(ctx, width * x, height * y, size * scale);
      ctx.restore();
    } else {
      const random = makeRandom(41831);
      for (let i = 0; i < 100; i += 1) {
        const x = random() * width;
        const y = random() * height;
        const radius = random();
        oval(ctx, x, y, radius + 0.3, radius + 0.3, '#f8f5d7ac');
      }
    }
    for (const [x, y] of [[0.16, 0.19], [0.4, 0.16], [0.74, 0.28], [0.04, 0.56], [0.98, 0.64], [0.17, 0.86]]) {
      const sx = width * x;
      const sy = height * y;
      line(ctx, sx - 3, sy, sx + 3, sy, '#f4ffff', 1.4);
      line(ctx, sx, sy - 3, sx, sy + 3, '#f4ffff', 1.4);
    }
  }

  function shrub(ctx, u, v, scale) {
    const { x, y } = point(u, v);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    oval(ctx, 4, 3, 20, 8, 'rgba(58,112,52,.21)');
    oval(ctx, -9, -3, 9, 8, '#51b66c', '#36876d');
    oval(ctx, 6, -4, 9, 10, '#62c65d', '#428b67');
    oval(ctx, -1, -11, 12, 12, '#96e26c', '#458e67', 1.4);
    oval(ctx, -4, -15, 5, 3.5, '#c5ee7a');
    for (const [a, b] of [[-9, -6], [3, -11], [10, -6]]) oval(ctx, a, b, 1.8, 1.8, '#fff49d');
    ctx.restore();
  }

  function makeScenery(destination) {
    const scene = document.createElement('canvas');
    scene.width = Math.round(WIDTH * SCENERY_RATIO);
    scene.height = Math.round(HEIGHT * SCENERY_RATIO);
    const ctx = scene.getContext('2d');
    ctx.scale(scene.width / WIDTH, scene.height / HEIGHT);
    const random = makeRandom(66224);
    const theme = SCENE_THEMES[destination];
    const ambientCenter = point(FLOOR.width / 2, FLOOR.height * 0.89);
    const ambient = ctx.createRadialGradient(ambientCenter.x, ambientCenter.y, 45, ambientCenter.x, ambientCenter.y, 570);
    ambient.addColorStop(0, 'rgba(45,102,105,.43)');
    ambient.addColorStop(0.68, 'rgba(73,132,138,.2)');
    ambient.addColorStop(1, 'rgba(73,132,138,0)');
    oval(ctx, ambientCenter.x, ambientCenter.y, 568, 158, ambient);

    const perimeter = [[18, 0], [704, 0], [728, 25], [728, 367], [704, 392], [18, 392], [0, 370], [0, 22]];
    const top = perimeter.map(([u, v]) => point(u, v));
    const bottom = top.map((p, i) => [p.x + (i > 3 ? 7 : 4), p.y + (i > 3 ? 35 : 19)]);
    polygon(ctx, bottom.map(([x, y]) => [x + 8, y + 10]), 'rgba(63,116,115,.24)');
    for (let i = 0; i < top.length; i += 1) {
      const a = top[i];
      const b = top[(i + 1) % top.length];
      const aa = bottom[i];
      const bb = bottom[(i + 1) % top.length];
      if (i >= 2 && i <= 6) polygon(ctx, [[a.x, a.y], [b.x, b.y], bb, aa], theme.wall[i === 4 ? 0 : 1], theme.wall[2], 1.5);
    }
    const soil = ctx.createLinearGradient(0, PROJECTION.y, 0, HEIGHT - 40);
    soil.addColorStop(0, theme.soil[0]);
    soil.addColorStop(0.47, theme.soil[1]);
    soil.addColorStop(1, theme.soil[2]);
    plane(ctx, perimeter, soil, theme.edge, 2.5);
    ctx.save();
    ctx.beginPath();
    for (const [i, p] of top.entries()) {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.clip();
    for (let i = 0; i < 410; i += 1) {
      const p = point(random() * 732, random() * 396);
      const alpha = 0.05 + random() * 0.16;
      oval(ctx, p.x, p.y, 0.3 + random() * 1.25, 0.3 + random() * 0.55, `rgba(80,147,79,${alpha})`);
    }

    plane(ctx, [[136, 15], [692, 15], [706, 31], [706, 115], [136, 115]], '#ffc69b', '#e6a27e', 2.2);
    plane(ctx, [[144, 22], [688, 22], [698, 34], [698, 108], [144, 108]], '#ffdab8', '#ffecc4', 2);
    plane(ctx, [[24, 126], [704, 126], [704, 243], [24, 243]], '#ffce79', '#e6ab5d', 2);
    plane(ctx, [[42, 267], [568, 267], [568, 382], [42, 382]], '#90d6b8', '#6bb78c', 1.9);
    plane(ctx, [[48, 274], [560, 274], [560, 374], [48, 374]], '#ade6c9', '#e1f8cc');
    for (let u = 67; u < 553; u += 36) planeLine(ctx, u, 275, u, 372, 'rgba(83,171,133,.29)');
    for (let v = 289; v < 375; v += 21) planeLine(ctx, 51, v, 555, v, 'rgba(83,171,133,.29)');
    for (const station of Object.values(STATIONS).slice(2, 6)) {
      const { u } = station;
      plane(ctx, [[u - 69, 138], [u + 69, 138], [u + 69, 236], [u - 69, 236]], '#ffe1a1', '#fff4c9', 1.5);
      plane(ctx, [[u - 57, 144], [u + 57, 144], [u + 57, 224], [u - 57, 224]], '#ffda95', '#edbf79');
      for (const [offsetU, offsetV] of [[-62, 145], [62, 145], [-62, 231], [62, 231]]) {
        const p = point(u + offsetU, offsetV);
        oval(ctx, p.x, p.y, 2.2, 1.4, '#d8a46c');
      }
    }
    for (const v of [118, 248, 385]) {
      planeLine(ctx, 25, v, 703, v, 'rgba(83,155,86,.49)', 1.1);
      ctx.setLineDash([12, 10]);
      planeLine(ctx, 30, v + 3, 690, v + 3, 'rgba(255,251,213,.91)', 2.2);
      ctx.setLineDash([]);
    }
    plane(ctx, [[315, 116], [347, 116], [347, 139], [315, 139]], '#e3cc8f');
    for (let i = 0; i < 4; i += 1) planeLine(ctx, 319, 120 + i * 4, 341, 120 + i * 4, '#fff3b9', 2.2);
    for (let i = 0; i < 4; i += 1) planeLine(ctx, 319, 243 + i * 4, 343, 243 + i * 4, '#fff3b9', 2.2);
    barrier(ctx, 147, 25, 131);
    barrier(ctx, 531, 26, 150);
    barrier(ctx, 586, 272, 112);
    barrier(ctx, 31, 373, 138);
    barrier(ctx, 485, 374, 92);
    barrier(ctx, 607, 374, 78);

    crater(ctx, 77, 82, 33, theme);
    crater(ctx, 46, 56, 15, theme);
    crater(ctx, 586, 315, 16, theme);
    crater(ctx, 240, 367, 21, theme);
    rocks(ctx, 100, 64, 0.8);
    rocks(ctx, 59, 101, 0.53);
    rocks(ctx, 702, 333, 0.66);
    rocks(ctx, 402, 370, 0.58);
    rocks(ctx, 673, 271, 0.42);
    const decoration = destination === 'Earth' ? shrub : rocks;
    for (const [u, v, scale] of [[22, 28, 0.96], [133, 34, 0.86], [105, 113, 0.74], [697, 256, 0.94], [50, 363, 0.71], [174, 370, 0.77], [562, 373, 0.87], [715, 348, 0.74]]) decoration(ctx, u, v, scale);
    for (const [u, v] of [[18, 136], [18, 233], [710, 249], [45, 262], [558, 352], [707, 365], [17, 363]]) {
      const p = point(u, v);
      round(ctx, p.x - 3, p.y - 5, 7, 5, 1, '#648b75');
      oval(ctx, p.x + 0.5, p.y - 5, 2.3, 1.5, '#fff5a2');
    }
    ctx.restore();

    const wallA = point(18, 392);
    const wallB = point(704, 392);
    line(ctx, wallA.x + 7, wallA.y + 21, wallB.x + 5, wallB.y + 21, '#a1ca8c', 1.2);
    for (let u = 34; u < 694; u += 83) {
      const p = point(u, 392);
      polygon(ctx, [[p.x, p.y + 11], [p.x + 24, p.y + 12], [p.x + 24, p.y + 18], [p.x, p.y + 17]], '#659f75', '#a3c884');
      for (let i = 0; i < 3; i += 1) line(ctx, p.x + 5 + i * 6, p.y + 13, p.x + 5 + i * 6, p.y + 16, '#aacf9c');
    }
    return scene;
  }

  function padPoints(station, zone) {
    const [u, v] = station[zone] || station.both;
    return { u: station.u + u, v: station.v + v };
  }

  const FACILITY_PADS = Object.entries(STATIONS).flatMap(([id, station]) => ['both', 'input', 'output']
    .filter(zone => station[zone])
    .map(zone => ({ id, zone, ...padPoints(station, zone) })));
  const TARGETS = [...FACILITY_PADS, ...UPGRADE_PADS, EXPANSION_PAD];
  const TARGET_BY_ID = new Map(TARGETS.map(pad => [pad.id, pad]));
  const STATION_ENTRIES = Object.entries(STATIONS).map(([id, station]) => ({ id, station, ...point(station.u, station.v) }));

  function visibleStations(view, state) {
    const { x, y, width, height, scale } = view;
    const left = -x / scale;
    const right = (width - x) / scale;
    const top = -y / scale;
    const bottom = (height - y) / scale;
    return STATION_ENTRIES.filter(station => facilityVisible(station.id, state)
      && station.x + 125 >= left && station.x - 125 <= right
      && station.y + 90 >= top && station.y - 155 <= bottom);
  }

  function badge(ctx, text, x, y, colors, size = 12) {
    const bounds = badgeBounds(text, x, y, size);
    round(ctx, bounds.x, bounds.y + 2, bounds.width, bounds.height, 6, 'rgba(30,55,69,.24)');
    round(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 6, colors[0], colors[1], 1.5);
    type(ctx, text, x, y + 0.4, size, colors[2], 900, 'center', true);
  }

  function badgeBounds(text, x, y, size) {
    const width = 14 + text.length * size * 0.63;
    const height = size + 8;
    return { x: x - width / 2, y: y - height / 2, width, height };
  }

  function contains(bounds, x, y) {
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
  }

  function overlaps(a, b, padding = 0) {
    return a.x + a.width + padding > b.x && b.x + b.width + padding > a.x
      && a.y + a.height + padding > b.y && b.y + b.height + padding > a.y;
  }

  function resourceTag(x, y, direction, entries) {
    const items = entries.map(([id, text]) => ({ id, text, width: 16 + text.length * 6.5 }));
    const width = 20 + items.reduce((sum, item) => sum + item.width, 0);
    return { x: x - width / 2, y: y - 10, width, height: 20, direction, items };
  }

  function drawResourceTag(ctx, tag) {
    const { x, y, width, height, direction, items } = tag;
    const input = direction === '↓';
    const background = input ? '#fbf3d0' : '#28456b';
    const ink = input ? '#354d6a' : '#fffbe7';
    round(ctx, x + 1, y + 2, width, height, 6, 'rgba(44,64,81,.23)');
    round(ctx, x, y, width, height, 6, background, input ? '#957a4f' : '#fff6cc', 1.35);
    round(ctx, x + 2, y + 2, 13, 16, 4, input ? '#efcf83' : '#46638c');
    type(ctx, direction, x + 8.5, y + 10, 12.5, ink, 900, 'center');
    let offset = x + 17;
    for (const { id, text, width: itemWidth } of items) {
      const itemY = y + (id === 'fuel' ? 15.9 : id === 'cash' ? 11.5 : 14);
      drawItem(ctx, offset + 7, itemY, id, 0.74);
      type(ctx, text, offset + 15, y + 10.4, 10.8, ink, 900, 'left', true);
      offset += itemWidth;
    }
  }

  function terrainTile(ctx, x, y, width, main, edge) {
    const points = [[-width, 0], [-width + 6, -11], [width - 2, -9], [width, 0], [width - 7, 11], [-width + 3, 9]];
    polygon(ctx, points.map(([u, v]) => [x + u, y + v + 4]), edge, '#42526c', 1.3);
    polygon(ctx, points.map(([u, v]) => [x + u, y + v]), main, '#fff8cf', 1.5);
  }

  function drawUpgradePad(ctx, pad, upgrade, focused, time) {
    if (!upgrade?.available) return;
    const { x, y } = point(pad.u, pad.v);
    const active = upgrade.affordable;
    if (active) oval(ctx, x, y + 1, 42 + Math.sin(time * 4) * 3, 18, '#fff4a86c');
    terrainTile(ctx, x, y, 31, active ? pad.tint : '#d3d9bc', active ? '#b38742' : '#91a390');
    type(ctx, '+', x, y - 1, 19, active ? '#35556a' : '#617683', 900, 'center', true);
    const bubble = active || focused ? ['#fff6b6', '#f2ae4a', '#664825'] : ['#f5f9df', '#acb974', '#516343'];
    badge(ctx, `$${upgrade.cost}`, x, y - 18, bubble, 11);
    type(ctx, pad.label, x, y + 20, 13, '#324460', 900, 'center');
  }

  function drawExpansionPad(ctx, expansion, focused, time) {
    const { x, y } = point(EXPANSION_PAD.u, EXPANSION_PAD.v);
    const active = expansion.affordable || focused;
    if (active) oval(ctx, x, y, 43 + Math.sin(time * 4) * 3, 20, '#b5e8ff90', '#e2fbff', 2);
    terrainTile(ctx, x, y, 33, active ? '#8ab8ff' : '#bbc9ec', '#647db4');
    type(ctx, '↗', x, y - 1, 19, '#273f82', 900, 'center');
    const colors = active ? ['#e4f8ff', '#547ed8', '#223875'] : ['#f0f3ff', '#8f9fcc', '#45598a'];
    badge(ctx, `EXPAND $${expansion.cost}`, x, y - 25, colors, 11);
  }

  function drawAnnex(ctx, stage, time) {
    const { x, y } = point(EXPANSION_PAD.u, EXPANSION_PAD.v);
    oval(ctx, x + 5, y + 6, 41, 11, '#95658442');
    terrainTile(ctx, x, y, 36, '#c0eaff', '#6496bd');
    round(ctx, x - 22, y - 11, 43, 14, 3, '#adcfff', '#445e9b', 1.4);
    polygon(ctx, [[x - 22, y - 11], [x - 14, y - 18], [x + 29, y - 17], [x + 21, y - 11]], '#e4f8ff', '#637bbd', 1.4);
    polygon(ctx, [[x + 21, y - 11], [x + 29, y - 17], [x + 29, y - 4], [x + 21, y + 3]], '#779cd3', '#445e9b', 1.4);
    for (const offset of [-15, -8, -1, 6, 13]) round(ctx, x + offset, y - 6, 3.5, 3.5, 0.8, '#fff29a');
    line(ctx, x - 13, y - 14, x - 13, y - 49, '#40649f', 3);
    oval(ctx, x - 13, y - 49, 3, 3, '#f7f37d', '#40649f', 1);
    const flag = Math.sin(time * 4) * 2;
    polygon(ctx, [[x - 12, y - 46], [x + 10, y - 45 + flag], [x + 6, y - 34 + flag], [x - 12, y - 36]], '#6d83ed', '#435dba', 1);
    line(ctx, x - 9, y - 40, x + 1, y - 40 + flag, '#e5fdff', 1.5);
    badge(ctx, stage.name, x, y - 63, ['#e5f8ff', '#638fca', '#2b4e82'], 11);
  }

  function facilityVisible(id, state) {
    const facility = state?.facilities[id];
    return Boolean(facility && (id !== 'cargo' || facility.unlocked));
  }

  function facilityPadInfo(pad, station, state, next) {
    const rules = window.SpaceportRules;
    const facility = state.facilities[pad.id];
    const isLocked = !facility.unlocked;
    const shared = pad.zone === 'both';
    const acceptsInput = pad.zone !== 'output';
    const hasOutput = pad.zone !== 'input';
    const building = acceptsInput && isLocked && next?.id === pad.id;
    const { x, y } = point(pad.u, pad.v);
    const large = shared || pad.id === 'launch';
    const height = large ? 13 : 10.5;
    const width = large ? 32 : 22;
    const build = building ? { text: `BUILD $${next.unlock}`, x, y: y - 26, size: 11 } : null;
    const tags = [];
    const inputLimit = rules.INPUT_CAPACITY ?? 10;
    const outputLimit = rules.OUTPUT_CAPACITY ?? 6;
    if (shared && !isLocked) {
      const { cash, cubes } = rules.FACILITIES[pad.id];
      const queue = `${facility.input}/${inputLimit}`;
      const entries = [[cubes ? 'data' : 'fuel', queue]];
      if (cash) entries.unshift(['cash', `$${cash}`]);
      if (cubes > 1) entries.unshift(['data', `×${cubes}`]);
      tags.push(resourceTag(x - 36, y + 23, '↓', entries));
    }
    if (hasOutput && (!isLocked || facility.output > 0)) {
      const limit = pad.id === 'ground' ? rules.getRates(state).cap
        : pad.id === 'cargo' ? rules.getCargoCapacity?.(state) ?? rules.CARGO_CAPACITY
        : isLocked ? 1 : rules.getFacilityOutputCapacity?.(state, pad.id) ?? outputLimit;
      const stock = station.item === 'cash' ? facility.stock ?? Math.floor(facility.output / 10) : facility.output;
      const entries = [[station.item || 'crate', `${stock}/${limit}`]];
      if (station.item === 'cash') entries[0][1] = `$${facility.output} · ${stock}/${limit}`;
      tags.push(resourceTag(x + (shared && !isLocked ? 62 : 0), y + 23, '↑', entries));
    }
    if (pad.id === 'launch') {
      const recipe = rules.getRecipe(state);
      if (recipe?.mission) {
        const payload = rules.INGREDIENTS.map(id => [id, `${state.loadout[id]}/${recipe.ingredients?.[id] ?? '?'}`]);
        tags.push(resourceTag(x - 94, y - 75, '↓', payload.slice(0, 2)));
        tags.push(resourceTag(x - 94, y - 49, '↓', payload.slice(2)));
      }
    }
    return { facility, isLocked, shared, acceptsInput, hasOutput, building, x, y, width, height, build, tags };
  }

  function drawPad(ctx, pad, station, info, state, focused, guided, next, time, hovered, holdProgress) {
    const { facility, isLocked, shared, acceptsInput, hasOutput, building, x, y, width, height, build, tags } = info;
    const canGuide = guided || building;
    const padOpen = !isLocked || canGuide || (hasOutput && facility.output > 0);
    const glow = 0.65 + Math.sin(time * 5) * 0.18;
    ctx.save();
    ctx.lineJoin = 'round';
    if (guided || hovered) {
      oval(ctx, x, y, width + 8, height + 6, `rgba(255,244,174,${glow * 0.72})`, 'rgba(255,253,221,.9)', 3, -0.08);
    }
    const fill = isLocked && canGuide ? '#ffe47a' : padOpen ? station.tint : '#e1d8b9';
    if (building) {
      terrainTile(ctx, x, y, width + 4, fill, '#d1a64e');
    } else {
      oval(ctx, x, y + 3, width + 1, height + 1, 'rgba(35,73,74,.33)', null, 1, -0.08);
      oval(ctx, x, y, width, height, fill, focused || guided ? '#fffedc' : '#769292', focused || guided ? 2.5 : 1.25, -0.08);
      oval(ctx, x, y - 0.6, width - 4, height - 2.2, null, padOpen ? 'rgba(251,255,228,.74)' : 'rgba(252,240,210,.71)', 1.2, -0.08);
    }
    if (holdProgress > 0) {
      ctx.beginPath();
      ctx.ellipse(x, y, width + 4, height + 3, -0.08, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * holdProgress);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff8b2';
      ctx.stroke();
    }
    if (!hasOutput || facility.output <= 0) {
      const mark = pad.id === 'scrap' ? '×' : pad.id === 'returns' ? '↩' : '';
      const glyph = isLocked ? (canGuide ? '+' : '·') : mark;
      if (glyph) type(ctx, glyph, x, y + 0.3, 17, '#365470', 900, 'center', true);
    }
    if (build) {
      const colors = state.wallet >= next.unlock ? ['#fff2a0', '#e6a443', '#6e4424'] : ['#fbf7da', '#b5a982', '#766443'];
      badge(ctx, build.text, build.x, build.y, colors, build.size);
    }
    if (acceptsInput && facility.input > 0) {
      const count = Math.min(3, facility.input);
      for (let i = count - 1; i >= 0; i -= 1) drawItem(ctx, x - 18 + i * 3.5, y + 3 - i * 4, pad.id === 'fuel' ? 'cash' : 'data', 0.66);
    }
    if (hasOutput && pad.id !== 'cargo' && facility.output > 0) {
      const count = station.item === 'cash' ? facility.stock ?? Math.ceil(facility.output / 10) : facility.output;
      const visible = Math.min(station.item === 'data' ? 9 : 6, count);
      const bounce = Math.sin(time * 3.8) * 2.2;
      for (let i = 0; i < visible; i += 1) {
        const column = (i % 3) - 1;
        const row = Math.floor(i / 3);
        const stackX = x + column * 11.5 + (facility.input > 0 && shared ? 9 : 0);
        drawItem(ctx, stackX, y + 2 - row * 6.5 + (row === 0 ? 0 : bounce), station.item, 0.88);
      }
    }
    for (const tag of tags) drawResourceTag(ctx, tag);
    ctx.restore();
  }

  function stationLabelBounds(id, station, compactScreen) {
    const p = point(station.u, station.v);
    const y = p.y - (STATION_HEIGHTS[id] ?? 82);
    const width = 39 + station.label.length * (compactScreen ? 8.5 : 6.9);
    const x = p.x - width / 2 - (id === 'grant' ? 8 : 0);
    return { x, y, width, height: 24 };
  }

  function placeStationLabels(stationSprites, view, obstacles) {
    const viewport = { x: -view.x / view.scale, y: -view.y / view.scale, width: view.width / view.scale, height: view.height / view.scale };
    const occupied = obstacles.slice();
    for (const { info } of stationSprites) {
      occupied.push(...info.tags);
      if (info.build) occupied.push(badgeBounds(info.build.text, info.build.x, info.build.y, info.build.size));
    }
    const placed = new Map();
    const stations = [...stationSprites].sort((first, second) => second.y - first.y);
    for (const { id, station, x, y } of stations) {
      const original = stationLabelBounds(id, station, view.compact);
      const edge = 4;
      const fit = candidate => candidate.x > viewport.x + edge && candidate.y > viewport.y + edge
        && candidate.x + candidate.width < viewport.x + viewport.width - edge
        && candidate.y + candidate.height < viewport.y + viewport.height - edge
        && !occupied.some(blocked => overlaps(candidate, blocked, 4));
      if (!overlaps(viewport, original) && !contains(viewport, x, y - 20)) continue;
      if (fit(original)) {
        placed.set(id, original);
        occupied.push(original);
        continue;
      }
      const left = viewport.x + edge + 1;
      const right = viewport.x + viewport.width - original.width - edge - 1;
      const top = viewport.y + edge + 1;
      const offsets = [0, 24, -24, 46, -46];
      const candidateX = clamp(original.x, left, right);
      const candidateY = Math.max(original.y, top);
      const targets = [];
      for (const offset of offsets) targets.push({ ...original, x: candidateX + offset, y: candidateY });
      for (const obstacle of occupied) {
        if (!overlaps({ ...original, x: candidateX, y: candidateY, height: original.height + 38 }, obstacle, 4)) continue;
        for (const offset of offsets) targets.push({ ...original, x: candidateX + offset, y: obstacle.y + obstacle.height + 6 });
      }
      for (const offset of [28, 52, 76]) targets.push({ ...original, x: candidateX, y: candidateY + offset });
      const distanceFromAnchor = candidate => Math.hypot(candidate.x - original.x, candidate.y - original.y);
      const placement = targets
        .filter(candidate => Math.abs(candidate.x - original.x) <= 66 && candidate.y <= y + 6)
        .sort((first, second) => distanceFromAnchor(first) - distanceFromAnchor(second))
        .find(fit);
      if (placement) {
        placed.set(id, placement);
        occupied.push(placement);
      }
    }
    return placed;
  }

  function drawLabel(ctx, id, station, state, compactScreen, hovered, bounds) {
    if (!bounds) return;
    const facility = state.facilities[id];
    const { x, y, width, height } = bounds;
    const accessible = facility.unlocked || (id === 'engineering' && facility.output > 0);
    round(ctx, x + 1.5, y + 3, width, height, 8, 'rgba(51,67,92,.24)');
    const fill = hovered ? '#f1f6ff' : accessible ? '#fff9dd' : '#f6ebc9';
    const edge = hovered ? '#6377ba' : accessible ? '#6a6d80' : '#bd9f72';
    round(ctx, x, y, width, height, 8, fill, edge, hovered ? 2.2 : 1.45);
    oval(ctx, x + 11, y + 11.8, 3.9, 3.9, accessible ? station.tint : '#c7a982', '#6c647c', 0.65);
    type(ctx, station.label, x + 19, y + 12.5, compactScreen ? 16 : 13, '#2c3d63', 900);
    const centerX = x + width - 11;
    const centerY = y + 12;
    if (facility.active || (id === 'ground' && facility.progress > 0)) {
      oval(ctx, centerX, centerY, 6.6, 6.6, '#374d70', '#fff8df', 1);
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5.2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.07, facility.progress));
      ctx.strokeStyle = station.tint;
      ctx.lineWidth = 1.65;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else {
      oval(ctx, centerX, centerY, 5.7, 5.7, '#f3f2ff', '#6a7cb2', 1);
      type(ctx, 'i', centerX, centerY + 0.5, 8, '#3c5894', 900, 'center', true);
    }
  }

  const SUITS = {
    player: { accent: '#42f0e4', dark: '#228c9f', visor: '#2287ac', shine: '#bceef2', outline: '#24476a' },
    intern: { accent: '#c67aff', dark: '#7947b3', visor: '#6d4da2', shine: '#efd7fd', outline: '#58366d' },
    runner: { accent: '#ffa249', dark: '#cd6549', visor: '#526e98', shine: '#ffe6b6', outline: '#7b433f' },
    officer: { accent: '#4f917a', dark: '#335473', visor: '#315575', shine: '#e5f8de', outline: '#294558' },
    materials: { accent: '#75dc91', dark: '#459068', visor: '#357c79', shine: '#d8ffe3', outline: '#386857' },
    clerk: { accent: '#f69dc4', dark: '#b56da5', visor: '#76588b', shine: '#ffe1ef', outline: '#714875' },
  };

  function drawAstronaut(ctx, player, inventory, time, moving, role = 'player', capacity = 0) {
    const p = point(player.u, player.v);
    const step = moving ? Math.sin(time * 17) : 0;
    const sway = moving ? Math.sin(time * 11) * 3.4 : 0;
    const { accent, dark, visor, shine, outline } = SUITS[role];
    const playerRole = role === 'player';
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(playerRole ? 1.13 : 0.87, playerRole ? 1.13 : 0.87);
    oval(ctx, 5, 3, 19, 8, 'rgba(42,85,106,.26)');
    if (playerRole) {
      oval(ctx, 0, 2, 17, 7.5, 'rgba(47,240,201,.29)', '#fff9db', 2.4, -0.08);
      oval(ctx, 0, 2, 19, 9, null, 'rgba(30,120,143,.62)', 1.4, -0.08);
    }
    ctx.translate(0, -Math.abs(step) * 2.9);
    round(ctx, -11, -25, 17, 20, 5, dark, outline, 1.3);
    round(ctx, -9 + step * 2, -10, 8.5, 10 + step * 2.1, 2.8, dark, outline, 1.3);
    round(ctx, 1 - step * 2, -10, 8.5, 10 - step * 2.1, 2.8, dark, outline, 1.3);
    round(ctx, -11, -24, 22, 18, 6, accent, outline, 1.5);
    round(ctx, -10, -12, 20, 6, 2.7, dark, outline, 0.8);
    round(ctx, -15 - step * 2, -21, 7, 12, 3, accent, outline, 1.4);
    round(ctx, 8 + step * 2, -21, 7, 12, 3, accent, outline, 1.4);
    oval(ctx, 0, -32, 15, 14, '#fff9ec', outline, 1.7);
    oval(ctx, 2 * player.facing, -32, 12.2, 9.5, visor, outline, 1.4);
    oval(ctx, 3.9 * player.facing, -35.7, 5.6, 2.4, shine, null, 1, 0.1 * player.facing);
    if (role === 'officer') {
      round(ctx, -12, -48, 24, 11, 4, '#315c6b', outline, 1.4);
      round(ctx, -15, -41, 29, 4, 1.5, '#21475c', outline, 1.1);
      polygon(ctx, [[-3, -45], [0, -47.5], [3, -45], [0, -42]], '#ffe58a', '#b99148', 0.8);
      polygon(ctx, [[-3, -20], [0, -23], [3, -20], [0, -17]], '#ffe58a');
    } else {
      round(ctx, -3, -20, 6, 4, 1.5, '#fff3b8');
    }
    line(ctx, -9, -25, -12, -27, accent, 2.1);
    line(ctx, 9, -25, 12, -27, accent, 2.1);
    const stack = Object.entries(inventory).flatMap(([item, count]) => Array.from({ length: count }, () => item));
    const spacing = stack.length > 8 ? 7.5 : 10.7;
    for (const [i, item] of stack.entries()) drawItem(ctx, sway * Math.min(i + 1, 5) * 0.45, -50 - i * spacing, item, playerRole ? 1.18 : 1.02);
    if (playerRole) {
      const topping = -56 - stack.length * spacing;
      const toppingX = sway * Math.min(stack.length, 5) * 0.45;
      if (stack.length === capacity) badge(ctx, 'MAX', toppingX, topping - 11, ['#fff29c', '#df873d', '#6d3e28'], 13);
      else if (stack.length) badge(ctx, `${stack.length}/${capacity}`, toppingX, topping - 9, ['#313e71', '#fff9e5', '#fff9d9'], 10);
      else polygon(ctx, [[-6, topping], [6, topping], [0, topping + 6]], '#fff3ad', '#345e86', 1.2);
    }
    ctx.restore();
  }

  function drawCargoShelf(ctx, x, y, shelf) {
    oval(ctx, x + 5, y + 5, 42, 14, 'rgba(93,112,61,.33)');
    polygon(ctx, [[x - 39, y], [x + 32, y + 2], [x + 46, y - 15], [x - 25, y - 18]], '#ffca78', '#9c6c46', 1.4);
    round(ctx, x - 32, y - 52, 64, 52, 6, '#a86f46', '#674551', 2);
    polygon(ctx, [[x + 32, y - 50], [x + 42, y - 59], [x + 42, y - 10], [x + 32, y]], '#bf8353', '#674551', 1.7);
    polygon(ctx, [[x - 34, y - 51], [x + 33, y - 50], [x + 43, y - 59], [x - 24, y - 61]], '#ffcf8b', '#a77853', 1.7);
    for (const [i, [item, count]] of Object.entries(shelf).entries()) {
      const left = x - 26 + (i % 2) * 28;
      const top = y - 46 + Math.floor(i / 2) * 20;
      round(ctx, left, top, 24, 17, 3, '#694d5b', '#eac68b');
      for (let j = 0; j < Math.min(count, 3); j += 1) drawItem(ctx, left + 6 + j * 6, top + 14, item, 0.76);
    }
    round(ctx, x - 32, y - 5, 65, 7, 2, '#efb47c', '#9a674b');
  }

  function drawReturnsCrate(ctx, x, y) {
    oval(ctx, x + 3, y + 4, 34, 12, '#447e4969');
    polygon(ctx, [[x - 30, y], [x + 23, y + 1], [x + 38, y - 16], [x - 15, y - 17]], '#b1e2a4', '#4c936b', 1.5);
    round(ctx, x - 24, y - 32, 49, 33, 5, '#7dc790', '#396e5e', 1.9);
    polygon(ctx, [[x + 25, y - 31], [x + 34, y - 40], [x + 34, y - 9], [x + 25, y]], '#4b9f81', '#396e5e', 1.6);
    polygon(ctx, [[x - 26, y - 32], [x + 25, y - 31], [x + 35, y - 40], [x - 17, y - 43]], '#b8edab', '#4b8a6a', 1.5);
    round(ctx, x - 14, y - 27, 29, 20, 4, '#eaf7c4', '#479265', 1.2);
    type(ctx, '↩', x, y - 16, 18, '#2b7658', 900, 'center');
  }

  function helperPosition(home, destination, progress, facing) {
    return { u: home.u + (destination.u - home.u) * progress, v: home.v + (destination.v - home.v) * progress, facing };
  }

  function navPoint(pad, ruleState) {
    if (!pad) return false;
    if (pad.zone === 'upgrade') return Boolean(window.SpaceportRules.getUpgrade(ruleState, pad.id)?.available);
    if (pad.zone === 'expansion') return Boolean(window.SpaceportRules.getExpansion?.(ruleState)?.available);
    return facilityVisible(pad.id, ruleState);
  }

  function facilityAt(x, y, state, compact, labels) {
    const visible = Object.entries(STATIONS).filter(([id]) => facilityVisible(id, state));
    for (const [id, station] of visible) {
      const name = labels ? labels.get(id) : stationLabelBounds(id, station, compact);
      if (name && contains(name, x, y)) return id;
    }
    const unlock = window.SpaceportRules.getUnlock(state);
    for (const [id, station] of visible) {
      const info = facilityPadInfo(TARGET_BY_ID.get(id), station, state, unlock);
      const inPad = ((x - info.x) / (info.width + 5)) ** 2 + ((y - info.y) / (info.height + 5)) ** 2 < 1;
      if (inPad || info.tags.some(tag => contains(tag, x, y))) return id;
      if (info.build && contains(badgeBounds(info.build.text, info.build.x, info.build.y, info.build.size), x, y)) return id;
    }
    const widths = { launch: 73, scrap: 33, ground: 57, cargo: 46, returns: 39 };
    let nearest = null;
    let separation = Infinity;
    for (const [id, station] of visible) {
      const p = point(station.u, station.v);
      const vertical = p.y - y;
      const dx = Math.abs(p.x - x);
      if (dx > (widths[id] ?? 51) || vertical < -22 || vertical > (STATION_HEIGHTS[id] ?? 82)) continue;
      if (dx < separation) {
        nearest = id;
        separation = dx;
      }
    }
    return nearest;
  }

  function expansionAt(x, y, state) {
    const expansion = window.SpaceportRules.getExpansion?.(state);
    if (!expansion?.available) return false;
    const p = point(EXPANSION_PAD.u, EXPANSION_PAD.v);
    return contains(badgeBounds(`EXPAND $${expansion.cost}`, p.x, p.y - 25, 11), x, y)
      || (Math.abs(x - p.x) <= 35 && Math.abs(y - p.y) <= 15);
  }

  class SpaceportYard {
    constructor(canvas, callbacks = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.callbacks = callbacks;
      this.scene = null;
      this.sky = document.createElement('canvas');
      this.sky.width = 0;
      this.sky.height = 0;
      this.hudNodes = Array.from(document.querySelectorAll?.(HUD_SELECTOR) || []);
      this.hudRects = [];
      this.nextHudSample = 0;
      this.labelPositions = null;
      this.view = null;
      this.paintElapsed = 0;
      this.nextPaint = 0;
      this.panel = { open: false, width: 330, height: 0 };
      this.pressed = new Set();
      this.puff = [];
      this.transfers = [];
      this.time = 0;
      this.specialSeen = {};
      this.specialFlash = {};
      this.player = { ...START, facing: 1 };
      this.nearby = null;
      this.nearZone = null;
      this.padHold = 0;
      this.padHoldTotal = 0;
      this.padAction = undefined;
      this.pickupDelay = 0;
      this.paused = false;
      this.target = null;
      this.guide = null;
      this.launchTime = 0;
      this.pointer = null;
      this.hovered = null;
      this.canvas.style.touchAction = 'none';
      this.bindControls();
    }

    bindControls() {
      const keys = ['arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'w', 'a', 's', 'd'];
      const focusedControl = (event, selector) => event.target instanceof Element && event.target.closest(selector);
      window.addEventListener('keydown', event => {
        if (this.paused || focusedControl(event, 'input, select, textarea, [contenteditable]') || event.altKey || event.metaKey || event.ctrlKey) return;
        const key = event.key.toLowerCase();
        if (keys.includes(key)) {
          event.preventDefault();
          this.pressed.add(key);
          this.target = null;
        } else if ((key === 'enter' || key === ' ') && this.nearby === 'launch' && !event.repeat && !focusedControl(event, 'button, a')) {
          event.preventDefault();
          this.callbacks.onOpenLaunch?.();
        }
      });
      window.addEventListener('keyup', event => this.pressed.delete(event.key.toLowerCase()));
      window.addEventListener('blur', () => {
        this.pressed.clear();
        this.pointer = null;
      });
      this.canvas.addEventListener('pointerdown', event => {
        if (this.paused || event.button !== 0 || this.pointer) return;
        const location = this.pointerLocation(event);
        this.pointer = { id: event.pointerId, x: location.x, y: location.y, dx: 0, dy: 0, moved: false };
        this.canvas.setPointerCapture?.(event.pointerId);
        this.target = null;
      });
      this.canvas.addEventListener('pointermove', event => {
        const location = this.pointerLocation(event);
        if (!this.pointer) {
          if (event.pointerType === 'mouse' && this.view && this.state) {
            const { x, y } = this.view;
            const sceneX = (location.x - x) / this.view.scale;
            const sceneY = (location.y - y) / this.view.scale;
            const hover = facilityAt(sceneX, sceneY, this.state, this.view.compact, this.labelPositions) ?? (expansionAt(sceneX, sceneY, this.state) ? 'expansion' : null);
            this.setHover(hover);
          }
          return;
        }
        if (this.pointer.id !== event.pointerId) return;
        this.pointer.dx = location.x - this.pointer.x;
        this.pointer.dy = location.y - this.pointer.y;
        this.pointer.moved ||= Math.hypot(this.pointer.dx, this.pointer.dy) > 10;
        if (this.pointer.moved) this.setHover(null);
      });
      this.canvas.addEventListener('pointerup', event => {
        if (this.pointer?.id !== event.pointerId) return;
        if (!this.pointer.moved && !this.paused && this.state && this.view) {
          const { x, y } = this.pointerLocation(event);
          const view = this.view;
          this.tap({ x: (x - view.x) / view.scale, y: (y - view.y) / view.scale });
        }
        this.pointer = null;
      });
      for (const name of ['pointercancel', 'lostpointercapture']) this.canvas.addEventListener(name, event => {
        if (this.pointer?.id === event.pointerId) this.pointer = null;
      });
      this.canvas.addEventListener('pointerleave', () => this.setHover(null));
    }

    setHover(id) {
      if (id === this.hovered) return;
      this.hovered = id;
      this.canvas.style.cursor = id ? 'pointer' : '';
    }

    pointerLocation(event) {
      const rect = this.canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    tap({ x, y }) {
      const facility = facilityAt(x, y, this.state, this.view?.compact, this.labelPositions);
      if (facility) {
        this.target = null;
        this.callbacks.onFacilityInspect?.(facility);
        return;
      }
      if (expansionAt(x, y, this.state)) {
        this.target = null;
        this.doInteract(EXPANSION_PAD, 'inspect');
        return;
      }
      const worldPoint = local(x, y);
      const targets = TARGETS.filter(target => HOLD_ZONES.includes(target.zone) && navPoint(target, this.state));
      const pad = targets.reduce((nearest, target) => !nearest || distance(target, worldPoint) < distance(nearest, worldPoint) ? target : nearest, null);
      const touchMargin = this.view?.compact ? 4 : 0;
      if (pad && distance(pad, worldPoint) < 36 + touchMargin) {
        this.sendTo(pad.id, pad.zone);
        return;
      }
      if (worldPoint.u >= -10 && worldPoint.u <= FLOOR.width + 10 && worldPoint.v >= -10 && worldPoint.v <= FLOOR.height + 10) {
        this.target = { u: clamp(worldPoint.u, 19, FLOOR.width - 19), v: clamp(worldPoint.v, 19, FLOOR.height - 19) };
      }
    }

    sendTo(id, zone = 'both') {
      if (this.paused) return;
      const pad = TARGET_BY_ID.get(id);
      if (!pad) return;
      if (pad.zone === 'expansion' && (!this.state || !navPoint(pad, this.state))) return;
      const action = id === 'fuel' && (zone === 'input' || zone === 'output') ? zone : pad.zone;
      if (this.nearby === pad.id && this.nearZone === pad.zone) {
        this.target = null;
        if (id === 'scrap' || id === 'returns') return;
        this.padHold = 0;
        const pickupOnly = id === 'fuel' && action === 'both' && this.state.facilities.fuel.unlocked;
        this.doInteract(pad, pickupOnly ? 'output' : action);
      } else {
        this.target = { ...pad, action };
      }
    }

    setGuide(id) {
      this.guide = TARGET_BY_ID.get(id) ?? null;
    }

    setPanelOpen(open, width = 330, height = 0) {
      this.panel = { open, width, height };
      this.nextHudSample = 0;
    }

    setPaused(paused) {
      this.paused = paused;
      if (paused) {
        this.pressed.clear();
        this.target = null;
        this.pointer = null;
        this.padHold = 0;
        this.setHover(null);
      }
    }

    reset() {
      this.player = { ...START, facing: 1 };
      this.target = null;
      this.nearby = null;
      this.nearZone = null;
      this.padHold = 0;
      this.padHoldTotal = 0;
      this.padAction = undefined;
      this.pickupDelay = 0;
      this.puff = [];
      this.transfers = [];
      this.launchTime = 0;
      this.view = null;
      this.nextHudSample = 0;
    }

    doInteract(pad, action = pad.zone) {
      if (pad.zone === 'expansion') {
        if (!this.state.report && navPoint(pad, this.state)) this.callbacks.onExpansion?.(action === 'inspect');
        return;
      }
      if (pad.zone === 'upgrade') {
        if (this.callbacks.onUpgrade?.(pad.id)) this.sparkle(pad, pad.tint);
        return;
      }
      if (pad.id === 'fuel' && action === 'input') {
        const { input, active, output } = this.state.facilities.fuel;
        if (output > 0) action = 'output';
        else if (input > 0 || active) return;
      }
      const event = this.callbacks.onInteract?.(pad.id, action);
      if (event) this.noteEvent(event);
    }

    noteEvent(event) {
      if (event?.type === 'batch') {
        event.events.forEach((action, index) => this.noteTransfer(action, index * 0.16));
        return;
      }
      this.noteTransfer(event);
    }

    noteTransfer(event, delay = 0) {
      const station = STATIONS[event?.facility];
      if (!station) return;
      const deposit = ['deposit', 'order', 'scrap', 'discard', 'store', 'return'].includes(event.type);
      const p = point(this.player.u, this.player.v);
      const coordinates = TARGET_BY_ID.get(event.facility) || station;
      const q = point(coordinates.u, coordinates.v);
      if (event.type === 'unlock') {
        this.sparkle(coordinates, station.tint);
      } else if (event.item) {
        const from = deposit ? p : q;
        const to = deposit ? q : p;
        for (let i = 0; i < Math.min(event.count, 6); i += 1) {
          this.transfers.push({ from, to, age: -delay - i * TRANSFER_STAGGER, item: event.item, deposit });
        }
      }
    }

    sparkle({ u, v }, color) {
      const { x, y } = point(u, v);
      for (let i = 0; i < 13; i += 1) {
        const angle = i / 13 * Math.PI * 2;
        this.puff.push({ x, y: y - 5, vx: Math.cos(angle) * (33 + i * 3), vy: Math.sin(angle) * 24 - 35, age: 0, life: 0.75, size: 3.4, color: i % 3 === 0 ? '#fff198' : color });
      }
    }

    burstLaunch() {
      this.launchTime = 1.75;
      const p = point(STATIONS.launch.u, STATIONS.launch.v);
      for (let i = 0; i < 32; i += 1) {
        const angle = i * 2.35;
        this.puff.push({ x: p.x + Math.cos(angle) * 9, y: p.y - 18, vx: Math.cos(angle) * (28 + i * 3), vy: Math.sin(angle) * 23 + 9, age: 0, life: 0.62 + i * 0.022, size: 4 + i * 0.28, color: ['#f7ead0', '#f6c695', '#d6e9d3', '#f7eae2'][i % 4] });
      }
    }

    updateMotion(state, dt) {
      const keyboard = this.pressed;
      let dx = Number(keyboard.has('arrowright') || keyboard.has('d')) - Number(keyboard.has('arrowleft') || keyboard.has('a'));
      let dy = Number(keyboard.has('arrowdown') || keyboard.has('s')) - Number(keyboard.has('arrowup') || keyboard.has('w'));
      if (this.pointer?.moved) {
        dx = this.pointer.dx;
        dy = this.pointer.dy;
      }
      const previous = this.player;
      const amount = 189 * window.SpaceportRules.getRates(state).speed * dt;
      let destination = null;
      if (dx || dy) {
        const norm = Math.hypot(dx, dy);
        const movement = unproject(dx / norm, dy / norm);
        const screenStep = amount * PROJECTION.width;
        destination = { u: previous.u + movement.u * screenStep, v: previous.v + movement.v * screenStep };
      } else if (this.target) {
        const remaining = distance(this.target, previous);
        const progress = remaining ? Math.min(1, amount / remaining) : 1;
        destination = { u: previous.u + (this.target.u - previous.u) * progress, v: previous.v + (this.target.v - previous.v) * progress };
      }
      if (destination) {
        destination.u = clamp(destination.u, 19, FLOOR.width - 18);
        destination.v = clamp(destination.v, 19, FLOOR.height - 17);
        const dxScreen = point(destination.u, destination.v).x - point(previous.u, previous.v).x;
        this.player = { ...destination, facing: Math.abs(dxScreen) > 0.15 ? Math.sign(dxScreen) : previous.facing };
      }
      return distance(this.player, previous) > 0.15;
    }

    detectNearby(dt) {
      let pad = null;
      let best = 23;
      for (const target of TARGETS) {
        const separation = distance(target, this.player);
        if (this.target?.id && target.id !== this.target.id) continue;
        if (separation < best && navPoint(target, this.state)) {
          pad = target;
          best = separation;
        }
      }
      if (this.nearby !== (pad?.id || null) || this.nearZone !== (pad?.zone || null)) {
        this.nearby = pad?.id || null;
        this.nearZone = pad?.zone || null;
        this.callbacks.onFocus?.(this.nearby, this.nearZone);
        this.padHoldTotal = pad?.id === 'scrap' ? SCRAP_HOLD : HOLD_ZONES.includes(pad?.zone) ? 0.50 : pad ? PAD_SETTLE : 0;
        this.padHold = this.padHoldTotal;
        this.padAction = this.target?.action;
        this.pickupDelay = PICKUP_INTERVAL;
      } else if (pad && this.padHold > 0) {
        this.padHold -= dt;
        if (this.padHold <= 0) {
          const settle = pad.id !== 'scrap' && !HOLD_ZONES.includes(pad.zone);
          this.doInteract(pad, settle ? this.padAction : undefined);
        }
      } else if (pad && (pad.zone === 'both' || pad.zone === 'output')) {
        this.pickupDelay -= dt;
        if (this.pickupDelay <= 0 && (this.state.facilities[pad.id].output > 0 || this.state.facilities[pad.id].special > 0)) {
          this.pickupDelay = PICKUP_INTERVAL;
          this.doInteract(pad, 'output');
        }
      }
    }

    updateView(width, height, dt) {
      const compact = width <= MOBILE_BREAKPOINT;
      const short = height < 520;
      const top = compact ? (short ? 90 : 145) : Math.min(112, height * 0.15);
      const panelReserve = this.panel.open ? this.panel.height || Math.min(height * 0.44, 370) : 0;
      const compactBottom = this.panel.open ? panelReserve + 88 : short ? 105 : 154;
      const bottom = compact ? Math.min(height * 0.72, compactBottom) : Math.min(96, height * 0.13);
      const right = !compact && this.panel.open ? Math.min(this.panel.width + 20, width * 0.44) : 0;
      const availableWidth = width - right;
      const availableHeight = Math.max(100, height - top - bottom);
      const zoom = compact ? clamp(width / 350, 0.90, 1.20) : clamp(Math.min(availableWidth / 660, availableHeight / 320), 1.10, 1.60);
      const player = point(this.player.u, this.player.v);
      const resized = this.view?.width !== width || this.view?.height !== height;
      const blend = resized ? 1 : 1 - Math.exp(-dt * 12);
      const scale = resized ? zoom : this.view.scale + (zoom - this.view.scale) * blend;
      const centerX = availableWidth / 2;
      const centerY = top + availableHeight / 2;
      const x = centerX - player.x * scale;
      const y = centerY - (player.y - 23) * scale;
      this.view = { x, y, width, height, scale, compact, top, right };
      return this.view;
    }

    getHudObstacles(rect, view) {
      if (this.time >= this.nextHudSample) {
        this.nextHudSample = this.time + 0.25;
        this.hudRects = [];
        for (const node of this.hudNodes) {
          const bounds = node.getBoundingClientRect?.();
          if (!bounds?.width || !bounds.height) continue;
          this.hudRects.push({ x: bounds.left - rect.left, y: bounds.top - rect.top, width: bounds.width, height: bounds.height });
        }
      }
      return this.hudRects.map(bounds => ({
        x: (bounds.x - view.x) / view.scale,
        y: (bounds.y - view.y) / view.scale,
        width: bounds.width / view.scale,
        height: bounds.height / view.scale,
      }));
    }

    drawWorld(state, dt, moving) {
      const ctx = this.ctx;
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(PIXEL_RATIO_LIMIT, window.devicePixelRatio || 1);
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      const widthScale = w / r.width;
      const heightScale = h / r.height;
      const view = this.updateView(r.width, r.height, dt);
      const stage = window.SpaceportRules.getStage?.(state);
      const destination = stage?.destination in SCENE_THEMES ? stage.destination : 'Earth';
      if (this.scene?.destination !== destination) this.scene = { destination, yard: makeScenery(destination), planet: makeCelestial(destination) };
      ctx.setTransform(widthScale, 0, 0, heightScale, 0, 0);
      if (this.sky.width !== w || this.sky.height !== h || this.skyDestination !== destination) {
        this.sky.width = w;
        this.sky.height = h;
        const skyContext = this.sky.getContext('2d', { alpha: false });
        skyContext.setTransform(widthScale, 0, 0, heightScale, 0, 0);
        drawSky(skyContext, r.width, r.height, destination);
        this.skyDestination = destination;
      }
      ctx.drawImage(this.sky, 0, 0, r.width, r.height);
      const earthScale = view.compact ? 0.55 : clamp(view.scale, 0.56, 1.13);
      const earthX = r.width - view.right - (view.compact ? 58 : 86);
      const earthY = view.top + (view.compact ? 10 : 13);
      ctx.save();
      ctx.translate(earthX - EARTH.x * earthScale, earthY - EARTH.y * earthScale);
      ctx.scale(earthScale, earthScale);
      const earthExtent = EARTH.padding * 2;
      ctx.drawImage(this.scene.planet, EARTH.x - EARTH.padding, EARTH.y - EARTH.padding, earthExtent, earthExtent);
      drawFleet(ctx, state.satellites.length, this.time);
      ctx.restore();
      ctx.setTransform(view.scale * widthScale, 0, 0, view.scale * heightScale, view.x * widthScale, view.y * heightScale);
      ctx.drawImage(this.scene.yard, 0, 0, WIDTH, HEIGHT);
      const launch = this.launchTime;
      const lift = launch > 0 ? Math.max(0, 1.56 - launch) ** 2 * 230 : 0;
      ctx.save();
      if (launch > 1.24) ctx.translate(Math.sin(launch * 105) * 3.1, Math.sin(launch * 83) * 2.15);
      const next = window.SpaceportRules.getUnlock(state);
      const guide = this.guide;
      const drawables = [];
      const stationSprites = visibleStations(view, state).map(sprite => {
        const pad = TARGET_BY_ID.get(sprite.id);
        return { ...sprite, pad, info: facilityPadInfo(pad, sprite.station, state, next) };
      });
      const obstacles = this.getHudObstacles(r, view);
      for (const { id, station, x, y, pad, info } of stationSprites) {
        const facility = state.facilities[id];
        const made = facility.specialMade ?? 0;
        const seen = this.specialSeen[id];
        if (seen === undefined || made < seen) this.specialSeen[id] = made;
        else if (made > seen) {
          this.specialSeen[id] = made;
          this.specialFlash[id] = this.time;
          this.sparkle(TARGET_BY_ID.get(id) || STATIONS[id], '#ffd23f');
          this.callbacks.onSpecial?.(id);
        }
        const flash = this.specialFlash[id] === undefined ? Infinity : this.time - this.specialFlash[id];
        drawables.push({ y, draw: () => {
          if (id === 'cargo') drawCargoShelf(ctx, x, y, state.runner.shelf);
          else if (id === 'returns') drawReturnsCrate(ctx, x, y);
          else window.SpaceportMachines?.draw(ctx, id, x, y, id === 'launch' ? 1.03 : 0.96, {
            active: facility.active || id === 'ground',
            locked: !facility.unlocked,
            ready: id === 'grant' && facility.output > 0,
            special: facility.special > 0,
            flash,
            time: this.time,
            liftoff: id === 'launch' ? lift : 0,
          });
        } });
        const focused = id === this.nearby && pad.zone === this.nearZone;
        const guided = id === guide?.id && pad.zone === guide?.zone;
        const hovered = id === this.hovered;
        const holdProgress = focused && this.padHold > 0 && this.padHoldTotal ? 1 - this.padHold / this.padHoldTotal : 0;
        drawables.push({ y: info.y - 7, draw: () => drawPad(ctx, pad, station, info, state, focused, guided, next, this.time, hovered, holdProgress) });
      }
      for (const pad of UPGRADE_PADS) {
        const upgrade = window.SpaceportRules.getUpgrade(state, pad.id);
        if (!upgrade?.available) continue;
        const p = point(pad.u, pad.v);
        obstacles.push(badgeBounds(`$${upgrade.cost}`, p.x, p.y - 18, 11), badgeBounds(pad.label, p.x, p.y + 20, 13));
        drawables.push({ y: p.y - 7, draw: () => drawUpgradePad(ctx, pad, upgrade, this.nearby === pad.id, this.time) });
      }
      const expansion = window.SpaceportRules.getExpansion?.(state);
      const expansionPoint = point(EXPANSION_PAD.u, EXPANSION_PAD.v);
      if (expansion?.available) {
        const focused = this.nearby === EXPANSION_PAD.id || this.hovered === EXPANSION_PAD.id;
        obstacles.push(badgeBounds(`EXPAND $${expansion.cost}`, expansionPoint.x, expansionPoint.y - 25, 11));
        drawables.push({ y: expansionPoint.y - 7, draw: () => drawExpansionPad(ctx, expansion, focused, this.time) });
      } else if (stage && stage.id !== 'yard') {
        obstacles.push(badgeBounds(stage.name, expansionPoint.x, expansionPoint.y - 63, 11));
        drawables.push({ y: expansionPoint.y, draw: () => drawAnnex(ctx, stage, this.time) });
      }
      this.drawTraffic(state, drawables);
      const capacity = window.SpaceportRules.getRates(state).carry;
      const drawPlayer = () => drawAstronaut(ctx, this.player, state.inventory, this.time, moving, 'player', capacity);
      drawables.push({ y: point(this.player.u, this.player.v).y, draw: drawPlayer });
      drawables.sort((a, b) => a.y - b.y);
      for (const object of drawables) object.draw();
      this.labelPositions = placeStationLabels(stationSprites, view, obstacles);
      for (const { id, station } of stationSprites) drawLabel(ctx, id, station, state, view.compact, id === this.hovered, this.labelPositions.get(id));
      this.drawEffects(dt);
      ctx.restore();
      if (this.pointer?.moved) {
        ctx.setTransform(widthScale, 0, 0, heightScale, 0, 0);
        const { x, y, dx, dy } = this.pointer;
        const norm = Math.max(1, Math.hypot(dx, dy) / 29);
        oval(ctx, x, y, 39, 39, 'rgba(51,70,121,.71)', '#fffbdb', 2.2);
        oval(ctx, x + dx / norm, y + dy / norm, 14.5, 14.5, '#fff2b0', '#4f5b8b', 1.7);
      }
    }

    drawTraffic(state, drawables) {
      const ctx = this.ctx;
      const addWorker = (worker, inventory, moving, role) => {
        const { x, y } = point(worker.u, worker.v);
        const view = this.view;
        if (view && (x * view.scale + view.x < -45 || x * view.scale + view.x > view.width + 45
          || y * view.scale + view.y < -15 || y * view.scale + view.y > view.height + 130)) return false;
        drawables.push({ y, draw: () => drawAstronaut(ctx, worker, inventory, this.time, moving, role) });
        return true;
      };
      const canWalk = id => state.workerEnabled?.[id] !== false && !(state.workerRest?.[id] > 0);
      const ground = padPoints(STATIONS.ground, 'output');
      const grant = padPoints(STATIONS.grant, 'input');
      const hState = state.helper;
      if (state.upgrades.intern && hState) {
        const delivering = hState.phase === 'deliver';
        const position = delivering ? hState.progress : 1 - hState.progress;
        const helper = helperPosition({ u: ground.u, v: ground.v + 14 }, { u: grant.u, v: grant.v + 14 }, position, delivering ? 1 : -1);
        addWorker(helper, { data: hState.cargo }, hState.progress < 1 && canWalk('intern'), 'intern');
      }
      if (state.upgrades.runner && state.runner) {
        const { phase, progress, from, cargo, cargoCount } = state.runner;
        const home = { u: STATIONS.cargo.u - 40, v: STATIONS.cargo.v + 35 };
        const factory = STATIONS[from] ? padPoints(STATIONS[from], 'output') : home;
        const traveling = phase === 'pickup' || phase === 'deliver';
        const ratio = phase === 'pickup' ? progress : phase === 'deliver' ? 1 - progress : 0;
        const runner = helperPosition(home, factory, ratio, phase === 'pickup' ? -1 : 1);
        addWorker(runner, cargo ? { [cargo]: cargoCount || 1 } : {}, traveling && progress < 1 && canWalk('runner'), 'runner');
      }
      if (state.upgrades.materials && state.materials) {
        const { phase, progress, to, cargo } = state.materials;
        const home = { u: ground.u - 21, v: ground.v - 9 };
        const drop = STATIONS[to] ? padPoints(STATIONS[to], 'input') : home;
        const delivering = phase === 'deliver';
        const ratio = delivering ? progress : phase === 'return' ? 1 - progress : 0;
        const worker = helperPosition(home, drop, ratio, Math.sign(drop.u - home.u) * (delivering ? 1 : -1) || 1);
        addWorker(worker, { data: cargo }, phase !== 'wait' && progress < 1 && canWalk('materials'), 'materials');
      }
      if (state.upgrades.clerk && state.clerk) {
        const { phase, progress, cargo } = state.clerk;
        const desk = { u: grant.u + 62, v: grant.v - 8 };
        const pickup = { u: grant.u + 13, v: grant.v + 1 };
        const collecting = phase === 'collect';
        const ratio = collecting ? progress : phase === 'return' ? 1 - progress : 0;
        const clerk = helperPosition(desk, pickup, ratio, collecting ? -1 : 1);
        addWorker(clerk, cargo > 0 ? { cash: 1 } : {}, phase !== 'wait' && progress < 1 && canWalk('clerk'), 'clerk');
      }
      if (state.customers) {
        const officer = { u: STATIONS.grant.u + 39, v: STATIONS.grant.v + 5, facing: -1 };
        if (!addWorker(officer, {}, false, 'officer')) return;
        const p = point(officer.u, officer.v);
        drawables.push({ y: p.y + 1, draw: () => {
          round(ctx, p.x - 12, p.y - 12, 25, 17, 3, '#70a66c', '#406b56', 1.5);
          polygon(ctx, [[p.x - 14, p.y - 12], [p.x + 13, p.y - 12], [p.x + 20, p.y - 19], [p.x - 7, p.y - 19]], '#c7e9a0', '#406b56', 1.3);
          round(ctx, p.x - 8, p.y - 18, 12, 5, 1.5, '#426d75', '#ddedae', 0.8);
        } });
      }
    }

    drawEffects(dt) {
      const ctx = this.ctx;
      for (const particle of this.puff) {
        const progress = particle.age / particle.life;
        ctx.globalAlpha = Math.max(0, Math.min(0.9, (1 - progress) * 1.15));
        oval(ctx, particle.x + particle.age * particle.vx, particle.y + particle.age * particle.vy - progress * 7, particle.size * (1 + progress * 1.65), particle.size * (0.7 + progress), particle.color);
      }
      ctx.globalAlpha = 1;
      for (const transfer of this.transfers) {
        if (transfer.age < 0) continue;
        const progress = clamp(transfer.age / TRANSFER_TIME, 0, 1);
        const x = transfer.from.x + (transfer.to.x - transfer.from.x) * progress;
        const y = transfer.from.y + (transfer.to.y - transfer.from.y) * progress - (transfer.deposit ? 30 * (1 - progress) : 42 * progress) - Math.sin(progress * Math.PI) * 26;
        ctx.globalAlpha = 1 - Math.max(0, (progress - 0.75) * 2);
        drawItem(ctx, x, y, transfer.item, 0.88);
      }
      ctx.globalAlpha = 1;
      for (const particle of this.puff) particle.age += dt;
      for (const transfer of this.transfers) transfer.age += dt;
      this.puff = this.puff.filter(particle => particle.age < particle.life);
      this.transfers = this.transfers.filter(transfer => transfer.age < TRANSFER_TIME);
    }

    frame(state, dt = 0) {
      this.state = state;
      this.time += dt;
      this.launchTime = Math.max(0, this.launchTime - dt);
      let moving = false;
      if (!this.paused) {
        moving = this.updateMotion(state, dt);
        this.detectNearby(dt);
        if (this.target && distance(this.target, this.player) < 0.01) this.target = null;
      }
      this.paintElapsed += dt;
      if (this.view && this.time + 1e-7 < this.nextPaint) return;
      this.nextPaint = Math.max(this.time, this.nextPaint + PAINT_INTERVAL);
      this.drawWorld(state, this.paintElapsed, moving);
      this.paintElapsed = 0;
    }
  }

  SpaceportYard.stations = STATIONS;
  window.SpaceportYard = SpaceportYard;
})();
