import { cartQuote, parsePaymentMinor, paymentAmountError, steamTopupQuote } from '../src/lib/money.ts';
import { hash, token } from './store.mjs';
import { ApiError, lookupSteamProfile, steamLoginUrl, validateTradeUrl, verifySteamAssertion } from './steam.mjs';

const cookieValue = (request, name) => (request.headers.cookie ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1);
async function readJson(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'Ожидается JSON.');
  let body = '';
  for await (const chunk of request) {
    body += chunk.toString();
    if (Buffer.byteLength(body) > 4096) throw new ApiError(413, 'Запрос слишком большой.');
  }
  let parsed; try { parsed = JSON.parse(body); } catch { throw new ApiError(400, 'Некорректный запрос.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ApiError(400, 'Некорректный запрос.');
  return parsed;
}
function amount(value) {
  const minor = parsePaymentMinor(value);
  if (minor === null) throw new ApiError(400, paymentAmountError);
  return minor;
}
export function createApi({ store, origin, basePath = '', products, fetcher = fetch }) {
  const secure = origin.startsWith('https:');
  const sessionName = secure ? '__Host-creeps_session' : 'creeps_session';
  const browserName = secure ? '__Host-creeps_login' : 'creeps_login';
  const prefix = `${basePath}/api`;
  const limits = new Map();
  function cookie(name, value, age) { return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure ? '; Secure' : ''}`; }
  function json(response, data, status = 200) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(data)); }
  function redirect(response, path) { response.writeHead(303, { Location: path }); response.end(); }
  function session(request, response, create = false) {
    let current = store.session(cookieValue(request, sessionName));
    if (!current && create) { current = store.createSession(); response.setHeader('Set-Cookie', cookie(sessionName, current.raw, 604800)); }
    if (!current) throw new ApiError(401, 'Обновите страницу и повторите действие.', 'SESSION_REQUIRED');
    return current;
  }
  function authenticated(current) {
    if (!current.steam_id) throw new ApiError(401, 'Войдите через Steam, чтобы продолжить.', 'LOGIN_REQUIRED');
    return current.steam_id;
  }
  function cart(current) {
    const selected = store.cart(current).map(id => products.find(product => product.id === id)).filter(Boolean);
    // Ignore any client-supplied price, quantity, source URL or currency.
    return { items: selected, ...cartQuote(selected.map(product => product.priceCreeps)) };
  }
  return async function handle(request, response) {
    const url = new URL(request.url, origin);
    if (!url.pathname.startsWith(`${prefix}/`)) return false;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const route = url.pathname.slice(prefix.length);
    try {
      const now = Date.now();
      if (limits.size > 2000) for (const [key, bucket] of limits) if (bucket.until < now) limits.delete(key);
      const expensive = ['/auth/steam', '/steam/check'].includes(route);
      const key = `${request.socket.remoteAddress}:${expensive ? route : 'api'}`;
      const bucket = limits.get(key);
      if (bucket?.until > now) { if (++bucket.count > (expensive ? 15 : 180)) throw new ApiError(429, 'Слишком много запросов. Повторите через минуту.'); }
      else {
        if (limits.size > 10000) throw new ApiError(503, 'Сервис занят. Повторите запрос.');
        limits.set(key, { count: 1, until: now + 60000 });
      }
      if (!['GET', 'POST', 'DELETE', 'PUT'].includes(request.method)) throw new ApiError(405, 'Метод не поддерживается.');
      if (request.method !== 'GET' && (request.headers.origin !== origin || request.headers['x-creeps-request'] !== '1')) throw new ApiError(403, 'Запрос отклонён. Обновите страницу.', 'CSRF');
      if (route === '/health' && request.method === 'GET') { json(response, { ok: true }); return true; }
      if (route === '/auth/steam' && request.method === 'GET') {
        if (request.headers['sec-fetch-site'] === 'cross-site') throw new ApiError(403, 'Начните вход на сайте Creeps.');
        const current = session(request, response, true);
        const state = token(); const browser = token();
        const next = url.searchParams.get('next') === 'cart' ? '/account#cart' : '/account';
        store.db.prepare('INSERT INTO auth_states VALUES (?,?,?,?,?)').run(hash(state), hash(browser), current.id, next, now + 600000);
        const cookies = response.getHeader('Set-Cookie');
        response.setHeader('Set-Cookie', [...(cookies ? [cookies] : []), cookie(browserName, browser, 600)]);
        redirect(response, steamLoginUrl(`${origin}${prefix}/auth/callback?state=${state}`, `${origin}/`)); return true;
      }
      if (route === '/auth/callback' && request.method === 'GET') {
        const state = url.searchParams.get('state') ?? '';
        const browser = cookieValue(request, browserName) ?? '';
        const pending = store.db.prepare('SELECT * FROM auth_states WHERE id=? AND browser_hash=? AND expires_at>?').get(hash(state), hash(browser), now);
        const current = store.session(cookieValue(request, sessionName));
        if (!pending || !current || current.id !== pending.session_id) throw new ApiError(400, 'Ссылка входа истекла. Повторите вход со страницы Creeps.');
        store.db.prepare('DELETE FROM auth_states WHERE id=?').run(hash(state));
        response.setHeader('Set-Cookie', cookie(browserName, '', 0));
        if (url.searchParams.get('openid.mode') === 'cancel') { redirect(response, `${basePath}/account?auth=cancelled`); return true; }
        const assertion = await verifySteamAssertion(url.searchParams, `${origin}${prefix}/auth/callback?state=${state}`, fetcher);
        if (!store.db.prepare('SELECT id FROM sessions WHERE id=? AND expires_at>?').get(current.id, Date.now())) throw new ApiError(400, 'Сессия входа завершена. Повторите вход.');
        if (store.db.prepare('SELECT nonce FROM nonces WHERE nonce=?').get(assertion.nonce)) throw new ApiError(400, 'Этот ответ Steam уже использован. Повторите вход.');
        store.db.prepare('INSERT INTO nonces VALUES (?,?)').run(assertion.nonce, now + 600000);
        const loggedIn = store.login(assertion.steamId, current);
        response.setHeader('Set-Cookie', [cookie(sessionName, loggedIn.raw, 604800), cookie(browserName, '', 0)]);
        redirect(response, `${basePath}${pending.next_path}`); return true;
      }
      if (route === '/session' && request.method === 'GET') {
        const current = session(request, response, true);
        json(response, { user: current.steam_id ? store.account(current.steam_id) : null, cart: cart(current) }); return true;
      }
      const current = session(request, response);
      if (route === '/auth/logout' && request.method === 'POST') {
        store.logout(current); response.setHeader('Set-Cookie', cookie(sessionName, '', 0)); json(response, { ok: true }); return true;
      }
      if (route === '/account/history' && request.method === 'GET') {
        const steamId = authenticated(current);
        const kind = url.searchParams.get('kind');
        if (!['operations', 'orders'].includes(kind)) throw new ApiError(400, 'Неизвестная история.');
        let cursor = null;
        const raw = url.searchParams.get('cursor');
        if (raw) {
          try { if (raw.length > 512) throw new Error(); cursor = JSON.parse(raw); }
          catch { throw new ApiError(400, 'Некорректная страница истории.'); }
          if (!cursor || !Number.isSafeInteger(cursor.createdAt) || cursor.createdAt < 0 || typeof cursor.id !== 'string' || !cursor.id.length || cursor.id.length > 128) throw new ApiError(400, 'Некорректная страница истории.');
        }
        json(response, store.history(steamId, kind, cursor)); return true;
      }
      if (route === '/account/trade-url' && request.method === 'PUT') {
        const steamId = authenticated(current); const body = await readJson(request);
        const tradeUrl = validateTradeUrl(body.tradeUrl, steamId);
        store.saveTradeUrl(steamId, tradeUrl); json(response, { tradeUrl }); return true;
      }
      if (route === '/cart' && request.method === 'GET') { json(response, cart(current)); return true; }
      if (route === '/cart/items' && ['POST', 'DELETE'].includes(request.method)) {
        const body = await readJson(request);
        if (typeof body.productId !== 'string' || !products.some(product => product.id === body.productId)) throw new ApiError(404, 'Товар не найден.');
        if (request.method === 'POST') {
          if (store.cart(current).length >= 100) throw new ApiError(400, 'В корзине можно сохранить до 100 товаров.');
          store.add(current, body.productId);
        } else store.remove(current, body.productId);
        json(response, cart(current)); return true;
      }
      if (route === '/checkout' && request.method === 'POST') {
        const steamId = authenticated(current);
        if (!cart(current).items.length) throw new ApiError(400, 'Сначала добавьте товары в корзину.');
        if (!store.account(steamId).tradeUrl) throw new ApiError(400, 'Сохраните trade-URL в личном кабинете.', 'TRADE_URL_REQUIRED');
        // No purchase, debit or provider call until real stock/reservation/payment contracts exist.
        throw new ApiError(409, 'Для оформления заказа ещё требуется подключение поставщика скинов и оплаты. Товары сохранены в корзине; деньги не списаны.', 'VENDOR_REQUIRED');
      }
      if (route === '/steam/check' && request.method === 'POST') {
        const body = await readJson(request);
        json(response, await lookupSteamProfile(body.steamId, fetcher)); return true;
      }
      if (route === '/topups/balance' && request.method === 'POST') {
        authenticated(current); const body = await readJson(request); amount(body.amount);
        throw new ApiError(409, 'Платёжный провайдер ещё не подключён. Платёж не создан, деньги не списаны.', 'PAYMENT_PROVIDER_REQUIRED');
      }
      if (route === '/topups/steam/quote' && request.method === 'POST') {
        const body = await readJson(request);
        json(response, steamTopupQuote(amount(body.amount))); return true;
      }
      if (route === '/topups/steam' && request.method === 'POST') {
        const body = await readJson(request);
        // The server owns the amount credited, 5% commission and total. Ignore client totals.
        steamTopupQuote(amount(body.amount));
        await lookupSteamProfile(body.steamId, fetcher);
        // Direct Steam top-up intentionally never touches the cart or Creeps balance.
        throw new ApiError(409, 'Аккаунт проверен. Для оплаты ещё требуется подключение сервиса пополнения Steam. Деньги не списаны.', 'STEAM_PROVIDER_REQUIRED');
      }
      throw new ApiError(404, 'Адрес не найден.');
    } catch (error) {
      if (route === '/auth/callback') { redirect(response, `${basePath}/account?auth=failed`); }
      else json(response, { error: error instanceof ApiError ? error.message : 'Не удалось обработать запрос. Повторите попытку.', code: error instanceof ApiError ? error.code : 'SERVER_ERROR' }, error instanceof ApiError ? error.status : 500);
      return true;
    }
  };
}
