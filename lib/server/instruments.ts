import 'server-only';
import { Decimal } from '@/lib/decimal';
import { requireUser } from '@/lib/supabase/auth';
import { instrumentSettingsSchema } from '@/lib/validation/instrument';

export interface InstrumentView {
  id: string;
  brokerId: string;
  brokerCode: string;
  brokerName: string;
  displayName: string;
  category: string;
  symbol: string | null;
  minimumLot: string | null;
  lotStep: string | null;
  maximumLot: string | null;
  tickSize: string | null;
  tickValue: string | null;
  contractSize: string | null;
  baseLot: string | null;
  strategyBias: 'BULLISH' | 'BEARISH' | 'BOTH';
  requiresConfiguration: boolean;
  active: boolean;
  hasUserOverride: boolean;
}

function decimalOrNull(value: unknown): string | null {
  return value == null ? null : new Decimal(String(value)).toString();
}

function mapInstrument(row: any): InstrumentView {
  return {
    id: row.id,
    brokerId: row.broker_id,
    brokerCode: row.broker_code ?? 'UNKNOWN',
    brokerName: row.broker_name ?? 'Broker',
    displayName: row.display_name,
    category: row.category,
    symbol: row.symbol ?? null,
    minimumLot: decimalOrNull(row.minimum_lot),
    lotStep: decimalOrNull(row.lot_step),
    maximumLot: decimalOrNull(row.maximum_lot),
    tickSize: decimalOrNull(row.tick_size),
    tickValue: decimalOrNull(row.tick_value),
    contractSize: decimalOrNull(row.contract_size),
    baseLot: decimalOrNull(row.base_lot),
    strategyBias: row.strategy_bias,
    requiresConfiguration: row.requires_configuration,
    active: row.active,
    hasUserOverride: Boolean(row.configured_by_user_id)
  };
}

export async function listInstruments(filters?: { broker?: string; category?: string; status?: string; search?: string }) {
  const { supabase } = await requireUser();
  let query = supabase
    .from('instrument_catalog_view')
    .select('id, broker_id, display_name, category, symbol, minimum_lot, lot_step, maximum_lot, tick_size, tick_value, contract_size, base_lot, strategy_bias, requires_configuration, active, configured_by_user_id, broker_code, broker_name')
    .order('category')
    .order('display_name');

  if (filters?.broker) query = query.eq('broker_code', filters.broker.toUpperCase());
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.status === 'configured') query = query.eq('requires_configuration', false);
  if (filters?.status === 'pending') query = query.eq('requires_configuration', true);
  if (filters?.search) query = query.ilike('display_name', `%${filters.search.trim()}%`);

  const { data, error } = await query;
  if (error) throw new Error(`INSTRUMENTS_QUERY:${error.message}`);
  return (data ?? []).map(mapInstrument);
}

export async function getInstrument(instrumentId: string): Promise<InstrumentView> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('instrument_catalog_view')
    .select('id, broker_id, display_name, category, symbol, minimum_lot, lot_step, maximum_lot, tick_size, tick_value, contract_size, base_lot, strategy_bias, requires_configuration, active, configured_by_user_id, broker_code, broker_name')
    .eq('id', instrumentId)
    .single();

  if (error || !data) throw new Error('INSTRUMENT_NOT_FOUND');
  return mapInstrument(data);
}

function nullable(value: string) {
  return value === '' ? null : value;
}

export async function saveInstrumentSettings(instrumentId: string, input: unknown) {
  const parsed = instrumentSettingsSchema.parse(input);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('upsert_user_instrument_settings', {
    p_instrument_id: instrumentId,
    p_symbol: nullable(parsed.symbol),
    p_minimum_lot: nullable(parsed.minimumLot),
    p_lot_step: nullable(parsed.lotStep),
    p_maximum_lot: nullable(parsed.maximumLot),
    p_tick_size: nullable(parsed.tickSize),
    p_tick_value: nullable(parsed.tickValue),
    p_contract_size: nullable(parsed.contractSize),
    p_base_lot: nullable(parsed.baseLot),
    p_active: parsed.active
  });
  if (error) throw new Error(`${error.code ?? 'INSTRUMENT_SETTINGS_RPC'}:${error.message}`);
  return data;
}

export async function resetInstrumentSettings(instrumentId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('reset_user_instrument_settings', { p_instrument_id: instrumentId });
  if (error) throw new Error(`${error.code ?? 'INSTRUMENT_RESET_RPC'}:${error.message}`);
  return Boolean(data);
}

export async function listEffectiveInstruments() {
  return listInstruments();
}
