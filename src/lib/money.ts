import { projectConfig } from '../config/project.ts';

export const paymentAmountError = 'Введите сумму от 0,01 до 9 999 999,99, не более двух знаков после запятой.';

/** Shared by the form and server. No floats are parsed into a payment amount. */
export function parsePaymentMinor(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,7}(?:[.,]\d{0,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().replace(',', '.').split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return minor > 0 ? minor : null;
}
function checkedMinor(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Invalid monetary minor units');
  return value;
}
function roundedRatio(value: number, numerator: number, denominator: number): number {
  checkedMinor(value);
  const result = Number((BigInt(value) * BigInt(numerator) * 2n + BigInt(denominator)) / (BigInt(denominator) * 2n));
  return checkedMinor(result);
}
/** Normalize imported display estimates once to 0.01 Creeps, half up. */
export function creepsToMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Invalid Creeps amount');
  // Decimal exponent shifting avoids 1.005 * 100 becoming 100.499999….
  const [mantissa, exponent = '0'] = amount.toString().split('e');
  return checkedMinor(Math.round(Number(`${mantissa}e${Number(exponent) + 2}`)));
}
export function rublesMinorFromCreepsMinor(minor: number): number {
  return roundedRatio(minor, Math.round(projectConfig.rublesPerCreep * 10), 10);
}
export function productQuote(amount: number) {
  const creepsMinor = creepsToMinor(amount);
  const rublesMinor = rublesMinorFromCreepsMinor(creepsMinor);
  return { creepsMinor, rublesMinor, creeps: creepsMinor / 100, rubles: rublesMinor / 100 };
}
export function cartQuote(amounts: readonly number[]) {
  const total = amounts.reduce((sum, amount) => {
    const quote = productQuote(amount);
    return { creepsMinor: checkedMinor(sum.creepsMinor + quote.creepsMinor), rublesMinor: checkedMinor(sum.rublesMinor + quote.rublesMinor) };
  }, { creepsMinor: 0, rublesMinor: 0 });
  return { totalCreeps: total.creepsMinor / 100, totalRubles: total.rublesMinor / 100 };
}
export function steamTopupQuote(amountMinor: number) {
  if (checkedMinor(amountMinor) === 0) throw new RangeError('Top-up amount must be positive');
  const feeMinor = roundedRatio(amountMinor, projectConfig.steamTopupFeePercent, 100);
  return { amountMinor, feeMinor, totalMinor: checkedMinor(amountMinor + feeMinor), currency: 'RUB' as const };
}
