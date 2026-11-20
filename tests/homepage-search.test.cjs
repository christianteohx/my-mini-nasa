const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
test('homepage gives the game a descriptive title, canonical URL and visible intro before Start', () => {
  assert.match(html, /<title>My Mini NASA \| Free Space Mission Browser Game<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/mymininasa\.wiki\/">/);
  assert.match(html, /<meta name="description" content="[^"]*free browser game[^"]+">/);
  const intro = '<p class="splash-intro">My Mini NASA is a free browser game where you run a miniature spaceport, build payloads, and launch missions. We built it for the 2026 NASA Space Apps Challenge in Chicago.</p>';
  assert.ok(html.includes(intro));
  assert.ok(html.indexOf('id="splash-title"') < html.indexOf(intro));
  assert.ok(html.indexOf(intro) < html.indexOf('id="splash-start"'));
});
