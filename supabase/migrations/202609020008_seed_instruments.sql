begin;

-- Initial catalog. Contract values intentionally remain null because symbols,
-- tick values and lot limits vary by broker and must be configured per user.
with catalog(broker_code, display_name, category, symbol, strategy_bias) as (
  values
    ('DERIV', 'EUR/USD', 'FOREX', 'EURUSD', 'BOTH'::public.strategy_bias),
    ('DERIV', 'GBP/USD', 'FOREX', 'GBPUSD', 'BOTH'::public.strategy_bias),
    ('DERIV', 'USD/JPY', 'FOREX', 'USDJPY', 'BOTH'::public.strategy_bias),
    ('DERIV', 'XAU/USD', 'METALS', 'XAUUSD', 'BOTH'::public.strategy_bias),
    ('DERIV', 'BTC/USD', 'CRYPTO', 'BTCUSD', 'BOTH'::public.strategy_bias),
    ('DERIV', 'Volatility 75 Index', 'SYNTHETIC', 'R_75', 'BOTH'::public.strategy_bias),
    ('DERIV', 'Volatility 100 Index', 'SYNTHETIC', 'R_100', 'BOTH'::public.strategy_bias),
    ('BRIDGE', 'EUR/USD', 'FOREX', 'EURUSD', 'BOTH'::public.strategy_bias),
    ('BRIDGE', 'GBP/USD', 'FOREX', 'GBPUSD', 'BOTH'::public.strategy_bias),
    ('BRIDGE', 'USD/JPY', 'FOREX', 'USDJPY', 'BOTH'::public.strategy_bias),
    ('BRIDGE', 'XAU/USD', 'METALS', 'XAUUSD', 'BOTH'::public.strategy_bias),
    ('BRIDGE', 'BTC/USD', 'CRYPTO', 'BTCUSD', 'BOTH'::public.strategy_bias),
    ('BRIDGE', 'US 30', 'INDEX', 'US30', 'BOTH'::public.strategy_bias),
    ('BRIDGE', 'NASDAQ 100', 'INDEX', 'NAS100', 'BOTH'::public.strategy_bias),
    ('OTHER', 'EUR/USD', 'FOREX', 'EURUSD', 'BOTH'::public.strategy_bias),
    ('OTHER', 'GBP/USD', 'FOREX', 'GBPUSD', 'BOTH'::public.strategy_bias),
    ('OTHER', 'USD/JPY', 'FOREX', 'USDJPY', 'BOTH'::public.strategy_bias),
    ('OTHER', 'XAU/USD', 'METALS', 'XAUUSD', 'BOTH'::public.strategy_bias),
    ('OTHER', 'BTC/USD', 'CRYPTO', 'BTCUSD', 'BOTH'::public.strategy_bias),
    ('OTHER', 'US 30', 'INDEX', 'US30', 'BOTH'::public.strategy_bias),
    ('OTHER', 'NASDAQ 100', 'INDEX', 'NAS100', 'BOTH'::public.strategy_bias)
)
insert into public.instruments (
  broker_id,
  display_name,
  category,
  symbol,
  strategy_bias,
  requires_configuration,
  active
)
select
  b.id,
  c.display_name,
  c.category,
  c.symbol,
  c.strategy_bias,
  true,
  true
from catalog c
join public.brokers b on b.code = c.broker_code
on conflict (broker_id, display_name) do update set
  category = excluded.category,
  symbol = coalesce(public.instruments.symbol, excluded.symbol),
  active = true,
  updated_at = now();

commit;
