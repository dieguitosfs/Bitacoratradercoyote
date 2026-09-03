import 'server-only';
import { requireUser } from '@/lib/supabase/auth';
import { listTradingAccounts } from '@/lib/server/accounts';
import { listEffectiveInstruments } from '@/lib/server/instruments';
export async function getTradeFormOptions(){
  const [{supabase},accounts,instruments]=await Promise.all([requireUser(),listTradingAccounts(),listEffectiveInstruments()]);
  const {data:strategies}=await supabase.from('strategies').select('id,name').eq('active',true).order('name');
  return {accounts:accounts.filter(a=>a.active),instruments:instruments.filter(i=>i.active),strategies:strategies??[]};
}
export async function listTrades(limit=100){
  const {supabase}=await requireUser();
  const {data,error}=await supabase.from('trades').select('id,trade_date,entry_time,direction,origin,timeframe,entry_price,status,pnl_usd,r_multiple,mode,actual_lot,accounts:trading_accounts(name,currency),instrument:instruments(display_name)').order('entry_time',{ascending:false}).limit(limit);
  if(error) throw new Error(`TRADES_QUERY:${error.message}`); return data??[];
}
