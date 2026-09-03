import { createTrade } from '@/lib/server/trades';
import { errorResponse } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const trade = await createTrade(body);
    return Response.json({ trade }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
