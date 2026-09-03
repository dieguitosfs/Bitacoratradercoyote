import 'server-only';
import { requireUser } from '@/lib/supabase/auth';
import { tradeSchema } from '@/lib/validation/trade';
import { closeTradeSchema } from '@/lib/validation/close-trade';

function nullableDecimal(value: string | null | undefined) {
  return value && value.length > 0 ? value : null;
}

export async function createTrade(input: unknown) {
  const parsed = tradeSchema.parse(input);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc('create_trade_transactional', {
    p_account_id: parsed.accountId,
    p_instrument_id: parsed.instrumentId,
    p_mode: parsed.mode,
    p_direction: parsed.direction,
    p_origin: parsed.origin,
    p_timeframe: parsed.timeframe,
    p_entry_type: parsed.entryType,
    p_entry_price: parsed.entryPrice,
    p_stop_loss_price: nullableDecimal(parsed.stopLossPrice),
    p_stop_loss_points: nullableDecimal(parsed.stopLossPoints),
    p_take_profit_price: nullableDecimal(parsed.takeProfitPrice),
    p_take_profit_points: nullableDecimal(parsed.takeProfitPoints),
    p_rr_planned: parsed.rrPlanned,
    p_actual_lot: parsed.actualLot,
    p_strategy_id: parsed.strategyId ?? null,
    p_notes: parsed.notes ?? null,
    p_emotion_before: parsed.emotionBefore ?? null,
    p_followed_plan: parsed.followedPlan,
    p_analysis_storage_path: parsed.analysisImage?.storagePath ?? null,
    p_analysis_mime_type: parsed.analysisImage?.mimeType ?? null,
    p_analysis_size_bytes: parsed.analysisImage?.sizeBytes ?? null,
    p_check_market_structure: parsed.checklist.marketStructure,
    p_check_support_resistance: parsed.checklist.supportResistance,
    p_check_entry_confirmation: parsed.checklist.entryConfirmation,
    p_check_sl_defined: parsed.checklist.slDefined,
    p_check_tp_defined: parsed.checklist.tpDefined,
    p_check_risk_correct: parsed.checklist.riskCorrect,
    p_check_complies_with_plan: parsed.checklist.compliesWithPlan,
    p_entry_at: parsed.entryAt ?? new Date().toISOString()
  });

  if (error) throw new Error(`${error.code ?? 'SUPABASE_RPC'}:${error.message}`);
  if (!data) throw new Error('EMPTY_RPC_RESPONSE');
  return data;
}

export async function closeTrade(tradeId: string, input: unknown) {
  const parsed = closeTradeSchema.parse(input);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc('close_trade_transactional', {
    p_trade_id: tradeId,
    p_status: parsed.status,
    p_pnl_usd: parsed.pnlUsd,
    p_pnl_points: parsed.pnlPoints ?? null,
    p_emotion_after: parsed.emotionAfter ?? null,
    p_discipline: parsed.discipline ?? null,
    p_result_storage_path: parsed.resultImage?.storagePath ?? null,
    p_result_mime_type: parsed.resultImage?.mimeType ?? null,
    p_result_size_bytes: parsed.resultImage?.sizeBytes ?? null,
    p_exit_at: parsed.exitAt ?? new Date().toISOString()
  });

  if (error) throw new Error(`${error.code ?? 'SUPABASE_RPC'}:${error.message}`);
  if (!data) throw new Error('EMPTY_RPC_RESPONSE');
  return data;
}
