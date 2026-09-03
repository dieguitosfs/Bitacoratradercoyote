import { createTradingAccount, listTradingAccounts } from '@/lib/server/accounts';
import { errorResponse } from '@/lib/server/http';

export async function GET() {
  try {
    const accounts = await listTradingAccounts();
    return Response.json({ accounts });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const account = await createTradingAccount(body);
    return Response.json({ account }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
