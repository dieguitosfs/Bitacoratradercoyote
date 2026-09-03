import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardNav } from '@/components/layout/dashboard-nav';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) redirect('/login');

  return <><DashboardNav />{children}</>;
}
