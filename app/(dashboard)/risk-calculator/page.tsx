import { RiskCalculator } from '@/components/risk/risk-calculator';
import { RISK_BANDS } from '@/lib/risk-engine';

export default function RiskCalculatorPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8 md:px-10">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Motor de riesgo</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Calculadora de riesgo</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">El porcentaje se deriva exclusivamente del balance. El cálculo usa Decimal y las mismas reglas centrales que utilizarán Nueva Operación y la calculadora de lotaje.</p>
      </div>

      <RiskCalculator />

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Bandas del plan</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {RISK_BANDS.map((band, index) => {
            const labels = ['$0 – $500', '$500.01 – $1,000', '$1,000.01 – $5,000', 'Más de $5,000'];
            const label = labels[index];
            return (
              <div key={`${band.min}-${band.percentage}`} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{band.percentage}%</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-500">Los límites exactos son: ≤500 = 4%, &gt;500 y ≤1000 = 3%, &gt;1000 y ≤5000 = 2%, &gt;5000 = 1%.</p>
      </section>
    </main>
  );
}
