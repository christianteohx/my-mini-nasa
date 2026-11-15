const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
test('UI and canvas use vector icons, not font-dependent emoji glyphs', () => {
  for (const file of ['index.html','app.js','stations.js','yard.js']) {
    assert.doesNotMatch(read(file), /[\u{1F000}-\u{1FAFF}\uFE0F↗↩↑↓↟▲▶◆◉⌘⚙✦★☆♟✚✪▤▦◈◒✓✕]/u, file);
  }
});
test('icon module loads before every consumer and is included in static build', () => {
  const html=read('index.html');
  for (const file of ['app.js','stations.js','yard.js']) assert.ok(html.indexOf('icons.js?') < html.indexOf(file+'?'));
  assert.match(read('scripts/build.mjs'), /html\|css\|js/);
});
test('SVG icons are decorative, use currentColor, and never render undefined paths', () => {
  const context={window:{}}; vm.runInNewContext(read('icons.js'),context);
  for(const name of ['arrow','right','up','down','return','star','check','close','plus','minus','cube','fuel','part','paper','crew','bag','menu','play','orbit','map','settings']) {
    const svg=context.window.NasaIcons.svg(name);
    assert.match(svg, /aria-hidden="true"/);assert.match(svg, /focusable="false"/);assert.match(svg,/currentColor/);assert.doesNotMatch(svg,/undefined/);
  }
});
