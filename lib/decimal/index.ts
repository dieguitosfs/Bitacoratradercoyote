import Decimal from 'decimal.js';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_DOWN
});

export { Decimal };

export function money(value: Decimal.Value): Decimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
