/** Parses a user-entered display amount without applying payment rules. */
export function parseAmountInput(value: string): number | null {
  const trimmed = value.trim();

  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) {
    return null;
  }

  const amount = Number(trimmed.replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
