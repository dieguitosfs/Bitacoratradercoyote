begin;

create extension if not exists pgcrypto;

create type public.trade_direction as enum ('BUY','SELL');
create type public.trade_origin as enum ('OWN','SIGNAL');
create type public.trade_timeframe as enum ('M1','M5','M15','M30','H1','H4','D1');
create type public.trade_entry_type as enum ('MARKET','LIMIT','STOP');
create type public.trade_status as enum ('OPEN','WON','LOST','BREAK_EVEN','CANCELLED');
create type public.trade_mode as enum ('REAL','STUDY');
create type public.strategy_bias as enum ('BULLISH','BEARISH','BOTH');
create type public.emotion_before as enum ('CALM','CONFIDENT','ANXIOUS','ANGRY','EUPHORIC','TIRED','FOMO','REVENGE');
create type public.emotion_after as enum ('CALM','SATISFIED','ANXIOUS','FRUSTRATED','EUPHORIC','REVENGE');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  broker_id uuid not null references public.brokers(id),
  platform text not null,
  currency char(3) not null default 'USD',
  initial_balance numeric(20,8) not null check (initial_balance >= 0),
  mt5_registered_balance numeric(20,8) not null check (mt5_registered_balance >= 0),
  journal_calculated_balance numeric(20,8) not null check (journal_calculated_balance >= 0),
  created_on date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.instruments (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null references public.brokers(id),
  symbol text,
  display_name text not null,
  category text not null,
  minimum_lot numeric(20,8),
  lot_step numeric(20,8),
  maximum_lot numeric(20,8),
  tick_size numeric(30,12),
  tick_value numeric(30,12),
  contract_size numeric(30,12),
  base_lot numeric(20,8),
  strategy_bias public.strategy_bias not null default 'BOTH',
  requires_configuration boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (broker_id, display_name),
  check (minimum_lot is null or minimum_lot > 0),
  check (lot_step is null or lot_step > 0),
  check (maximum_lot is null or maximum_lot > 0),
  check (tick_size is null or tick_size > 0),
  check (tick_value is null or tick_value > 0),
  check (contract_size is null or contract_size > 0),
  check (base_lot is null or base_lot > 0)
);

create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table public.trading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mi Plan',
  daily_max_trades integer not null default 3 check (daily_max_trades > 0),
  daily_stop_wins integer not null default 2 check (daily_stop_wins > 0),
  daily_stop_losses integer not null default 2 check (daily_stop_losses > 0),
  weekly_reference_trades integer not null default 15 check (weekly_reference_trades >= 0),
  weekly_reference_wins integer not null default 10 check (weekly_reference_wins >= 0),
  weekly_reference_losses integer not null default 5 check (weekly_reference_losses >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_trading_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_monthly_trades integer check (max_monthly_trades is null or max_monthly_trades > 0),
  allow_risk_override boolean not null default false,
  max_image_size_bytes bigint not null default 10485760 check (max_image_size_bytes > 0),
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  month_start date not null,
  monthly_start_balance numeric(20,8) not null check (monthly_start_balance >= 0),
  mt5_end_balance numeric(20,8),
  journal_end_balance numeric(20,8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, month_start)
);

