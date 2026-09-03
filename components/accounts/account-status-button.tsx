'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AccountStatusButton({ accountId, active }: { accountId: string; active: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts/${accountId}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? result.error ?? 'No fue posible actualizar la cuenta');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar la cuenta');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={toggle} disabled={saving}
        className={`rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-50 ${active ? 'border-red-500/40 text-red-300 hover:bg-red-500/10' : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'}`}>
        {saving ? 'Actualizando…' : active ? 'Desactivar cuenta' : 'Activar cuenta'}
      </button>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
