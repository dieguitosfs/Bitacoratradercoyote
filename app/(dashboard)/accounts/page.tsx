import Link from 'next/link';
import { listTradingAccounts } from '@/lib/server/accounts';

function money(value: string, currency: string) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(Number(value));
}

export default async function AccountsPage() {
  const accounts = await listTradingAccounts();

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Price Action Pro</p>
            <h1 className="mt-2 text-3xl font-semibold">Cuentas de Trading</h1>
            <p className="mt-2 text-sm text-slate-400">MT5 y bitácora se controlan como saldos independientes.</p>
          </div>
          <Link href="/accounts/new" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-center text-sm font-semibold text-slate-950">Nueva cuenta</Link>
        </div>

        {accounts.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
            <h2 className="text-xl font-semibold">Aún no tienes cuentas</h2>
            <p className="mt-2 text-sm text-slate-400">Crea tu primera cuenta para comenzar a calcular riesgo y registrar operaciones.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {accounts.map((account) => {
              const difference = Number(account.balanceDifference);
              return (
                <Link key={account.id} href={`/accounts/${account.id}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 transition hover:border-cyan-500/50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">{account.name}</h2>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${account.active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{account.active ? 'Activa' : 'Inactiva'}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{account.brokerName} · {account.platform} · {account.currency}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Riesgo actual</p>
                      <p className="text-lg font-semibold text-cyan-300">{account.riskPercentage}% · {money(account.riskAmount, account.currency)}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-900/70 p-3"><p className="text-xs text-slate-500">Balance MT5</p><p className="mt-1 font-semibold">{money(account.mt5RegisteredBalance, account.currency)}</p></div>
                    <div className="rounded-xl bg-slate-900/70 p-3"><p className="text-xs text-slate-500">Bitácora</p><p className="mt-1 font-semibold">{money(account.journalCalculatedBalance, account.currency)}</p></div>
                    <div className="rounded-xl bg-slate-900/70 p-3"><p className="text-xs text-slate-500">Diferencia</p><p className={`mt-1 font-semibold ${difference === 0 ? 'text-slate-200' : difference > 0 ? 'text-emerald-300' : 'text-red-300'}`}>{difference > 0 ? '+' : ''}{money(account.balanceDifference, account.currency)}</p></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
