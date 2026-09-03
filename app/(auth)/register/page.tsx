import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { createClient } from '@/lib/supabase/server';
import { signUpAction } from '../actions';

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    redirect('/dashboard');
  }

  const params = await searchParams;

  return (
    <AuthCard
      title="Crear cuenta"
      description="Tu cuenta queda aislada mediante Supabase Auth y Row Level Security."
      footer={
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" href="/login">
            Iniciar sesión
          </Link>
        </p>
      }
    >
      {params.error ? (
        <p className="mb-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {params.error}
        </p>
      ) : null}

      <form action={signUpAction} className="space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          Correo electrónico
          <input autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" name="email" required type="email" />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Contraseña
          <input autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" name="password" required type="password" />
        </label>
        <p className="text-xs leading-5 text-slate-500">Mínimo 8 caracteres, con mayúscula, minúscula y número.</p>
        <label className="block text-sm font-medium text-slate-200">
          Confirmar contraseña
          <input autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" name="confirmPassword" required type="password" />
        </label>
        <button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300" type="submit">
          Crear cuenta
        </button>
      </form>
    </AuthCard>
  );
}
