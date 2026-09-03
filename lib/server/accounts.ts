import 'server-only';
import { Decimal } from '@/lib/decimal';
import { getRiskAmount, getRiskPercentage } from '@/lib/trading-rules';
import {
  createTradingAccountSchema,
  registerMt5BalanceSchema,
  setTradingAccountActiveSchema,
  updateTradingAccountSchema
} from '@/lib/validation/account';
import { requireUser } from '@/lib/supabase/auth';

function unwrapRpc<T>(data: T | null, error: { message: string; code?: string } | null): T {
  if (error) throw new Error(`${error.code ?? 'SUPABASE_RPC'}:${error.message}`);
  if (!data) throw new Error('EMPTY_RPC_RESPONSE');
  return data;
}

export interface TradingAccountView {
  id: string;
  name: string;
  brokerId: string;
  brokerCode: string;
  brokerName: string;
  platform: string;
  currency: string;
  initialBalance: string;
  mt5RegisteredBalance: string;
  journalCalculatedBalance: string;
  balanceDifference: string;
  riskPercentage: string;
  riskAmount: string;
  active: boolean;
  createdOn: string;
  createdAt: string;
}

export interface BrokerOption {
  id: string;
  code: string;
  displayName: string;
}

function mapAccount(row: any): TradingAccountView {
  const mt5 = new Decimal(row.mt5_registered_balance);
  const journal = new Decimal(row.journal_calculated_balance);
  const riskPercentage = getRiskPercentage(mt5);
  const riskAmount = getRiskAmount(mt5);

  const broker = Array.isArray(row.brokers) ? row.brokers[0] : row.brokers;

  return {
    id: row.id,
    name: row.name,
    brokerId: row.broker_id,
    brokerCode: broker?.code ?? 'UNKNOWN',
    brokerName: broker?.display_name ?? 'Broker',
    platform: row.platform,
    currency: row.currency,
    initialBalance: new Decimal(row.initial_balance).toFixed(2),
    mt5RegisteredBalance: mt5.toFixed(2),
    journalCalculatedBalance: journal.toFixed(2),
    balanceDifference: mt5.sub(journal).toFixed(2),
    riskPercentage: riskPercentage.toFixed(2),
    riskAmount: riskAmount.toFixed(2),
    active: row.active,
    createdOn: row.created_on,
    createdAt: row.created_at
  };
}

export async function listBrokers(): Promise<BrokerOption[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('brokers')
    .select('id, code, display_name')
    .eq('active', true)
    .order('display_name');

  if (error) throw new Error(`BROKERS_QUERY:${error.message}`);
  return (data ?? []).map((broker) => ({
    id: broker.id,
    code: broker.code,
    displayName: broker.display_name
  }));
}

export async function listTradingAccounts(): Promise<TradingAccountView[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('trading_accounts')
    .select(`
      id, name, broker_id, platform, currency,
      initial_balance, mt5_registered_balance, journal_calculated_balance,
      active, created_on, created_at,
      brokers(code, display_name)
    `)
    .order('active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(`ACCOUNTS_QUERY:${error.message}`);
  return (data ?? []).map(mapAccount);
}

export async function getTradingAccount(accountId: string): Promise<TradingAccountView> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('trading_accounts')
    .select(`
      id, name, broker_id, platform, currency,
      initial_balance, mt5_registered_balance, journal_calculated_balance,
      active, created_on, created_at,
      brokers(code, display_name)
    `)
    .eq('id', accountId)
    .single();

  if (error || !data) throw new Error('ACCOUNT_NOT_FOUND');
  return mapAccount(data);
}

export async function getMt5BalanceHistory(accountId: string, limit = 20) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('balance_snapshots')
    .select('id, balance, captured_at')
    .eq('account_id', accountId)
    .eq('balance_type', 'MT5_REGISTERED')
    .order('captured_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (error) throw new Error(`BALANCE_HISTORY_QUERY:${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    balance: new Decimal(row.balance).toFixed(2),
    capturedAt: row.captured_at
  }));
}

export async function createTradingAccount(input: unknown) {
  const parsed = createTradingAccountSchema.parse(input);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc('create_trading_account', {
    p_name: parsed.name,
    p_broker_id: parsed.brokerId,
    p_platform: parsed.platform,
    p_currency: parsed.currency,
    p_initial_balance: parsed.initialBalance,
    p_mt5_registered_balance: parsed.mt5RegisteredBalance
  });

  return unwrapRpc(data, error);
}

export async function updateTradingAccount(accountId: string, input: unknown) {
  const parsed = updateTradingAccountSchema.parse(input);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc('update_trading_account', {
    p_account_id: accountId,
    p_name: parsed.name,
    p_broker_id: parsed.brokerId,
    p_platform: parsed.platform,
    p_currency: parsed.currency
  });

  return unwrapRpc(data, error);
}

export async function setTradingAccountActive(accountId: string, input: unknown) {
  const parsed = setTradingAccountActiveSchema.parse(input);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc('set_trading_account_active', {
    p_account_id: accountId,
    p_active: parsed.active
  });

  return unwrapRpc(data, error);
}

export async function registerMt5Balance(accountId: string, input: unknown) {
  const parsed = registerMt5BalanceSchema.parse(input);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc('register_mt5_balance', {
    p_account_id: accountId,
    p_balance: parsed.balance
  });

  return unwrapRpc(data, error);
}
