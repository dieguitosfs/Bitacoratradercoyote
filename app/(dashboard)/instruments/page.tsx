import Link from 'next/link';
import { listInstruments } from '@/lib/server/instruments';

type Search = Promise<{ broker?: string; category?: string; status?: string; q?: string }>;

const biasLabel = { BULLISH: 'ALCISTA', BEARISH: 'BAJISTA', BOTH: 'AMBAS' } as const;

export default async function InstrumentsPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const instruments = await listInstruments({ broker: search.broker, category: search.category, status: search.status, search: search.q });
  const categories = ['CRASH', 'BOOM', 'VOLATILITY', 'STEP', 'BullX', 'BearX', 'Fortune100'];

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Price Action Pro</p>
          <h1 className="mt-2 text-3xl font-semibold">Catálogo de Activos</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">El catálogo base es referencia. Las especificaciones contractuales son privadas por usuario y deben copiarse exactamente desde MT5.</p>
        </div>

        <form className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-5">
          <input name="q" defaultValue={search.q ?? ''} placeholder="Buscar activo" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm" />
          <select name="broker" defaultValue={search.broker ?? ''} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"><option value="">Todos los brokers</option><option value="DERIV">Deriv</option><option value="BRIDGE">Bridge</option></select>
          <select name="category" defaultValue={search.category ?? ''} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"><option value="">Todas las categorías</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select name="status" defaultValue={search.status ?? ''} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"><option value="">Todos los estados</option><option value="configured">Configurados</option><option value="pending">Pendientes</option></select>
          <button className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Filtrar</button>
        </form>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {instruments.map((item) => (
            <Link href={`/instruments/${item.id}`} key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 transition hover:border-cyan-500/50">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-slate-500">{item.brokerName} · {item.category}</p><h2 className="mt-1 text-lg font-semibold">{item.displayName}</h2></div><span className={`rounded-full px-2 py-1 text-xs ${item.requiresConfiguration ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{item.requiresConfiguration ? 'Configurar' : 'Listo'}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-900/70 p-3"><p className="text-xs text-slate-500">Sesgo estratégico</p><p className="mt-1 font-medium">{biasLabel[item.strategyBias]}</p></div><div className="rounded-xl bg-slate-900/70 p-3"><p className="text-xs text-slate-500">Lotaje base</p><p className="mt-1 font-medium">{item.baseLot ?? 'Sin definir'}</p></div></div>
              <p className="mt-4 text-xs text-slate-500">{item.hasUserOverride ? 'Configuración personalizada activa' : 'Usando catálogo base'}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
