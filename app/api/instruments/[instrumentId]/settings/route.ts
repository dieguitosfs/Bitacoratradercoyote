import { errorResponse } from '@/lib/server/http';
import { resetInstrumentSettings, saveInstrumentSettings } from '@/lib/server/instruments';

type Context = { params: Promise<{ instrumentId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const { instrumentId } = await params;
    const body = await request.json();
    const settings = await saveInstrumentSettings(instrumentId, body);
    return Response.json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { instrumentId } = await params;
    const reset = await resetInstrumentSettings(instrumentId);
    return Response.json({ reset });
  } catch (error) {
    return errorResponse(error);
  }
}
