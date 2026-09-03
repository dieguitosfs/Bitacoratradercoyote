'use client';

import { useMemo, useState } from 'react';
import { calculateRiskSnapshot, serializeRiskSnapshot } from '@/lib/risk-engine';
import { riskCalculationSchema } from '@/lib/validation/risk';

export function RiskCalculator() {
  const [balance, setBalance] = useState('200.00');

  const result = useMemo(() => {
    const parsed = riskCalculationSchema.safeParse({ balance });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Balance inválido' } as const;
    try {
      return { data: serializeRiskSnapshot(calculateRiskSnapshot(parsed.data.balance)) } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Balance inválido' } as const;
    }
  }, [balance]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Balance de la cuenta</h2>
        <p className="mt-1 text-sm text-slate-400">Usa el balance registrado en MT5 para determinar el riesgo máximo de la siguiente operación.</p>
        <label className="mt-5 block text-sm text-slate-300">
          Balance USD
          <input
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-lg text-slate-100 outline-none focus:border-cyan-500"
          />
        </label>
        {'error' in result && <p className="mt-3 text-sm text-red-300">{result.error}</p>}
      </section>

      <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Riesgo permitido por plan</p>
        {'data' in result ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Metric label="Balance" value={`$${result.data.balance}`} />
            <Metric label="Riesgo" value={`${result.data.percentage}%`} />
            <Metric label="Riesgo máximo" value={`$${result.data.riskAmount}`} highlight />
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">Ingresa un balance válido para calcular el riesgo.</div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${highlight ? 'text-cyan-300' : 'text-white'}`}>{value}</p>
    </div>
  );
}
