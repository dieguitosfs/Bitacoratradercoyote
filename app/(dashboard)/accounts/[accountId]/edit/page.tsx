import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountForm } from '@/components/accounts/account-form';
import { getTradingAccount, listBrokers } from '@/lib/server/accounts';

export default async function EditAccountPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  try {
    const [account, brokers] = await Promise.all([getTradingAccount(accountId), listBrokers()]);
    return (
      <main className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          <Link href={`/accounts/${account.id}`} className="text-sm text-cyan-300 hover:text-cyan-200">← Volver a la cuenta</Link>
          <h1 className="mt-5 text-3xl font-semibold">Editar {account.name}</h1>
          <p className="mt-2 text-sm text-slate-400">Solo modifica datos descriptivos. Los balances tienen flujos financieros independientes.</p>
          <div className="mt-7"><AccountForm brokers={brokers} account={account} /></div>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
