import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountStatusButton } from '@/components/accounts/account-status-button';
import { Mt5BalanceForm } from '@/components/accounts/mt5-balance-form';
import { getMt5BalanceHistory, getTradingAccount } from '@/lib/server/accounts';

function money(value: string, currency: string) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(Number(value));
}

export default async function AccountDetailPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  try {
    const [account, history] = await Promise.all([getTradingAccount(accountId), getMt5BalanceHistory(accountId)]);
    const difference = Number(account.balanceDifference);

    return (
      <main className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <Link href="/accounts" className="text-sm text-cyan-300 hover:text-cyan-200">← Volver a cuentas</Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold">{account.name}</h1>
                <span className={`rounded-full px-2.5 py-1 text-xs ${account.active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{account.active ? 'Activa' : 'Inactiva'}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{account.brokerName} · {account.platform} · {account.currency}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/accounts/${account.id}/edit`} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-cyan-500">Editar datos</Link>
              <AccountStatusButton accountId={account.id} active={account.active} />
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-sm text-slate-400">Balance inicial</p><p className="mt-3 text-2xl font-semibold">{money(account.initialBalance, account.currency)}</p></div>
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5"><p className="text-sm text-cyan-200">Balance registrado MT5</p><p className="mt-3 text-2xl font-semibold">{money(account.mt5RegisteredBalance, account.currency)}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-sm text-slate-400">Balance bitácora</p><p className="mt-3 text-2xl font-semibold">{money(account.journalCalculatedBalance, account.currency)}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-sm text-slate-400">Diferencia MT5 - bitácora</p><p className={`mt-3 text-2xl font-semibold ${difference === 0 ? '' : difference > 0 ? 'text-emerald-300' : 'text-red-300'}`}>{difference > 0 ? '+' : ''}{money(account.balanceDifference, account.currency)}</p></div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5"><p className="text-sm text-emerald-200">Riesgo actual</p><p className="mt-3 text-2xl font-semibold">{account.riskPercentage}%</p><p className="mt-1 text-sm text-slate-300">Máx. {money(account.riskAmount, account.currency)}</p></div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 md:p-6">
              <h2 className="text-xl font-semibold">Historial de balance MT5</h2>
              <p className="mt-1 text-sm text-slate-400">Últimos registros manuales realizados para esta cuenta.</p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="pb-3">Fecha</th><th className="pb-3">Balance</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {history.map((item) => (
                      <tr key={item.id}><td className="py-3 text-slate-300">{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(item.capturedAt))}</td><td className="py-3 font-medium">{money(item.balance, account.currency)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 md:p-6">
              <h2 className="text-xl font-semibold">Actualizar MT5</h2>
              <p className="mt-1 mb-5 text-sm text-slate-400">Introduce el balance real mostrado actualmente por MetaTrader 5.</p>
              <Mt5BalanceForm accountId={account.id} currentBalance={account.mt5RegisteredBalance} />
            </aside>
          </div>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
