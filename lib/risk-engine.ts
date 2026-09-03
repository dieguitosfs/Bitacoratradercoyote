import { Decimal } from '@/lib/decimal';

export const RISK_BANDS = [
  { min: '0', max: '500', percentage: '4' },
  { min: '500', max: '1000', percentage: '3' },
  { min: '1000', max: '5000', percentage: '2' },
  { min: '5000', max: null, percentage: '1' }
] as const;

export type RiskBandCode = 'RISK_4' | 'RISK_3' | 'RISK_2' | 'RISK_1';

export type RiskSnapshot = {
  balance: Decimal;
  percentage: Decimal;
  riskAmount: Decimal;
  band: RiskBandCode;
};

export type RiskEvaluation =
  | { ok: true; value: RiskSnapshot }
  | { ok: false; reason: 'INVALID_BALANCE' | 'NEGATIVE_BALANCE' };

export function getRiskPercentageDecimal(balanceInput: Decimal.Value): Decimal {
  const balance = new Decimal(balanceInput);
  if (!balance.isFinite()) throw new Error('Balance must be finite');
  if (balance.isNegative()) throw new Error('Balance cannot be negative');
  if (balance.lte('500')) return new Decimal('4');
  if (balance.lte('1000')) return new Decimal('3');
  if (balance.lte('5000')) return new Decimal('2');
  return new Decimal('1');
}

export function getRiskBand(balanceInput: Decimal.Value): RiskBandCode {
  const percentage = getRiskPercentageDecimal(balanceInput);
  if (percentage.eq(4)) return 'RISK_4';
  if (percentage.eq(3)) return 'RISK_3';
  if (percentage.eq(2)) return 'RISK_2';
  return 'RISK_1';
}

export function getRiskAmountDecimal(balanceInput: Decimal.Value): Decimal {
  const balance = new Decimal(balanceInput);
  return balance.mul(getRiskPercentageDecimal(balance)).div('100');
}

export function calculateRiskSnapshot(balanceInput: Decimal.Value): RiskSnapshot {
  const balance = new Decimal(balanceInput);
  const percentage = getRiskPercentageDecimal(balance);
  return {
    balance,
    percentage,
    riskAmount: balance.mul(percentage).div('100'),
    band: getRiskBand(balance)
  };
}

export function evaluateRisk(balanceInput: unknown): RiskEvaluation {
  try {
    if (typeof balanceInput !== 'string' && typeof balanceInput !== 'number' && !(balanceInput instanceof Decimal)) {
      return { ok: false, reason: 'INVALID_BALANCE' };
    }
    const balance = new Decimal(balanceInput);
    if (!balance.isFinite()) return { ok: false, reason: 'INVALID_BALANCE' };
    if (balance.isNegative()) return { ok: false, reason: 'NEGATIVE_BALANCE' };
    return { ok: true, value: calculateRiskSnapshot(balance) };
  } catch {
    return { ok: false, reason: 'INVALID_BALANCE' };
  }
}

export function serializeRiskSnapshot(snapshot: RiskSnapshot) {
  return {
    balance: snapshot.balance.toFixed(2),
    percentage: snapshot.percentage.toString(),
    riskAmount: snapshot.riskAmount.toFixed(2),
    band: snapshot.band
  };
}
