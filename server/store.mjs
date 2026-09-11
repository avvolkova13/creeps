import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function openStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (steam_id TEXT PRIMARY KEY, trade_url TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, steam_id TEXT REFERENCES users(steam_id), expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS cart (owner TEXT NOT NULL, product_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(owner, product_id));
    CREATE TABLE IF NOT EXISTS auth_states (id TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, session_id TEXT, next_path TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, steam_id TEXT NOT NULL REFERENCES users(steam_id), amount_minor INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('credit','debit')), created_at INTEGER NOT NULL, provider_reference TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, steam_id TEXT NOT NULL REFERENCES users(steam_id), status TEXT NOT NULL, items_json TEXT NOT NULL, created_at INTEGER NOT NULL);
  `);
  const store = {
    db,
    close: () => db.close(),
    session(raw) {
      if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
      return db.prepare('SELECT * FROM sessions WHERE id=? AND expires_at>?').get(hash(raw), Date.now()) ?? null;
    },
    createSession(steamId = null) {
      const raw = token();
      const id = hash(raw);
      db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(id, steamId, Date.now() + SESSION_MS);
      return { raw, id, steam_id: steamId };
    },
    owner: (session) => session.steam_id ? `user:${session.steam_id}` : `guest:${session.id}`,
    login(steamId, previous) {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('INSERT OR IGNORE INTO users (steam_id,created_at) VALUES (?,?)').run(steamId, Date.now());
        const session = store.createSession(steamId);
        if (previous) {
          if (!previous.steam_id) {
            db.prepare('INSERT OR IGNORE INTO cart SELECT ?,product_id,created_at FROM cart WHERE owner=?').run(store.owner(session), store.owner(previous));
            db.prepare('DELETE FROM cart WHERE owner=?').run(store.owner(previous));
          }
          db.prepare('DELETE FROM sessions WHERE id=?').run(previous.id);
        }
        db.exec('COMMIT');
        return session;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    logout(session) { db.prepare('DELETE FROM sessions WHERE id=?').run(session.id); },
    cart(session) { return db.prepare('SELECT product_id FROM cart WHERE owner=? ORDER BY created_at,product_id').all(store.owner(session)).map(row => row.product_id); },
    add(session, productId) { db.prepare('INSERT OR IGNORE INTO cart VALUES (?,?,?)').run(store.owner(session), productId, Date.now()); },
    remove(session, productId) { db.prepare('DELETE FROM cart WHERE owner=? AND product_id=?').run(store.owner(session), productId); },
    history(steamId, kind, cursor = null, limit = 50) {
      const table = kind === 'operations' ? 'operations' : 'orders';
      const after = cursor ? ' AND (created_at < ? OR (created_at = ? AND id < ?))' : '';
      const params = cursor ? [steamId, cursor.createdAt, cursor.createdAt, cursor.id, limit + 1] : [steamId, limit + 1];
      const rows = db.prepare(`SELECT * FROM ${table} WHERE steam_id=?${after} ORDER BY created_at DESC,id DESC LIMIT ?`).all(...params);
      const page = rows.slice(0, limit);
      const last = page.at(-1);
      const items = page.map(row => kind === 'operations'
        ? { id: row.id, amountCreeps: row.amount_minor / 100, kind: row.kind, createdAt: row.created_at }
        : { id: row.id, status: row.status, items: JSON.parse(row.items_json), createdAt: row.created_at });
      return { items, nextCursor: rows.length > limit && last ? { createdAt: last.created_at, id: last.id } : null };
    },
    account(steamId) {
      const user = db.prepare('SELECT steam_id,trade_url FROM users WHERE steam_id=?').get(steamId);
      const operations = store.history(steamId, 'operations');
      const orders = store.history(steamId, 'orders');
      const balance = db.prepare('SELECT COALESCE(SUM(amount_minor),0) AS amount FROM operations WHERE steam_id=?').get(steamId).amount;
      return { steamId: user.steam_id, tradeUrl: user.trade_url, balanceCreeps: balance / 100, operations: operations.items, orders: orders.items, operationCursor: operations.nextCursor, orderCursor: orders.nextCursor };
    },
    saveTradeUrl(steamId, url) { db.prepare('UPDATE users SET trade_url=? WHERE steam_id=?').run(url, steamId); },
    cleanup() {
      const now = Date.now();
      db.prepare("DELETE FROM cart WHERE owner LIKE 'guest:%' AND substr(owner,7) IN (SELECT id FROM sessions WHERE expires_at<=?)").run(now);
      for (const table of ['sessions', 'auth_states', 'nonces']) db.prepare(`DELETE FROM ${table} WHERE expires_at<=?`).run(now);
    },
  };
  return store;
}
