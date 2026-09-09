import { projectConfig } from "../config/project.ts";

/** Display estimates only; do not use floating-point values for settlement. */
function assertValidAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError("Amount must be a finite, non-negative number.");
  }
}

/** Applies the agreed rate without choosing a rounding or payment policy. */
export function estimateRublesFromCreeps(amount: number): number {
  assertValidAmount(amount);
  const estimate = amount * projectConfig.rublesPerCreep;
  assertValidAmount(estimate);
  return estimate;
}

/** Returns an unrounded reference estimate, not a balance or payable amount. */
export function estimateCreepsFromRubles(amount: number): number {
  assertValidAmount(amount);
  const estimate = amount / projectConfig.rublesPerCreep;
  assertValidAmount(estimate);
  return estimate;
}

/** Precision is explicitly supplied by the caller; it is display-only. */
export function formatEstimatedAmount(
  amount: number,
  unit: "Creeps" | "RUB",
  fractionDigits: number,
): string {
  assertValidAmount(amount);

  if (
    !Number.isInteger(fractionDigits) ||
    fractionDigits < 0 ||
    fractionDigits > 100
  ) {
    throw new RangeError("Display precision must be an integer from 0 to 100.");
  }

  if (unit !== projectConfig.currencyName && unit !== "RUB") {
    throw new RangeError("Unsupported currency unit.");
  }

  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    ...(unit === "RUB" ? { style: "currency", currency: "RUB" } : {}),
  }).format(amount === 0 ? 0 : amount);

  return unit === "RUB" ? formatted : `${formatted}\u00a0${projectConfig.currencyName}`;
}
