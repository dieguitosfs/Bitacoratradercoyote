import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { forgotPasswordAction } from '../actions';

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Te enviaremos un enlace de recuperación si el correo está asociado a una cuenta."
      footer={
        <Link className="font-medium text-cyan-300 hover:text-cyan-200" href="/login">
          Volver al inicio de sesión
        </Link>
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

      <form action={forgotPasswordAction} className="space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          Correo electrónico
          <input autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" name="email" required type="email" />
        </label>
        <button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300" type="submit">
          Enviar instrucciones
        </button>
      </form>
    </AuthCard>
  );
}
