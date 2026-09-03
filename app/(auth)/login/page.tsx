import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { createClient } from '@/lib/supabase/server';
import { loginAction } from '../actions';

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    redirect('/dashboard');
  }

  const params = await searchParams;

  return (
    <AuthCard
      title="Iniciar sesión"
      description="Accede a tu bitácora, reglas de riesgo y operaciones personales."
      footer={
        <p>
          ¿No tienes cuenta?{' '}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" href="/register">
            Crear cuenta
          </Link>
        </p>
      }
    >
      {params.message ? (
        <p className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {params.message}
        </p>
      ) : null}
      {params.error ? (
        <p className="mb-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {params.error}
        </p>
      ) : null}

      <form action={loginAction} className="space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          Correo electrónico
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            name="email"
            required
            type="email"
          />
        </label>

        <label className="block text-sm font-medium text-slate-200">
          Contraseña
          <input
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            name="password"
            required
            type="password"
          />
        </label>

        <div className="flex justify-end">
          <Link className="text-sm text-slate-400 hover:text-cyan-300" href="/forgot-password">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300" type="submit">
          Entrar
        </button>
      </form>
    </AuthCard>
  );
}
