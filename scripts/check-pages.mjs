import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import snapshot from '../src/data/catalog-snapshot.json' with { type: 'json' };
const manifest = JSON.parse(readFileSync('out/pages-build.json', 'utf8'));
if (manifest.mode === 'visual-preview') {
  assert.equal(manifest.routes.length, snapshot.products.length + 5);
  for (const route of manifest.routes) {
    const html = readFileSync(`out/${route}/index.html`, 'utf8');
    assert.ok(!/Версия для показа|Предпросмотр кабинета|без реальных оплат|заглушка|демонстрационн/i.test(html), route);
    assert.ok(html.includes('<h1'), route);
    assert.ok(!/href="[^" ]*\/api\//.test(html), route);
    for (const match of html.replace(/<link\b[^>]*rel="preconnect"[^>]*>/g, '').matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
      const url = match[1].replaceAll('&amp;', '&');
      if (!url.startsWith('/')) continue;
      assert.ok(!manifest.basePath || url.startsWith(manifest.basePath + '/'), url);
      const local = 'out' + url.slice(manifest.basePath.length);
      assert.ok(existsSync(local) || existsSync(local + '/index.html'), `${route}: ${url}`);
    }
  }
  for (const product of snapshot.products) assert.ok(existsSync('out' + product.imageUrl), product.id);
  assert.ok(existsSync('out/.nojekyll'));
  console.log(`Pages presentation verified: ${manifest.routes.length} routes and ${snapshot.products.length} product images`);
  process.exit(0);
}
assert.equal(manifest.mode, 'server-gateway');
assert.equal(manifest.routes.length, snapshot.products.length + 5);
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
