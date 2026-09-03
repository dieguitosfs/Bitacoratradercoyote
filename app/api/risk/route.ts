import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/server/http';
import { requireUser } from '@/lib/supabase/auth';
import { evaluateRisk, serializeRiskSnapshot } from '@/lib/risk-engine';
import { riskCalculationSchema } from '@/lib/validation/risk';

export async function POST(request: Request) {
  try {
    await requireUser();
    const json = await request.json().catch(() => null);
    const parsed = riskCalculationSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', issues: parsed.error.flatten() }, { status: 400 });
    }

    const evaluation = evaluateRisk(parsed.data.balance);
    if (!evaluation.ok) {
      return NextResponse.json({ error: evaluation.reason }, { status: 400 });
    }

    return NextResponse.json({ data: serializeRiskSnapshot(evaluation.value) });
  } catch (error) {
    return errorResponse(error);
  }
}
