'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  ['/dashboard', 'Dashboard'],
  ['/accounts', 'Cuentas'],
  ['/trades', 'Operaciones'],
  ['/trades/new', 'Nueva operación'],
  ['/risk-calculator', 'Calculadora de riesgo'],
  ['/lot-calculator', 'Calculadora de lotaje'],
  ['/trading-plan', 'Plan de Trading'],
  ['/statistics', 'Estadísticas'],
  ['/calendar', 'Calendario'],
  ['/ai', 'Análisis IA'],
  ['/settings', 'Configuración'],
  ['/instruments', 'Activos']
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-6 py-3 md:px-10">
        <Link href="/dashboard" className="mr-3 whitespace-nowrap text-sm font-bold text-cyan-300">PRICE ACTION PRO</Link>
        {items.map(([href, label]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-slate-900'}`}>{label}</Link>;
        })}
      </div>
    </nav>
  );
}
