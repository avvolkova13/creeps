export const STEAM_OPENID = 'https://steamcommunity.com/openid/login';
const NS = 'http://specs.openid.net/auth/2.0';
export class ApiError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED') { super(message); this.status = status; this.code = code; }
}
export function validSteamId(value) {
  return typeof value === 'string' && /^\d{17}$/.test(value) && BigInt(value) > 76561197960265728n && BigInt(value) <= 76561202255233023n;
}
export function steamLoginUrl(returnTo, realm) {
  const url = new URL(STEAM_OPENID);
  url.search = new URLSearchParams({ 'openid.ns': NS, 'openid.mode': 'checkid_setup', 'openid.return_to': returnTo, 'openid.realm': realm, 'openid.identity': `${NS}/identifier_select`, 'openid.claimed_id': `${NS}/identifier_select` }).toString();
  return url.href;
}
async function fetchText(fetcher, url, options = {}) {
  let response;
  try { response = await fetcher(url, { ...options, signal: AbortSignal.timeout(12000), redirect: 'error' }); }
  catch { throw new ApiError(502, 'Не удалось связаться со Steam. Повторите попытку.', 'STEAM_CONNECTION'); }
  if (!response.ok) throw new ApiError(502, 'Steam не ответил на запрос. Повторите попытку.', 'STEAM_CONNECTION');
  // Bound external payloads; never accept redirects or an unbounded profile document.
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 262144) { await reader.cancel(); throw new ApiError(502, 'Некорректный ответ Steam.'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
export async function verifySteamAssertion(params, returnTo, fetcher = fetch) {
  const reject = () => { throw new ApiError(400, 'Steam не подтвердил вход. Попробуйте войти ещё раз.', 'STEAM_ASSERTION'); };
  for (const key of new Set(params.keys())) if (params.getAll(key).length !== 1) reject();
  if (params.get('openid.ns') !== NS || params.get('openid.mode') !== 'id_res' || params.get('openid.op_endpoint') !== STEAM_OPENID || params.get('openid.return_to') !== returnTo) reject();
  const claimed = params.get('openid.claimed_id') ?? '';
  const match = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(claimed);
  if (!match || !validSteamId(match[1]) || params.get('openid.identity') !== claimed) reject();
  if (!params.get('openid.sig') || params.get('openid.sig').length > 2048) reject();
  const signed = new Set((params.get('openid.signed') ?? '').split(','));
  for (const field of ['op_endpoint', 'claimed_id', 'identity', 'return_to', 'response_nonce', 'assoc_handle']) if (!signed.has(field) || !params.get(`openid.${field}`)) reject();
  const nonce = params.get('openid.response_nonce') ?? '';
  const timestamp = Date.parse(nonce.slice(0, 20));
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ.+$/.test(nonce) || nonce.length > 255 || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) reject();
  const body = new URLSearchParams([...params].filter(([key]) => key.startsWith('openid.')));
  body.set('openid.mode', 'check_authentication');
  const response = await fetchText(fetcher, STEAM_OPENID, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!/^is_valid:true\r?$/m.test(response)) reject();
  return { steamId: match[1], nonce };
}
export function validateTradeUrl(value, steamId) {
  if (typeof value !== 'string' || value.length > 512) throw new ApiError(400, 'Вставьте trade-URL из настроек обмена Steam.');
  let url; try { url = new URL(value.trim()); } catch { throw new ApiError(400, 'Вставьте полный trade-URL из Steam.'); }
  const partner = url.searchParams.get('partner'); const token = url.searchParams.get('token');
  if (url.origin !== 'https://steamcommunity.com' || url.username || url.password || url.pathname !== '/tradeoffer/new/' || url.hash || !/^\d{1,10}$/.test(partner ?? '') || !/^[A-Za-z0-9_-]{8}$/.test(token ?? '') || url.searchParams.getAll('partner').length !== 1 || url.searchParams.getAll('token').length !== 1 || [...url.searchParams.keys()].some(key => !['partner', 'token'].includes(key))) throw new ApiError(400, 'Нужна ссылка вида https://steamcommunity.com/tradeoffer/new/?partner=…&token=…');
  if (BigInt(partner) !== BigInt(steamId) - 76561197960265728n) throw new ApiError(400, 'Trade-URL принадлежит другому Steam-аккаунту.');
  return `https://steamcommunity.com/tradeoffer/new/?partner=${partner}&token=${token}`;
}
export async function lookupSteamProfile(steamId, fetcher = fetch) {
  if (!validSteamId(steamId)) throw new ApiError(400, 'Введите Steam ID из 17 цифр.', 'STEAM_ID_INVALID');
  // Fixed official origin and numeric ID: input cannot turn this into an arbitrary URL fetch.
  const text = await fetchText(fetcher, `https://steamcommunity.com/profiles/${steamId}/?xml=1`);
  const actualId = /<steamID64>(\d{17})<\/steamID64>/.exec(text)?.[1];
  if (actualId !== steamId) {
    if (/<error>/.test(text) && /could not be found|does not exist/i.test(text)) throw new ApiError(404, 'Аккаунт с таким Steam ID не найден.', 'STEAM_NOT_FOUND');
    throw new ApiError(502, 'Steam не подтвердил профиль. Повторите проверку.', 'STEAM_CONNECTION');
  }
  const name = /<steamID><!\[CDATA\[([\s\S]*?)\]\]><\/steamID>/.exec(text)?.[1]?.slice(0, 100) ?? steamId;
  return { steamId, name, profileUrl: `https://steamcommunity.com/profiles/${steamId}` };
}
