/** Successful payment APIs must return { paymentUrl }; success alone is not payment. */
export function paymentDestination(response: unknown, origin: string): string {
  const value = response && typeof response === 'object' && 'paymentUrl' in response ? response.paymentUrl : null;
  if (typeof value !== 'string' || !/^(https:\/\/|\/[^/])/.test(value)) throw new Error('Сервис не вернул ссылку на оплату. Повторите попытку.');
  let url: URL;
  try { url = new URL(value, origin); } catch { throw new Error('Сервис вернул некорректную ссылку на оплату.'); }
  const local = url.origin === origin && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) throw new Error('Сервис вернул некорректную ссылку на оплату.');
  return url.href;
}
