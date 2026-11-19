const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('homepage advertises a crawlable, square PNG favicon that ships in the static build', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const link = html.match(/<link\b[^>]*rel="icon"[^>]*>/);
  assert.ok(link, 'homepage must declare its favicon');
  assert.match(link[0], /type="image\/png"/);
  assert.match(link[0], /sizes="96x96"/);
  assert.match(link[0], /href="\/assets\/favicon\.png"/);
  const png = fs.readFileSync(path.join(root, 'assets/favicon.png'));
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), 96);
  assert.equal(png.readUInt32BE(20), 96);
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root });
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist/assets/favicon.png')), png);
  assert.equal(fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'), html);
});
