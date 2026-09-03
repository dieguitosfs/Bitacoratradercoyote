'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { registerMt5BalanceSchema } from '@/lib/validation/account';

type BalanceFormValues = { balance: string };

export function Mt5BalanceForm({ accountId, currentBalance }: { accountId: string; currentBalance: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<BalanceFormValues>({
    defaultValues: { balance: currentBalance }
  });

  async function submit(values: BalanceFormValues) {
    setServerError(null);
    const parsed = registerMt5BalanceSchema.safeParse(values);
    if (!parsed.success) {
      setError('balance', { message: parsed.error.issues[0]?.message ?? 'Balance inválido' });
      return;
    }

    try {
      const response = await fetch(`/api/accounts/${accountId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? result.error ?? 'No fue posible registrar el balance');
      router.refresh();
    } catch (cause) {
      setServerError(cause instanceof Error ? cause.message : 'No fue posible registrar el balance');
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
      <label className="block text-sm text-slate-300">
        Nuevo balance registrado MT5
        <input {...register('balance')} type="number" min="0" step="0.01" inputMode="decimal"
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 outline-none focus:border-cyan-500" />
      </label>
      {errors.balance && <p className="text-xs text-red-300">{errors.balance.message}</p>}
      <p className="text-xs text-slate-500">Se guardará un snapshot histórico. Este valor no modifica el balance calculado por la bitácora.</p>
      {serverError && <p className="text-sm text-red-300">{serverError}</p>}
      <button disabled={isSubmitting} className="w-full rounded-xl border border-cyan-500/50 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50">
        {isSubmitting ? 'Registrando…' : 'Registrar balance MT5'}
      </button>
    </form>
  );
}
