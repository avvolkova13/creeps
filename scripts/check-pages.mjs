import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import snapshot from '../src/data/catalog-snapshot.json' with { type: 'json' };
const manifest = JSON.parse(readFileSync('out/pages-build.json', 'utf8'));
assert.equal(manifest.mode, 'server-gateway');
assert.equal(manifest.routes.length, snapshot.products.length + 3);
for (const route of manifest.routes) {
  const html = readFileSync(`out/${route}/index.html`, 'utf8');
  const destination = new URL(route, manifest.destination + '/').href;
  assert.ok(html.includes(`href="${destination}"`));
  assert.ok(html.includes(`content="0;url=${destination}"`));
  assert.ok(html.includes('location.search+location.hash'));
  assert.ok(!html.includes('/api/'));
}
assert.ok(existsSync('out/404.html'));
assert.ok(existsSync('out/.nojekyll'));
console.log(`Pages gateway verified: ${manifest.routes.length} routes. Target server connectivity is a separate deployment check.`);
