/** Confirmed public values only. Never place provider credentials here. */
export const projectConfig = Object.freeze({
  siteName: "Creeps",
  currencyName: "Creeps",
  rublesPerCreep: 1.7,
  steamTopupFeePercent: 5,
  supportEmail: "support@shop-skin.com",
  paymentMethods: Object.freeze([
    { id: "bank-card", label: "Банковская карта" },
    { id: "sbp", label: "СБП" },
  ] as const),
});
