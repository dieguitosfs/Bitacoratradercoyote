import { Decimal } from '@/lib/decimal';
import { floorToStep } from '@/lib/trading-rules';

export type LotContract = {
  tickSize?: Decimal.Value | null;
  tickValue?: Decimal.Value | null;
  contractSize?: Decimal.Value | null;
  lotStep?: Decimal.Value | null;
  minimumLot?: Decimal.Value | null;
  maximumLot?: Decimal.Value | null;
  baseLot?: Decimal.Value | null;
};

export type LotCalculation =
  | { ok: false; reason: 'MISSING_CONTRACT_DATA' | 'INVALID_INPUT' | 'BELOW_MINIMUM_LOT' }
  | {
      ok: true;
      riskAmount: Decimal;
      stopDistance: Decimal;
      riskPerLot: Decimal;
      rawLot: Decimal;
      calculatedLot: Decimal;
      realRisk: Decimal;
      baseLot: Decimal | null;
      contractSize: Decimal | null;
    };

export function calculateRiskLot(params: {
  riskAmount: Decimal.Value;
  stopDistance: Decimal.Value;
  contract: LotContract;
}): LotCalculation {
  const { contract } = params;
  if (!contract.tickSize || !contract.tickValue || !contract.lotStep) {
    return { ok: false, reason: 'MISSING_CONTRACT_DATA' };
  }
  const riskAmount = new Decimal(params.riskAmount);
  const stopDistance = new Decimal(params.stopDistance);
  const tickSize = new Decimal(contract.tickSize);
  const tickValue = new Decimal(contract.tickValue);
  const lotStep = new Decimal(contract.lotStep);
  if ([riskAmount, stopDistance, tickSize, tickValue, lotStep].some((v) => v.lte(0))) {
    return { ok: false, reason: 'INVALID_INPUT' };
  }
  const riskPerLot = stopDistance.div(tickSize).mul(tickValue);
  if (riskPerLot.lte(0)) return { ok: false, reason: 'INVALID_INPUT' };
  const rawLot = riskAmount.div(riskPerLot);
  let calculatedLot = floorToStep(rawLot, lotStep);
  if (contract.maximumLot) calculatedLot = Decimal.min(calculatedLot, new Decimal(contract.maximumLot));
  if (contract.minimumLot && calculatedLot.lt(new Decimal(contract.minimumLot))) {
    return { ok: false, reason: 'BELOW_MINIMUM_LOT' };
  }
  const realRisk = riskPerLot.mul(calculatedLot);
  return {
    ok: true,
    riskAmount,
    stopDistance,
    riskPerLot,
    rawLot,
    calculatedLot,
    realRisk,
    baseLot: contract.baseLot ? new Decimal(contract.baseLot) : null,
    contractSize: contract.contractSize ? new Decimal(contract.contractSize) : null
  };
}

export function calculateTpFromPoints(params: {
  entryPrice: Decimal.Value;
  stopLossPoints: Decimal.Value;
  ratio: Decimal.Value;
  direction: 'BUY' | 'SELL';
}) {
  const entry = new Decimal(params.entryPrice);
  const stop = new Decimal(params.stopLossPoints);
  const ratio = new Decimal(params.ratio);
  if (entry.lte(0) || stop.lte(0) || ratio.lte(0)) throw new Error('INVALID_TP_INPUT');
  const distance = stop.mul(ratio);
  return {
    takeProfitPoints: distance,
    takeProfitPrice: params.direction === 'BUY' ? entry.add(distance) : entry.sub(distance)
  };
}
