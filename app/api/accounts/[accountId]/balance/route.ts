import { registerMt5Balance } from '@/lib/server/accounts';
import { errorResponse } from '@/lib/server/http';

type Context = { params: Promise<{ accountId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { accountId } = await context.params;
    const body = await request.json();
    const account = await registerMt5Balance(accountId, body);
    return Response.json({ account });
  } catch (error) {
    return errorResponse(error);
  }
}
