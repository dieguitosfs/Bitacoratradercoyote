'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { BrokerOption, TradingAccountView } from '@/lib/server/accounts';
import { createTradingAccountSchema, updateTradingAccountSchema } from '@/lib/validation/account';

type Props = {
  brokers: BrokerOption[];
  account?: TradingAccountView;
};

type AccountFormValues = {
  name: string;
  brokerId: string;
  platform: string;
  currency: string;
  initialBalance?: string;
  mt5RegisteredBalance?: string;
};

export function AccountForm({ brokers, account }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<AccountFormValues>({
    defaultValues: {
      name: account?.name ?? '',
      brokerId: account?.brokerId ?? '',
      platform: account?.platform ?? 'MT5',
      currency: account?.currency ?? 'USD',
      initialBalance: '',
      mt5RegisteredBalance: ''
    }
  });

  async function submit(values: AccountFormValues) {
    setServerError(null);
    const schema = account ? updateTradingAccountSchema : createTradingAccountSchema;
    const parsed = schema.safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') setError(field as keyof AccountFormValues, { message: issue.message });
      }
      return;
    }

    try {
      const response = await fetch(account ? `/api/accounts/${account.id}` : '/api/accounts', {
        method: account ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? result.error ?? 'No fue posible guardar la cuenta');

      router.push(account ? `/accounts/${account.id}` : '/accounts');
      router.refresh();
    } catch (cause) {
      setServerError(cause instanceof Error ? cause.message : 'No fue posible guardar la cuenta');
    }
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-500';
  const errorClass = 'mt-1 block text-xs text-red-300';

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 md:p-6" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm text-slate-300">
          Nombre de la cuenta
          <input {...register('name')} className={inputClass} placeholder="Cuenta Deriv principal" />
          {errors.name && <span className={errorClass}>{errors.name.message}</span>}
        </label>

        <label className="text-sm text-slate-300">
          Broker
          <select {...register('brokerId')} className={inputClass}>
            <option value="" disabled>Selecciona un broker</option>
            {brokers.map((broker) => <option key={broker.id} value={broker.id}>{broker.displayName}</option>)}
          </select>
          {errors.brokerId && <span className={errorClass}>{errors.brokerId.message}</span>}
        </label>

        <label className="text-sm text-slate-300">
          Plataforma
          <select {...register('platform')} className={inputClass}>
            <option value="MT5">MT5</option>
            <option value="OTRA">Otra</option>
          </select>
          {errors.platform && <span className={errorClass}>{errors.platform.message}</span>}
        </label>

        <label className="text-sm text-slate-300">
          Moneda
          <input {...register('currency')} maxLength={3} className={inputClass} />
          {errors.currency && <span className={errorClass}>{errors.currency.message}</span>}
        </label>

        {!account && (
          <>
            <label className="text-sm text-slate-300">
              Balance inicial de bitácora
              <input {...register('initialBalance')} type="number" inputMode="decimal" min="0" step="0.01" className={inputClass} placeholder="200.00" />
              <span className="mt-1 block text-xs text-slate-500">Punto de partida histórico de esta cuenta.</span>
              {errors.initialBalance && <span className={errorClass}>{errors.initialBalance.message}</span>}
            </label>

            <label className="text-sm text-slate-300">
              Balance registrado MT5
              <input {...register('mt5RegisteredBalance')} type="number" inputMode="decimal" min="0" step="0.01" className={inputClass} placeholder="200.00" />
              <span className="mt-1 block text-xs text-slate-500">El saldo que realmente muestra MetaTrader 5 en este momento.</span>
              {errors.mt5RegisteredBalance && <span className={errorClass}>{errors.mt5RegisteredBalance.message}</span>}
            </label>
          </>
        )}
      </div>

      {account && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
          Los balances no se editan aquí. El balance MT5 se registra desde la ficha de la cuenta y el balance de bitácora solo cambia al cerrar operaciones.
        </div>
      )}

      {serverError && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{serverError}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">
          {isSubmitting ? 'Guardando…' : account ? 'Guardar cambios' : 'Crear cuenta'}
        </button>
      </div>
    </form>
  );
}
