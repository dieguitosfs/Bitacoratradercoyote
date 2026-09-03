'use client';
import { useMemo, useState } from 'react';
import { calculateRiskLot, calculateTpFromPoints } from '@/lib/lot-engine';
import { getRiskAmount, getRiskPercentage } from '@/lib/trading-rules';

type Instrument = { id:string; displayName:string; tickSize:string|null; tickValue:string|null; contractSize:string|null; lotStep:string|null; minimumLot:string|null; maximumLot:string|null; baseLot:string|null; requiresConfiguration:boolean };
export function LotCalculator({ instruments }: { instruments: Instrument[] }) {
  const [balance,setBalance]=useState('200'); const [instrumentId,setInstrumentId]=useState(instruments[0]?.id ?? ''); const [entry,setEntry]=useState('100'); const [sl,setSl]=useState('50'); const [direction,setDirection]=useState<'BUY'|'SELL'>('BUY'); const [rr,setRr]=useState('2');
  const instrument=instruments.find(i=>i.id===instrumentId);
  const computed=useMemo(()=>{
    try {
      const riskPct=getRiskPercentage(balance); const risk=getRiskAmount(balance);
      if(!instrument) return null;
      const lot=calculateRiskLot({riskAmount:risk,stopDistance:sl,contract:{tickSize:instrument.tickSize,tickValue:instrument.tickValue,contractSize:instrument.contractSize,lotStep:instrument.lotStep,minimumLot:instrument.minimumLot,maximumLot:instrument.maximumLot,baseLot:instrument.baseLot}});
      const tp=calculateTpFromPoints({entryPrice:entry,stopLossPoints:sl,ratio:rr,direction});
      return {riskPct,risk,lot,tp};
    } catch { return null; }
  },[balance,instrument,entry,sl,direction,rr]);
  return <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Balance<input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3" value={balance} onChange={e=>setBalance(e.target.value)}/></label>
        <label className="text-sm">Activo<select className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3" value={instrumentId} onChange={e=>setInstrumentId(e.target.value)}>{instruments.map(i=><option key={i.id} value={i.id}>{i.displayName}</option>)}</select></label>
        <label className="text-sm">Dirección<select className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3" value={direction} onChange={e=>setDirection(e.target.value as 'BUY'|'SELL')}><option>BUY</option><option>SELL</option></select></label>
        <label className="text-sm">Precio entrada<input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3" value={entry} onChange={e=>setEntry(e.target.value)}/></label>
        <label className="text-sm">Stop Loss (puntos)<input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3" value={sl} onChange={e=>setSl(e.target.value)}/></label>
        <label className="text-sm">Relación R:R<select className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3" value={rr} onChange={e=>setRr(e.target.value)}><option value="1">1:1</option><option value="2">1:2</option><option value="3">1:3</option></select></label>
      </div>
    </section>
    <section className="rounded-2xl border border-cyan-900/60 bg-slate-950 p-5">
      <h2 className="font-semibold text-cyan-300">Resultado</h2>
      {!computed ? <p className="mt-4 text-sm text-red-300">Datos inválidos.</p> : <div className="mt-4 space-y-3 text-sm">
        <p>Riesgo: <b>{computed.riskPct.toString()}%</b> · <b>${computed.risk.toFixed(2)}</b></p>
        <p>TP calculado: <b>{computed.tp.takeProfitPoints.toString()} pts</b> · precio <b>{computed.tp.takeProfitPrice.toString()}</b></p>
        {computed.lot.ok ? <><p>Lotaje base referencia: <b>{computed.lot.baseLot?.toString() ?? '—'}</b></p><p>Lotaje calculado: <b className="text-cyan-300 text-xl">{computed.lot.calculatedLot.toString()}</b></p><p>Riesgo real: <b>${computed.lot.realRisk.toFixed(2)}</b></p></> : <p className="rounded-xl border border-amber-800 bg-amber-950/30 p-3 text-amber-200">{computed.lot.reason === 'MISSING_CONTRACT_DATA' ? 'No es posible calcular el lotaje con precisión porque faltan datos contractuales del activo.' : `No calculable: ${computed.lot.reason}`}</p>}
      </div>}
    </section>
  </div>;
}
