const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

test('mobile HUD tracks actual header and resource heights after resizing or font loading', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const start = app.indexOf("  const hudHeader =");
  const end = app.indexOf("\n  const route =", start);
  assert.ok(start > 0 && end > start);
  const heights = {'.masthead-inner': 50, '.overview': 54};
  const nodes = Object.fromEntries(Object.keys(heights).map(selector => [selector, {
    getBoundingClientRect: () => ({height: heights[selector]})
  }]));
  const properties = {};
  const observed = [];
  let onResize;
  vm.runInNewContext(app.slice(start, end), {
    document: {
      querySelector: selector => nodes[selector],
      documentElement: {style: {setProperty: (key, value) => {properties[key] = value;}}}
    },
    ResizeObserver: class {
      constructor(callback) {onResize = callback;}
      observe(node) {observed.push(node);}
    }
  });
  assert.deepEqual(observed, Object.values(nodes));
  assert.equal(properties['--hud-header-height'], '50px');
  assert.equal(properties['--hud-resources-height'], '54px');
  heights['.masthead-inner'] = 66;
  heights['.overview'] = 72;
  onResize();
  assert.equal(properties['--hud-header-height'], '66px');
  assert.equal(properties['--hud-resources-height'], '72px');
});

test('mobile HUD row positions include measured heights and shadow clearance', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const mobile = css.slice(css.indexOf('@media (max-width: 760px)'));
  assert.match(mobile, /\.masthead-inner \{ height: auto; min-height: 38px; \}/);
  assert.match(mobile, /\.overview \{ top: calc\(var\(--hud-top\) \+ var\(--hud-header-height, 48px\) \+ 12px\)/);
  for (const selector of ['map-button', 'order-card']) {
    assert.ok(mobile.includes(`.${selector} { top: calc(var(--hud-top) + var(--hud-header-height, 48px) + var(--hud-resources-height, 52px) + 24px)`));
  }
});
