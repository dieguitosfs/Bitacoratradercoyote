'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRiskAmount,getRiskPercentage } from '@/lib/trading-rules';
import { calculateRiskLot,calculateTpFromPoints } from '@/lib/lot-engine';
import { TradeImageUpload } from '@/components/storage/trade-image-upload';

type Account={id:string;name:string;mt5RegisteredBalance:string;currency:string};
type Instrument={id:string;displayName:string;tickSize:string|null;tickValue:string|null;contractSize:string|null;lotStep:string|null;minimumLot:string|null;maximumLot:string|null;baseLot:string|null;requiresConfiguration:boolean};
type Strategy={id:string;name:string};
const emotions=['CALM','CONFIDENT','ANXIOUS','ANGRY','EUPHORIC','TIRED','FOMO','REVENGE'];
export function NewTradeForm({accounts,instruments,strategies}:{accounts:Account[];instruments:Instrument[];strategies:Strategy[]}){
 const router=useRouter(); const [analysisImage,setAnalysisImage]=useState<any>(null); const [checks,setChecks]=useState({marketStructure:false,supportResistance:false,entryConfirmation:false,slDefined:false,tpDefined:false,riskCorrect:false,compliesWithPlan:false}); const [accountId,setAccountId]=useState(accounts[0]?.id??''); const [instrumentId,setInstrumentId]=useState(instruments[0]?.id??''); const [entry,setEntry]=useState(''); const [sl,setSl]=useState(''); const [rr,setRr]=useState('2'); const [direction,setDirection]=useState<'BUY'|'SELL'>('BUY'); const [lot,setLot]=useState(''); const [mode,setMode]=useState<'REAL'|'STUDY'>('STUDY'); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 const account=accounts.find(a=>a.id===accountId); const instrument=instruments.find(i=>i.id===instrumentId);
 const calc=useMemo(()=>{try{if(!account||!instrument||!entry||!sl)return null;const risk=getRiskAmount(account.mt5RegisteredBalance);const l=calculateRiskLot({riskAmount:risk,stopDistance:sl,contract:{tickSize:instrument.tickSize,tickValue:instrument.tickValue,contractSize:instrument.contractSize,lotStep:instrument.lotStep,minimumLot:instrument.minimumLot,maximumLot:instrument.maximumLot,baseLot:instrument.baseLot}});const tp=calculateTpFromPoints({entryPrice:entry,stopLossPoints:sl,ratio:rr,direction});return{risk,pct:getRiskPercentage(account.mt5RegisteredBalance),l,tp};}catch{return null}},[account,instrument,entry,sl,rr,direction]);
 async function submit(formData:FormData){setBusy(true);setMessage('');try{const checklist=checks;const payload={accountId,instrumentId,mode,direction,origin:String(formData.get('origin')),timeframe:String(formData.get('timeframe')),entryType:String(formData.get('entryType')),entryPrice:entry,stopLossPoints:sl,takeProfitPoints:calc?.tp.takeProfitPoints.toString()??'',takeProfitPrice:calc?.tp.takeProfitPrice.toString()??'',rrPlanned:rr,actualLot:lot|| (calc?.l.ok?calc.l.calculatedLot.toString():'0.01'),strategyId:formData.get('strategyId')||null,notes:String(formData.get('notes')||''),emotionBefore:formData.get('emotionBefore')||null,followedPlan:true,analysisImage,checklist};const res=await fetch('/api/trades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const json=await res.json();if(!res.ok)throw new Error(json.error??json.message??'No fue posible registrar');setMessage('Operación registrada.');router.push('/trades');router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'Error');}finally{setBusy(false)}}
 return <form action={submit} className="space-y-6">
  <TradeImageUpload required={mode==='REAL'} onUploaded={setAnalysisImage}/>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
   <label>Modo<select value={mode} onChange={e=>setMode(e.target.value as any)} className="field"><option value="STUDY">OPERACIÓN DE ESTUDIO</option><option value="REAL">REAL</option></select></label>
   <label>Cuenta<select value={accountId} onChange={e=>setAccountId(e.target.value)} className="field">{accounts.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label>
   <label>Activo<select value={instrumentId} onChange={e=>setInstrumentId(e.target.value)} className="field">{instruments.map(i=><option value={i.id} key={i.id}>{i.displayName}</option>)}</select></label>
   <label>Dirección<select value={direction} onChange={e=>setDirection(e.target.value as any)} className="field"><option>BUY</option><option>SELL</option></select></label>
   <label>Origen<select name="origin" className="field"><option value="OWN">PROPIA</option><option value="SIGNAL">SEÑAL</option></select></label>
   <label>Temporalidad<select name="timeframe" className="field">{['M1','M5','M15','M30','H1','H4','D1'].map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Entrada<select name="entryType" className="field"><option value="MARKET">Market</option><option value="LIMIT">Limit</option><option value="STOP">Stop</option></select></label>
   <label>Precio entrada<input className="field" value={entry} onChange={e=>setEntry(e.target.value)} required/></label>
   <label>SL puntos<input className="field" value={sl} onChange={e=>setSl(e.target.value)} required/></label>
   <label>R:R<select className="field" value={rr} onChange={e=>setRr(e.target.value)}><option value="1">1:1</option><option value="2">1:2</option><option value="3">1:3</option></select></label>
   <label>Lote realmente utilizado<input className="field" value={lot} onChange={e=>setLot(e.target.value)} placeholder={calc?.l.ok?calc.l.calculatedLot.toString():'—'} required/></label>
   <label>Estrategia<select name="strategyId" className="field"><option value="">Sin estrategia</option>{strategies.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>Emoción antes<select name="emotionBefore" className="field"><option value="">—</option>{emotions.map(e=><option key={e}>{e}</option>)}</select></label>
  </div>
  {calc&&<div className="grid gap-3 sm:grid-cols-4"><Card l="Balance" v={`$${account?.mt5RegisteredBalance}`}/><Card l="Riesgo" v={`${calc.pct}% · $${calc.risk.toFixed(2)}`}/><Card l="TP" v={calc.tp.takeProfitPrice.toString()}/><Card l="Lote sugerido" v={calc.l.ok?calc.l.calculatedLot.toString():calc.l.reason}/></div>}
  <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><h2 className="font-semibold">CHECKLIST PRE-TRADE</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries({marketStructure:'Identifiqué estructura del mercado',supportResistance:'Estoy en soporte/resistencia',entryConfirmation:'Tengo confirmación de entrada',slDefined:'SL definido',tpDefined:'TP definido',riskCorrect:'Riesgo correcto',compliesWithPlan:'La operación cumple mi plan'}).map(([k,l])=><label key={k} className="flex items-center gap-2"><input type="checkbox" checked={(checks as any)[k]} onChange={e=>setChecks(v=>({...v,[k]:e.target.checked}))}/>{l}</label>)}</div>{mode==='REAL'&&<p className="mt-3 text-sm text-slate-400">Captura del análisis: {analysisImage?'✓ cargada':'pendiente'}</p>}</section><label className="block">Notas<textarea name="notes" className="field min-h-28"/></label>
  {message&&<p className="text-sm text-amber-300">{message}</p>}<button disabled={busy||(mode==='REAL'&&(!analysisImage||!Object.values(checks).every(Boolean)))} className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">{busy?'Guardando…':'Registrar operación'}</button>
 </form>
}
function Card({l,v}:{l:string;v:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 font-semibold">{v}</p></div>}
