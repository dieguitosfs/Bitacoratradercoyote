import Link from 'next/link';
import { InstrumentSettingsForm } from '@/components/instruments/instrument-settings-form';
import { getInstrument } from '@/lib/server/instruments';

const biasLabel = { BULLISH: 'ALCISTA', BEARISH: 'BAJISTA', BOTH: 'AMBAS' } as const;

export default async function InstrumentDetailPage({ params }: { params: Promise<{ instrumentId: string }> }) {
  const { instrumentId } = await params;
  const instrument = await getInstrument(instrumentId);

  return (
    <main className="min-h-screen p-6 md:p-10"><div className="mx-auto max-w-5xl">
      <Link href="/instruments" className="text-sm text-cyan-300 hover:text-cyan-200">← Volver a activos</Link>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-wider text-slate-500">{instrument.brokerName} · {instrument.category}</p><h1 className="mt-1 text-3xl font-semibold">{instrument.displayName}</h1><p className="mt-2 text-sm text-slate-400">Naturaleza de referencia: {biasLabel[instrument.strategyBias]}. Es una clasificación de estrategia, no una predicción del mercado.</p></div><span className={`w-fit rounded-full px-3 py-1 text-sm ${instrument.requiresConfiguration ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{instrument.requiresConfiguration ? 'Faltan datos contractuales' : 'Configuración contractual completa'}</span></div>

      <div className="my-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-xs uppercase text-slate-500">Lotaje base de referencia</p><p className="mt-2 text-2xl font-semibold text-cyan-300">{instrument.baseLot ?? 'Sin definir'}</p><p className="mt-2 text-xs text-slate-500">No representa el lotaje dinámico calculado por riesgo.</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-xs uppercase text-slate-500">Lotaje calculado por riesgo</p><p className="mt-2 text-2xl font-semibold">{instrument.requiresConfiguration ? 'No disponible' : 'Disponible en Fase 7'}</p><p className="mt-2 text-xs text-slate-500">Requiere tick size, tick value, contract size, lote mínimo y paso de lote.</p></div>
      </div>

      <InstrumentSettingsForm instrument={instrument} />
    </div></main>
  );
}
