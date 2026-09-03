import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/auth';
import { lotCalculationSchema } from '@/lib/validation/lot';
import { calculateRiskLot } from '@/lib/lot-engine';

export async function POST(request: Request) {
  await requireUser();
  const parsed = lotCalculationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  const result = calculateRiskLot({
    riskAmount: value.riskAmount,
    stopDistance: value.stopDistance,
    contract: { tickSize: value.tickSize, tickValue: value.tickValue, contractSize: value.contractSize, lotStep: value.lotStep, minimumLot: value.minimumLot, maximumLot: value.maximumLot, baseLot: value.baseLot }
  });
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  return NextResponse.json({
    ok: true,
    riskAmount: result.riskAmount.toFixed(2),
    riskPerLot: result.riskPerLot.toString(),
    rawLot: result.rawLot.toString(),
    calculatedLot: result.calculatedLot.toString(),
    realRisk: result.realRisk.toFixed(2),
    baseLot: result.baseLot?.toString() ?? null
  });
}
