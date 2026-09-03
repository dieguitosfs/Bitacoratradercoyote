import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-8">
        <Link href="/" className="inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Price Action Pro
        </Link>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        <div className="mt-7">{children}</div>
        {footer ? <div className="mt-6 border-t border-slate-800 pt-5 text-sm text-slate-400">{footer}</div> : null}
      </section>
    </main>
  );
}