create table public.balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  balance_type text not null check (balance_type in ('MT5_REGISTERED','JOURNAL_CALCULATED')),
  balance numeric(20,8) not null check (balance >= 0),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete restrict,
  instrument_id uuid not null references public.instruments(id) on delete restrict,
  trade_date date not null,
  entry_time timestamptz,
  exit_time timestamptz,
  mode public.trade_mode not null default 'REAL',
  direction public.trade_direction not null,
  origin public.trade_origin not null,
  timeframe public.trade_timeframe not null,
  entry_type public.trade_entry_type not null,
  entry_price numeric(30,12) not null,
  stop_loss_price numeric(30,12),
  stop_loss_points numeric(30,12),
  take_profit_price numeric(30,12),
  take_profit_points numeric(30,12),
  rr_planned numeric(12,6) not null check (rr_planned > 0),
  risk_percentage numeric(12,6) not null check (risk_percentage >= 0),
  risk_amount numeric(20,8) not null check (risk_amount >= 0),
  recommended_lot numeric(20,8),
  actual_lot numeric(20,8) not null check (actual_lot > 0),
  balance_before numeric(20,8) not null check (balance_before >= 0),
  balance_after numeric(20,8),
  status public.trade_status not null default 'OPEN',
  pnl_usd numeric(20,8),
  pnl_points numeric(30,12),
  r_multiple numeric(20,8),
  strategy_id uuid references public.strategies(id) on delete set null,
  notes text,
  emotion_before public.emotion_before,
  emotion_after public.emotion_after,
  discipline boolean,
  followed_plan boolean not null,
  analysis_image_url text,
  result_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stop_loss_price is not null or stop_loss_points is not null),
  check (take_profit_price is not null or take_profit_points is not null),
  check (mode = 'STUDY' or analysis_image_url is not null)
);

create table public.trade_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null references public.trades(id) on delete cascade,
  image_type text not null check (image_type in ('ANALYSIS','RESULT')),
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create table public.pretrade_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null unique references public.trades(id) on delete cascade,
  market_structure boolean not null,
  support_resistance boolean not null,
  entry_confirmation boolean not null,
  sl_defined boolean not null,
  tp_defined boolean not null,
  risk_correct boolean not null,
  analysis_image_uploaded boolean not null,
  complies_with_plan boolean not null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    market_structure and support_resistance and entry_confirmation and sl_defined and tp_defined
    and risk_correct and analysis_image_uploaded and complies_with_plan
  )
);

create table public.ai_trade_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null references public.trades(id) on delete cascade,
  review_type text not null check (review_type in ('PRE_TRADE','POST_TRADE')),
  model text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create index trades_user_date_idx on public.trades(user_id, trade_date);
create index trades_account_date_idx on public.trades(account_id, trade_date);
create index trades_instrument_idx on public.trades(instrument_id);
create index balance_snapshots_account_time_idx on public.balance_snapshots(account_id, captured_at desc);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger brokers_updated_at before update on public.brokers for each row execute function public.set_updated_at();
create trigger accounts_updated_at before update on public.trading_accounts for each row execute function public.set_updated_at();
create trigger instruments_updated_at before update on public.instruments for each row execute function public.set_updated_at();
create trigger strategies_updated_at before update on public.strategies for each row execute function public.set_updated_at();
create trigger plans_updated_at before update on public.trading_plans for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.user_trading_settings for each row execute function public.set_updated_at();
create trigger monthly_updated_at before update on public.monthly_snapshots for each row execute function public.set_updated_at();
create trigger trades_updated_at before update on public.trades for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.strategies enable row level security;
alter table public.trading_plans enable row level security;
alter table public.user_trading_settings enable row level security;
alter table public.monthly_snapshots enable row level security;
alter table public.balance_snapshots enable row level security;
alter table public.trades enable row level security;
alter table public.trade_images enable row level security;
alter table public.pretrade_checklists enable row level security;
alter table public.ai_trade_reviews enable row level security;
alter table public.brokers enable row level security;
alter table public.instruments enable row level security;

create policy "profiles own rows" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "accounts own rows" on public.trading_accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "strategies own rows" on public.strategies for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plans own rows" on public.trading_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "settings own rows" on public.user_trading_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "monthly own rows" on public.monthly_snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "balance own rows" on public.balance_snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trades own rows" on public.trades for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trade images own rows" on public.trade_images for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "checklists own rows" on public.pretrade_checklists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai reviews own rows" on public.ai_trade_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "authenticated read brokers" on public.brokers for select to authenticated using (true);
create policy "authenticated read instruments" on public.instruments for select to authenticated using (true);

-- Catalog changes should be performed by trusted server-side/admin flows, not arbitrary clients.

insert into public.brokers (code, display_name) values
  ('DERIV','Deriv'),
  ('BRIDGE','Bridge'),
  ('OTHER','Otro')
on conflict (code) do nothing;

commit;
