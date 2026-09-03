'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { InstrumentView } from '@/lib/server/instruments';
import { instrumentSettingsSchema } from '@/lib/validation/instrument';

type FormValues = {
  symbol: string;
  minimumLot: string;
  lotStep: string;
  maximumLot: string;
  tickSize: string;
  tickValue: string;
  contractSize: string;
  baseLot: string;
  active: boolean;
};

export function InstrumentSettingsForm({ instrument }: { instrument: InstrumentView }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      symbol: instrument.symbol ?? '',
      minimumLot: instrument.minimumLot ?? '',
      lotStep: instrument.lotStep ?? '',
      maximumLot: instrument.maximumLot ?? '',
      tickSize: instrument.tickSize ?? '',
      tickValue: instrument.tickValue ?? '',
      contractSize: instrument.contractSize ?? '',
      baseLot: instrument.baseLot ?? '',
      active: instrument.active
    }
  });

  async function submit(values: FormValues) {
    setServerError(null);
    const parsed = instrumentSettingsSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') setError(field as keyof FormValues, { message: issue.message });
      }
      return;
    }

    try {
      const response = await fetch(`/api/instruments/${instrument.id}/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? result.error ?? 'No fue posible guardar la configuración');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No fue posible guardar la configuración');
    }
  }

  async function reset() {
    setResetting(true); setServerError(null);
    try {
      const response = await fetch(`/api/instruments/${instrument.id}/settings`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? result.error ?? 'No fue posible restaurar');
      router.push('/instruments');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No fue posible restaurar');
      setResetting(false);
    }
  }

  const input = 'mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-500';
  const err = 'mt-1 block text-xs text-red-300';
  const fields: Array<[keyof FormValues, string, string]> = [
    ['symbol', 'Símbolo exacto MT5', 'Ej. símbolo mostrado por tu broker'],
    ['minimumLot', 'Lote mínimo', 'Ej. 0.01'],
    ['lotStep', 'Paso de lote', 'Ej. 0.01'],
    ['maximumLot', 'Lote máximo', 'Opcional'],
    ['tickSize', 'Tick size', 'Especificación MT5'],
    ['tickValue', 'Tick value', 'Especificación MT5'],
    ['contractSize', 'Contract size', 'Especificación MT5'],
    ['baseLot', 'Lotaje base de referencia', 'No es el lotaje calculado por riesgo']
  ];

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 md:p-6" noValidate>
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-slate-300">
        Introduce únicamente valores obtenidos de la especificación real del activo en MT5. Si faltan datos contractuales, Price Action Pro no calculará un lotaje preciso.
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map(([name, label, placeholder]) => (
          <label key={name} className="text-sm text-slate-300">
            {label}
            <input {...register(name)} type={name === 'symbol' ? 'text' : 'number'} step="any" inputMode={name === 'symbol' ? undefined : 'decimal'} className={input} placeholder={placeholder} />
            {errors[name] && <span className={err}>{errors[name]?.message}</span>}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3 text-sm text-slate-300">
        <input {...register('active')} type="checkbox" className="h-4 w-4" /> Activo disponible para mi operativa
      </label>
      {serverError && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{serverError}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        {instrument.hasUserOverride ? <button type="button" onClick={reset} disabled={resetting || isSubmitting} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-50">{resetting ? 'Restaurando…' : 'Restaurar catálogo base'}</button> : <span />}
        <button type="submit" disabled={isSubmitting || resetting} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">{isSubmitting ? 'Guardando…' : 'Guardar configuración'}</button>
      </div>
    </form>
  );
}
