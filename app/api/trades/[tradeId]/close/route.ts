import { z } from 'zod';
import { closeTrade } from '@/lib/server/trades';
import { errorResponse } from '@/lib/server/http';

const paramsSchema = z.object({ tradeId: z.string().uuid() });

export async function POST(request: Request, context: { params: Promise<{ tradeId: string }> }) {
  try {
    const { tradeId } = paramsSchema.parse(await context.params);
    const body = await request.json();
    const trade = await closeTrade(tradeId, body);
    return Response.json({ trade });
  } catch (error) {
    return errorResponse(error);
  }
}
