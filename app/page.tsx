import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen p-8 md:p-14">
      <div className="mx-auto max-w-5xl rounded-3xl border border-cyan-400/20 bg-slate-950/70 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Price Action Pro</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-6xl">Trading Journal</h1>
        <p className="mt-5 max-w-2xl text-slate-300">
          Base inicial de producción: arquitectura, seguridad, motor central de riesgo y esquema Supabase.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/login" className="rounded-xl bg-cyan-400 px-5 py-3 font-medium text-slate-950">Ingresar</Link>
          <Link href="/dashboard" className="rounded-xl border border-slate-700 px-5 py-3">Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
