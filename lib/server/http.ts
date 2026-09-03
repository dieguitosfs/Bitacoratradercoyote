import { ZodError } from 'zod';
import { AuthenticationRequiredError } from '@/lib/supabase/auth';

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json({ error: 'VALIDATION_ERROR', issues: error.issues }, { status: 400 });
  }
  if (error instanceof AuthenticationRequiredError) {
    return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  }
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  const code = message.split(':').at(-1)?.trim() ?? message;
  const planConflict = /SUNDAY_BLOCKED|SATURDAY_AFTER_NOON_BLOCKED|DAILY_|MONTHLY_|RISK_OVERRIDE_NOT_ALLOWED|BELOW_MINIMUM_LOT/.test(message);
  return Response.json({ error: code, detail: message }, { status: planConflict ? 409 : 400 });
}
