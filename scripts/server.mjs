import { createServer } from 'node:http';
import { readFileSync, chmodSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import nextEnv from '@next/env';
import next from 'next';
import { openStore } from '../server/store.mjs';
import { createApi } from '../server/api.mjs';

nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
const dev = args.includes('--dev');
const portFlag = args.indexOf('--port');
const port = Number(portFlag >= 0 ? args[portFlag + 1] : process.env.PORT ?? 3100);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const hostname = process.env.HOST ?? '127.0.0.1';
const origin = process.env.APP_ORIGIN ?? `http://127.0.0.1:${port}`;
const parsedOrigin = new URL(origin);
if (parsedOrigin.origin !== origin || parsedOrigin.username || parsedOrigin.password) throw new Error('APP_ORIGIN must be an exact origin without path');
if (parsedOrigin.protocol !== 'https:' && !(parsedOrigin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname))) throw new Error('Public APP_ORIGIN must use HTTPS');
if (hostname !== '127.0.0.1' && !process.env.APP_ORIGIN) throw new Error('APP_ORIGIN is required for a public listener');
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
if (basePath && !/^\/[\w.-]+$/.test(basePath)) throw new Error('Invalid basePath');
const dataPath = resolve(process.env.DATABASE_PATH ?? '.data/creeps.sqlite');
const store = openStore(dataPath);
if (existsSync(dataPath)) chmodSync(dataPath, 0o600);
const { products } = JSON.parse(readFileSync(new URL('../src/data/catalog-snapshot.json', import.meta.url), 'utf8'));
const api = createApi({ store, origin, basePath, products });
const app = next({ dev, hostname, port });
await app.prepare();
const nextHandler = app.getRequestHandler();
const server = createServer(async (request, response) => {
  try { if (!await api(request, response)) await nextHandler(request, response); }
  catch { if (!response.headersSent) response.writeHead(500); response.end('Request failed'); }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(port, hostname, () => console.log(`Creeps: ${origin}${basePath} (UI + API)`));
store.cleanup();
const cleanup = setInterval(() => store.cleanup(), 60000).unref();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  clearInterval(cleanup);
  server.close(async () => { store.close(); await app.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 5000).unref();
});
