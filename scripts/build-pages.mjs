import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, renameSync } from 'node:fs';
import snapshot from '../src/data/catalog-snapshot.json' with { type: 'json' };

// Without a server URL, publish the explicitly requested presentation build.
const destination = process.env.CREEPS_APP_URL;
if (!destination) {
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'creeps';
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (repository.endsWith('.github.io') ? '' : `/${repository}`);
  if (basePath && !/^\/[\w.-]+$/.test(basePath)) throw new Error('Invalid Pages base path');
  rmSync('out', { recursive: true, force: true });
  const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
    stdio: 'inherit', env: { ...process.env, STATIC_EXPORT: '1', NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_SHOWCASE_PREVIEW: '1' },
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
  renameSync('.next-preview', 'out');
  const routes = ['', 'account', 'cart', 'login', 'catalog', ...snapshot.products.map(p => `catalog/${p.id}`)];
  writeFileSync('out/.nojekyll', '');
  writeFileSync('out/pages-build.json', JSON.stringify({ basePath, mode: 'visual-preview', revision: process.env.GITHUB_SHA ?? 'local', routes }));
  console.log(`Pages presentation prepared: ${routes.length} routes`);
  process.exit(0);
}
const target = new URL(destination);
if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash || target.pathname !== '/' || target.hostname.endsWith('.github.io')) throw new Error('CREEPS_APP_URL must be the HTTPS origin of the Node application, not a Pages address.');
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'creeps';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (repository.endsWith('.github.io') ? '' : `/${repository}`);
if (basePath && !/^\/[\w.-]+$/.test(basePath)) throw new Error('Invalid Pages base path');
const routes = ['', 'account', 'cart', 'login', 'catalog', ...snapshot.products.map(p => `catalog/${p.id}`)];
rmSync('out', { recursive: true, force: true });
function html(route) {
  const url = new URL(route, target).href;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${url}"><link rel="canonical" href="${url}"><title>Creeps</title></head><body><p><a href="${url}">Открыть Creeps</a></p><script>location.replace(${JSON.stringify(url)}+location.search+location.hash)</script></body></html>`;
}
for (const route of routes) { const directory = `out/${route}`; mkdirSync(directory, { recursive: true }); writeFileSync(`${directory}/index.html`, html(route)); }
writeFileSync('out/404.html', html(''));
writeFileSync('out/.nojekyll', '');
writeFileSync('out/pages-build.json', JSON.stringify({ basePath, destination: target.origin, mode: 'server-gateway', routes }));
console.log(`Pages gateway prepared: ${routes.length} routes to ${target.origin}`);
