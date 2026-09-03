import Link from 'next/link';
import { AccountForm } from '@/components/accounts/account-form';
import { listBrokers } from '@/lib/server/accounts';

export default async function NewAccountPage() {
  const brokers = await listBrokers();

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/accounts" className="text-sm text-cyan-300 hover:text-cyan-200">← Volver a cuentas</Link>
        <h1 className="mt-5 text-3xl font-semibold">Nueva cuenta de trading</h1>
        <p className="mt-2 text-sm text-slate-400">Registra el balance inicial y el saldo que realmente muestra MT5. Se conservarán por separado.</p>
        <div className="mt-7"><AccountForm brokers={brokers} /></div>
      </div>
    </main>
  );
}
