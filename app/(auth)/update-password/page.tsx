import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { createClient } from '@/lib/supabase/server';
import { updatePasswordAction } from '../actions';

type UpdatePasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect('/login?error=El%20enlace%20de%20recuperaci%C3%B3n%20expir%C3%B3%20o%20no%20es%20v%C3%A1lido.');
  }

  const params = await searchParams;

  return (
    <AuthCard title="Nueva contraseña" description="Define una nueva contraseña para tu cuenta.">
      {params.error ? (
        <p className="mb-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {params.error}
        </p>
      ) : null}
      <form action={updatePasswordAction} className="space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          Nueva contraseña
          <input autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" name="password" required type="password" />
        </label>
        <p className="text-xs leading-5 text-slate-500">Mínimo 8 caracteres, con mayúscula, minúscula y número.</p>
        <label className="block text-sm font-medium text-slate-200">
          Confirmar contraseña
          <input autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" name="confirmPassword" required type="password" />
        </label>
        <button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300" type="submit">
          Actualizar contraseña
        </button>
      </form>
    </AuthCard>
  );
}
