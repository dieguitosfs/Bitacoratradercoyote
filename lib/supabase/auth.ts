import 'server-only';
import { createClient } from '@/lib/supabase/server';

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('AUTH_REQUIRED');
    this.name = 'AuthenticationRequiredError';
  }
}

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new AuthenticationRequiredError();
  }

  return { supabase, user: data.user };
}
