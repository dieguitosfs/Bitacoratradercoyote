import { Decimal } from '@/lib/decimal';
import { getRiskAmountDecimal, getRiskPercentageDecimal } from '@/lib/risk-engine';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const TRADING_TIME_ZONE = 'America/Bogota';

export type TradeOutcome = 'OPEN' | 'WON' | 'LOST' | 'BREAK_EVEN' | 'CANCELLED' | 'STUDY';

export interface DailyTradeLike {
  status: TradeOutcome;
  isStudy?: boolean;
}

export interface InstrumentContract {
  tickSize?: Decimal.Value | null;
  tickValue?: Decimal.Value | null;
  contractSize?: Decimal.Value | null;
  lotStep?: Decimal.Value | null;
  minimumLot?: Decimal.Value | null;
  maximumLot?: Decimal.Value | null;
}

export function getRiskPercentage(balanceInput: Decimal.Value): Decimal {
  return getRiskPercentageDecimal(balanceInput);
}

export const calculateRiskPercentage = getRiskPercentage;

export function getRiskAmount(balanceInput: Decimal.Value): Decimal {
  return getRiskAmountDecimal(balanceInput);
}

export const calculateRiskAmount = getRiskAmount;

export function canTradeToday(date: Date): boolean {
  const day = Number(formatInTimeZone(date, TRADING_TIME_ZONE, 'i'));
  return day !== 7;
}

export function canTradeAtTime(date: Date): boolean {
  const zoned = toZonedTime(date, TRADING_TIME_ZONE);
  const isoDay = Number(formatInTimeZone(zoned, TRADING_TIME_ZONE, 'i'));
  if (isoDay === 7) return false;
  if (isoDay === 6) {
    const hour = Number(formatInTimeZone(zoned, TRADING_TIME_ZONE, 'H'));
    return hour < 12;
  }
  return true;
}

export function getDailyTradeStatus(trades: DailyTradeLike[]) {
  const realTrades = trades.filter((trade) => !trade.isStudy && trade.status !== 'STUDY' && trade.status !== 'CANCELLED');
  const wins = realTrades.filter((trade) => trade.status === 'WON').length;
  const losses = realTrades.filter((trade) => trade.status === 'LOST').length;
  const count = realTrades.length;

  let blocked = false;
  let reason: string | null = null;

  if (wins >= 2) {
    blocked = true;
    reason = 'DAILY_TWO_WINS';
  } else if (losses >= 2) {
    blocked = true;
    reason = 'DAILY_TWO_LOSSES';
  } else if (count >= 3) {
    blocked = true;
    reason = 'DAILY_THREE_TRADES';
  }

  return { count, wins, losses, blocked, reason, remaining: Math.max(0, 3 - count) };
}

export function canOpenAnotherTrade(trades: DailyTradeLike[]): boolean {
  return !getDailyTradeStatus(trades).blocked;
}

export function calculateRR(stopDistance: Decimal.Value, takeProfitDistance: Decimal.Value): Decimal {
  const stop = new Decimal(stopDistance);
  const tp = new Decimal(takeProfitDistance);
  if (stop.lte(0) || tp.lt(0)) throw new Error('Distances must be valid');
  return tp.div(stop);
}

export function calculateTakeProfit(
  entryInput: Decimal.Value,
  stopDistanceInput: Decimal.Value,
  ratioInput: Decimal.Value,
  direction: 'BUY' | 'SELL'
): Decimal {
  const entry = new Decimal(entryInput);
  const stopDistance = new Decimal(stopDistanceInput);
  const ratio = new Decimal(ratioInput);
  const tpDistance = stopDistance.mul(ratio);
  return direction === 'BUY' ? entry.add(tpDistance) : entry.sub(tpDistance);
}

export function floorToStep(valueInput: Decimal.Value, stepInput: Decimal.Value): Decimal {
  const value = new Decimal(valueInput);
  const step = new Decimal(stepInput);
  if (step.lte(0)) throw new Error('lotStep must be greater than zero');
  return value.div(step).floor().mul(step);
}

export function calculateLotSize(params: {
  riskAmount: Decimal.Value;
  stopDistance: Decimal.Value;
  instrument: InstrumentContract;
}) {
  const { riskAmount, stopDistance, instrument } = params;
  if (!instrument.tickSize || !instrument.tickValue || !instrument.lotStep) {
    return { ok: false as const, reason: 'MISSING_CONTRACT_DATA' as const };
  }

  const tickSize = new Decimal(instrument.tickSize);
  const tickValue = new Decimal(instrument.tickValue);
  const stop = new Decimal(stopDistance);
  const risk = new Decimal(riskAmount);
  const lotStep = new Decimal(instrument.lotStep);

  if (tickSize.lte(0) || tickValue.lte(0) || stop.lte(0) || risk.lte(0)) {
    return { ok: false as const, reason: 'INVALID_INPUT' as const };
  }

  const riskPerLot = stop.div(tickSize).mul(tickValue);
  const rawLot = risk.div(riskPerLot);
  let lot = floorToStep(rawLot, lotStep);

  if (instrument.maximumLot) lot = Decimal.min(lot, new Decimal(instrument.maximumLot));
  if (instrument.minimumLot && lot.lt(instrument.minimumLot)) {
    return { ok: false as const, reason: 'BELOW_MINIMUM_LOT' as const, rawLot, minimumLot: new Decimal(instrument.minimumLot) };
  }

  const realRisk = riskPerLot.mul(lot);
  return { ok: true as const, lot, rawLot, riskPerLot, realRisk };
}

export function calculateMonthlyGrowth(startBalance: Decimal.Value, currentBalance: Decimal.Value): Decimal {
  const start = new Decimal(startBalance);
  if (start.lte(0)) throw new Error('Start balance must be greater than zero');
  return new Decimal(currentBalance).sub(start).div(start).mul(100);
}

export function calculateProfitFactor(grossProfit: Decimal.Value, grossLossAbs: Decimal.Value): Decimal | null {
  const loss = new Decimal(grossLossAbs);
  if (loss.isZero()) return null;
  return new Decimal(grossProfit).div(loss);
}

export function calculateDrawdown(peak: Decimal.Value, trough: Decimal.Value): Decimal {
  const p = new Decimal(peak);
  if (p.lte(0)) return new Decimal(0);
  return p.sub(trough).div(p).mul(100);
}
