import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeNextPath(requestUrl.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Enlace%20de%20autenticaci%C3%B3n%20inv%C3%A1lido.', requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=No%20fue%20posible%20validar%20el%20enlace.', requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
