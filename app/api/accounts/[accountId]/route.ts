import { getTradingAccount, updateTradingAccount } from '@/lib/server/accounts';
import { errorResponse } from '@/lib/server/http';

type Context = { params: Promise<{ accountId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { accountId } = await context.params;
    const account = await getTradingAccount(accountId);
    return Response.json({ account });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { accountId } = await context.params;
    const body = await request.json();
    const account = await updateTradingAccount(accountId, body);
    return Response.json({ account });
  } catch (error) {
    return errorResponse(error);
  }
}
