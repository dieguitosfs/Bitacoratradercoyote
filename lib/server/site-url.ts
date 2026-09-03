import 'server-only';
import { headers } from 'next/headers';

export async function getSiteOrigin() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const host = forwardedHost ?? headerStore.get('host');
  const forwardedProto = headerStore.get('x-forwarded-proto');
  const protocol = forwardedProto ?? (process.env.NODE_ENV === 'development' ? 'http' : 'https');

  if (!host) {
    throw new Error('SITE_ORIGIN_UNAVAILABLE');
  }

  return `${protocol}://${host}`;
}
