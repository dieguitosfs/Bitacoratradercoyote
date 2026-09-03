begin;

-- ============================================================
-- Phase 2: security hardening, user-specific instrument config,
-- auth bootstrap, and transactional RPCs.
-- ============================================================

-- Keep helper functions out of an attacker-controlled search_path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- One user can override broker/instrument contract metadata without mutating
-- the shared seed catalog used by everybody else.
create table if not exists public.user_instrument_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  symbol text,
  minimum_lot numeric(20,8),
  lot_step numeric(20,8),
  maximum_lot numeric(20,8),
  tick_size numeric(30,12),
  tick_value numeric(30,12),
  contract_size numeric(30,12),
  base_lot numeric(20,8),
  requires_configuration boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, instrument_id),
  check (minimum_lot is null or minimum_lot > 0),
  check (lot_step is null or lot_step > 0),
  check (maximum_lot is null or maximum_lot > 0),
  check (maximum_lot is null or minimum_lot is null or maximum_lot >= minimum_lot),
  check (tick_size is null or tick_size > 0),
  check (tick_value is null or tick_value > 0),
  check (contract_size is null or contract_size > 0),
  check (base_lot is null or base_lot > 0)
);

create trigger user_instrument_settings_updated_at
before update on public.user_instrument_settings
for each row execute function public.set_updated_at();

create index if not exists user_instrument_settings_user_idx
  on public.user_instrument_settings(user_id, instrument_id);

-- A DB view resolves effective values without changing the reference catalog.
create or replace view public.effective_instruments
with (security_invoker = true)
as
select
  i.id,
  i.broker_id,
  i.display_name,
  i.category,
  coalesce(uis.symbol, i.symbol) as symbol,
  coalesce(uis.minimum_lot, i.minimum_lot) as minimum_lot,
  coalesce(uis.lot_step, i.lot_step) as lot_step,
  coalesce(uis.maximum_lot, i.maximum_lot) as maximum_lot,
  coalesce(uis.tick_size, i.tick_size) as tick_size,
  coalesce(uis.tick_value, i.tick_value) as tick_value,
  coalesce(uis.contract_size, i.contract_size) as contract_size,
  coalesce(uis.base_lot, i.base_lot) as base_lot,
  i.strategy_bias,
  coalesce(uis.requires_configuration, i.requires_configuration) as requires_configuration,
  (i.active and coalesce(uis.active, true)) as active,
  uis.user_id as configured_by_user_id
from public.instruments i
left join public.user_instrument_settings uis
  on uis.instrument_id = i.id
 and uis.user_id = (select auth.uid());

-- ------------------------------------------------------------
-- Auth bootstrap: profile + default settings + default plan.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    'America/Bogota'
  )
  on conflict (id) do nothing;

  insert into public.user_trading_settings (user_id, timezone)
  values (new.id, 'America/Bogota')
  on conflict (user_id) do nothing;

  if not exists (
    select 1 from public.trading_plans where user_id = new.id and active = true
  ) then
    insert into public.trading_plans (user_id, name)
    values (new.id, 'Mi Plan');
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

-- Drop/recreate to keep migration idempotent in development resets.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill already-existing Auth users.
insert into public.profiles (id, display_name, timezone)
select id, coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'full_name'), 'America/Bogota'
from auth.users
on conflict (id) do nothing;

insert into public.user_trading_settings (user_id, timezone)
select id, 'America/Bogota'
from auth.users
on conflict (user_id) do nothing;

insert into public.trading_plans (user_id, name)
select u.id, 'Mi Plan'
from auth.users u
where not exists (
  select 1 from public.trading_plans p where p.user_id = u.id and p.active = true
);

-- ------------------------------------------------------------
-- RLS hardening: explicit grants + explicit policies.
-- ------------------------------------------------------------
alter table public.user_instrument_settings enable row level security;

-- Remove broad phase-1 policies.
drop policy if exists "profiles own rows" on public.profiles;
drop policy if exists "accounts own rows" on public.trading_accounts;
drop policy if exists "strategies own rows" on public.strategies;
drop policy if exists "plans own rows" on public.trading_plans;
drop policy if exists "settings own rows" on public.user_trading_settings;
drop policy if exists "monthly own rows" on public.monthly_snapshots;
drop policy if exists "balance own rows" on public.balance_snapshots;
drop policy if exists "trades own rows" on public.trades;
drop policy if exists "trade images own rows" on public.trade_images;
drop policy if exists "checklists own rows" on public.pretrade_checklists;
drop policy if exists "ai reviews own rows" on public.ai_trade_reviews;
drop policy if exists "authenticated read brokers" on public.brokers;
drop policy if exists "authenticated read instruments" on public.instruments;

-- Remove implicit Data API privileges first.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.trading_accounts from anon, authenticated;
revoke all on table public.strategies from anon, authenticated;
revoke all on table public.trading_plans from anon, authenticated;
revoke all on table public.user_trading_settings from anon, authenticated;
revoke all on table public.user_instrument_settings from anon, authenticated;
revoke all on table public.monthly_snapshots from anon, authenticated;
revoke all on table public.balance_snapshots from anon, authenticated;
revoke all on table public.trades from anon, authenticated;
revoke all on table public.trade_images from anon, authenticated;
revoke all on table public.pretrade_checklists from anon, authenticated;
revoke all on table public.ai_trade_reviews from anon, authenticated;
revoke all on table public.brokers from anon, authenticated;
revoke all on table public.instruments from anon, authenticated;

-- Browser/API permissions are least-privilege. Sensitive creation paths are
-- performed through RPCs below; direct inserts into financial tables are denied.
grant select, update on table public.profiles to authenticated;
grant select on table public.trading_accounts to authenticated;
grant select, insert, update, delete on table public.strategies to authenticated;
grant select, update on table public.trading_plans to authenticated;
grant select, update on table public.user_trading_settings to authenticated;
grant select, insert, update, delete on table public.user_instrument_settings to authenticated;
grant select on table public.monthly_snapshots to authenticated;
grant select on table public.balance_snapshots to authenticated;
grant select on table public.trades to authenticated;
grant select on table public.trade_images to authenticated;
grant select on table public.pretrade_checklists to authenticated;
grant select on table public.ai_trade_reviews to authenticated;
grant select on table public.brokers to authenticated;
grant select on table public.instruments to authenticated;
grant select on table public.effective_instruments to authenticated;

-- Profiles.
create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check ((select auth.uid()) is not null and id = (select auth.uid()));

-- Accounts: direct mutation intentionally unavailable; see RPCs.
create policy accounts_select_own on public.trading_accounts for select to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

-- Strategies.
create policy strategies_select_own on public.strategies for select to authenticated
using (user_id = (select auth.uid()));
create policy strategies_insert_own on public.strategies for insert to authenticated
with check (user_id = (select auth.uid()));
create policy strategies_update_own on public.strategies for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy strategies_delete_own on public.strategies for delete to authenticated
using (user_id = (select auth.uid()));

-- Trading plans/settings.
create policy plans_select_own on public.trading_plans for select to authenticated
using (user_id = (select auth.uid()));
create policy plans_update_own on public.trading_plans for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy settings_select_own on public.user_trading_settings for select to authenticated
using (user_id = (select auth.uid()));
create policy settings_update_own on public.user_trading_settings for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Per-user instrument configuration.
create policy instrument_settings_select_own on public.user_instrument_settings for select to authenticated
using (user_id = (select auth.uid()));
create policy instrument_settings_insert_own on public.user_instrument_settings for insert to authenticated
with check (user_id = (select auth.uid()));
create policy instrument_settings_update_own on public.user_instrument_settings for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy instrument_settings_delete_own on public.user_instrument_settings for delete to authenticated
using (user_id = (select auth.uid()));

-- Read-only shared catalog.
create policy brokers_select_authenticated on public.brokers for select to authenticated using (true);
create policy instruments_select_authenticated on public.instruments for select to authenticated using (true);

-- Financial/history tables: owner read. Writes happen through verified RPCs.
create policy monthly_select_own on public.monthly_snapshots for select to authenticated
using (user_id = (select auth.uid()));
create policy balance_select_own on public.balance_snapshots for select to authenticated
using (user_id = (select auth.uid()));
create policy trades_select_own on public.trades for select to authenticated
using (user_id = (select auth.uid()));
create policy trade_images_select_own on public.trade_images for select to authenticated
using (user_id = (select auth.uid()));
create policy checklists_select_own on public.pretrade_checklists for select to authenticated
using (user_id = (select auth.uid()));
create policy ai_reviews_select_own on public.ai_trade_reviews for select to authenticated
using (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- Financial helpers inside PostgreSQL (NUMERIC only).
-- ------------------------------------------------------------
create or replace function public.risk_percentage_for_balance(p_balance numeric)
returns numeric
language sql
immutable
strict
as $$
  select case
    when p_balance < 0 then null
    when p_balance <= 500 then 4::numeric
    when p_balance <= 1000 then 3::numeric
    when p_balance <= 5000 then 2::numeric
    else 1::numeric
  end;
$$;

create or replace function public.floor_to_step(p_value numeric, p_step numeric)
returns numeric
language plpgsql
immutable
strict
as $$
begin
  if p_step <= 0 then
    raise exception 'INVALID_LOT_STEP' using errcode = '22023';
  end if;
  return floor(p_value / p_step) * p_step;
end;
$$;

-- ------------------------------------------------------------
-- RPC: create trading account atomically.
-- User identity is always auth.uid(), never an argument.
-- ------------------------------------------------------------
create or replace function public.create_trading_account(
  p_name text,
  p_broker_id uuid,
  p_platform text,
  p_currency text,
  p_initial_balance numeric,
  p_mt5_registered_balance numeric
)
returns public.trading_accounts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.trading_accounts;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'ACCOUNT_NAME_REQUIRED' using errcode = '22023';
  end if;
  if nullif(trim(p_platform), '') is null then
    raise exception 'PLATFORM_REQUIRED' using errcode = '22023';
  end if;
  if p_initial_balance < 0 or p_mt5_registered_balance < 0 then
    raise exception 'BALANCE_CANNOT_BE_NEGATIVE' using errcode = '22023';
  end if;
  if not exists (select 1 from public.brokers where id = p_broker_id and active = true) then
    raise exception 'BROKER_NOT_FOUND' using errcode = '22023';
  end if;

  insert into public.trading_accounts (
    user_id, name, broker_id, platform, currency,
    initial_balance, mt5_registered_balance, journal_calculated_balance
  ) values (
    v_user_id, trim(p_name), p_broker_id, upper(trim(p_platform)), upper(trim(p_currency)),
    p_initial_balance, p_mt5_registered_balance, p_initial_balance
  ) returning * into v_account;

  insert into public.balance_snapshots(user_id, account_id, balance_type, balance)
  values
    (v_user_id, v_account.id, 'MT5_REGISTERED', p_mt5_registered_balance),
    (v_user_id, v_account.id, 'JOURNAL_CALCULATED', p_initial_balance);

  insert into public.monthly_snapshots(user_id, account_id, month_start, monthly_start_balance)
  values (v_user_id, v_account.id, date_trunc('month', timezone('America/Bogota', now()))::date, p_mt5_registered_balance)
  on conflict (account_id, month_start) do nothing;

  return v_account;
end;
$$;

revoke all on function public.create_trading_account(text, uuid, text, text, numeric, numeric) from public;
grant execute on function public.create_trading_account(text, uuid, text, text, numeric, numeric) to authenticated;

-- ------------------------------------------------------------
-- RPC: register the actual MT5 balance without rewriting journal balance.
-- Locks the account row so concurrent updates cannot race.
-- ------------------------------------------------------------
create or replace function public.register_mt5_balance(
  p_account_id uuid,
  p_balance numeric
)
returns public.trading_accounts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.trading_accounts;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_balance < 0 then
    raise exception 'BALANCE_CANNOT_BE_NEGATIVE' using errcode = '22023';
  end if;

  select * into v_account
  from public.trading_accounts
  where id = p_account_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.trading_accounts
     set mt5_registered_balance = p_balance
   where id = p_account_id
   returning * into v_account;

  insert into public.balance_snapshots(user_id, account_id, balance_type, balance)
  values (v_user_id, p_account_id, 'MT5_REGISTERED', p_balance);

  insert into public.monthly_snapshots(user_id, account_id, month_start, monthly_start_balance, mt5_end_balance)
  values (
    v_user_id,
    p_account_id,
    date_trunc('month', timezone('America/Bogota', now()))::date,
    p_balance,
    p_balance
  )
  on conflict (account_id, month_start)
  do update set mt5_end_balance = excluded.mt5_end_balance, updated_at = now();

  return v_account;
end;
$$;

revoke all on function public.register_mt5_balance(uuid, numeric) from public;
grant execute on function public.register_mt5_balance(uuid, numeric) to authenticated;

-- ------------------------------------------------------------
-- RPC: create an executed/study trade as one DB transaction.
-- Revalidates the plan in America/Bogota and serializes same-day creation
-- using an advisory transaction lock per user/date.
-- ------------------------------------------------------------
create or replace function public.create_trade_transactional(
  p_account_id uuid,
  p_instrument_id uuid,
  p_mode public.trade_mode,
  p_direction public.trade_direction,
  p_origin public.trade_origin,
  p_timeframe public.trade_timeframe,
  p_entry_type public.trade_entry_type,
  p_entry_price numeric,
  p_stop_loss_price numeric,
  p_stop_loss_points numeric,
  p_take_profit_price numeric,
  p_take_profit_points numeric,
  p_rr_planned numeric,
  p_actual_lot numeric,
  p_strategy_id uuid,
  p_notes text,
  p_emotion_before public.emotion_before,
  p_followed_plan boolean,
  p_analysis_storage_path text,
  p_analysis_mime_type text,
  p_analysis_size_bytes bigint,
  p_check_market_structure boolean,
  p_check_support_resistance boolean,
  p_check_entry_confirmation boolean,
  p_check_sl_defined boolean,
  p_check_tp_defined boolean,
  p_check_risk_correct boolean,
  p_check_complies_with_plan boolean,
  p_entry_at timestamptz default now()
)
returns public.trades
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.trading_accounts;
  v_plan public.trading_plans;
  v_settings public.user_trading_settings;
  v_instrument record;
  v_trade public.trades;
  v_local_ts timestamp;
  v_trade_date date;
  v_dow integer;
  v_hour integer;
  v_daily_count integer;
  v_daily_wins integer;
  v_daily_losses integer;
  v_month_count integer;
  v_risk_pct numeric;
  v_risk_amount numeric;
  v_stop_distance numeric;
  v_risk_per_lot numeric;
  v_raw_lot numeric;
  v_recommended_lot numeric;
  v_real_risk numeric;
  v_image_exists boolean;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  v_local_ts := timezone('America/Bogota', p_entry_at);
  v_trade_date := v_local_ts::date;
  v_dow := extract(isodow from v_local_ts)::integer;
  v_hour := extract(hour from v_local_ts)::integer;

  -- Prevent two concurrent requests from both passing a daily limit check.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_trade_date::text, 0));

  select * into v_account
  from public.trading_accounts
  where id = p_account_id and user_id = v_user_id and active = true
  for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_plan
  from public.trading_plans
  where user_id = v_user_id and active = true
  order by created_at desc
  limit 1;
  if not found then raise exception 'TRADING_PLAN_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_settings
  from public.user_trading_settings
  where user_id = v_user_id;
  if not found then raise exception 'TRADING_SETTINGS_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_instrument
  from public.effective_instruments
  where id = p_instrument_id and active = true;
  if not found then raise exception 'INSTRUMENT_NOT_FOUND' using errcode = 'P0002'; end if;

  if p_mode = 'REAL' then
    if v_dow = 7 then raise exception 'SUNDAY_BLOCKED' using errcode = 'P0001'; end if;
    if v_dow = 6 and v_hour >= 12 then raise exception 'SATURDAY_AFTER_NOON_BLOCKED' using errcode = 'P0001'; end if;

    select
      count(*) filter (where mode = 'REAL' and status <> 'CANCELLED'),
      count(*) filter (where mode = 'REAL' and status = 'WON'),
      count(*) filter (where mode = 'REAL' and status = 'LOST')
    into v_daily_count, v_daily_wins, v_daily_losses
    from public.trades
    where user_id = v_user_id and trade_date = v_trade_date;

    if v_daily_wins >= v_plan.daily_stop_wins then raise exception 'DAILY_WIN_LIMIT' using errcode = 'P0001'; end if;
    if v_daily_losses >= v_plan.daily_stop_losses then raise exception 'DAILY_LOSS_LIMIT' using errcode = 'P0001'; end if;
    if v_daily_count >= v_plan.daily_max_trades then raise exception 'DAILY_TRADE_LIMIT' using errcode = 'P0001'; end if;

    if v_settings.max_monthly_trades is not null then
      select count(*) into v_month_count
      from public.trades
      where user_id = v_user_id
        and mode = 'REAL'
        and status <> 'CANCELLED'
        and trade_date >= date_trunc('month', v_trade_date)::date
        and trade_date < (date_trunc('month', v_trade_date) + interval '1 month')::date;
      if v_month_count >= v_settings.max_monthly_trades then
        raise exception 'MONTHLY_TRADE_LIMIT' using errcode = 'P0001';
      end if;
    end if;

    if p_analysis_storage_path is null
       or split_part(p_analysis_storage_path, '/', 1) <> v_user_id::text
       or split_part(p_analysis_storage_path, '/', 2) <> 'trades' then
      raise exception 'ANALYSIS_IMAGE_REQUIRED' using errcode = '22023';
    end if;

    if p_analysis_mime_type not in ('image/jpeg','image/png','image/webp') then
      raise exception 'INVALID_IMAGE_MIME' using errcode = '22023';
    end if;
    if p_analysis_size_bytes is null or p_analysis_size_bytes <= 0 or p_analysis_size_bytes > v_settings.max_image_size_bytes then
      raise exception 'INVALID_IMAGE_SIZE' using errcode = '22023';
    end if;

    select exists(
      select 1 from storage.objects
       where bucket_id = 'trade-images'
         and name = p_analysis_storage_path
         and owner_id = v_user_id::text
    ) into v_image_exists;
    if not v_image_exists then raise exception 'ANALYSIS_IMAGE_NOT_FOUND' using errcode = 'P0002'; end if;

    if not (
      p_check_market_structure and p_check_support_resistance and p_check_entry_confirmation
      and p_check_sl_defined and p_check_tp_defined and p_check_risk_correct
      and p_check_complies_with_plan and p_followed_plan
    ) then
      raise exception 'PRETRADE_CHECKLIST_INCOMPLETE' using errcode = '22023';
    end if;
  end if;

  if p_entry_price <= 0 or p_actual_lot <= 0 or p_rr_planned <= 0 then
    raise exception 'INVALID_TRADE_NUMERIC_INPUT' using errcode = '22023';
  end if;
  if p_stop_loss_price is null and p_stop_loss_points is null then
    raise exception 'STOP_LOSS_REQUIRED' using errcode = '22023';
  end if;
  if p_take_profit_price is null and p_take_profit_points is null then
    raise exception 'TAKE_PROFIT_REQUIRED' using errcode = '22023';
  end if;

  v_risk_pct := public.risk_percentage_for_balance(v_account.mt5_registered_balance);
  if v_risk_pct is null then raise exception 'INVALID_ACCOUNT_BALANCE' using errcode = '22023'; end if;
  v_risk_amount := round(v_account.mt5_registered_balance * v_risk_pct / 100, 8);

  -- Study trades do not need executable contract metadata.
  if p_mode = 'REAL' then
    if v_instrument.tick_size is null or v_instrument.tick_value is null or v_instrument.lot_step is null then
      raise exception 'MISSING_CONTRACT_DATA' using errcode = '22023';
    end if;

    v_stop_distance := coalesce(
      p_stop_loss_points,
      abs(p_entry_price - p_stop_loss_price)
    );
    if v_stop_distance <= 0 then raise exception 'INVALID_STOP_DISTANCE' using errcode = '22023'; end if;

    v_risk_per_lot := (v_stop_distance / v_instrument.tick_size) * v_instrument.tick_value;
    if v_risk_per_lot <= 0 then raise exception 'INVALID_CONTRACT_DATA' using errcode = '22023'; end if;

    v_raw_lot := v_risk_amount / v_risk_per_lot;
    v_recommended_lot := public.floor_to_step(v_raw_lot, v_instrument.lot_step);
    if v_instrument.maximum_lot is not null then v_recommended_lot := least(v_recommended_lot, v_instrument.maximum_lot); end if;
    if v_instrument.minimum_lot is not null and v_recommended_lot < v_instrument.minimum_lot then
      raise exception 'BELOW_MINIMUM_LOT' using errcode = 'P0001';
    end if;

    v_real_risk := v_risk_per_lot * p_actual_lot;
    if p_actual_lot > v_recommended_lot and v_real_risk > v_risk_amount and not v_settings.allow_risk_override then
      raise exception 'RISK_OVERRIDE_NOT_ALLOWED' using errcode = 'P0001';
    end if;
  else
    v_recommended_lot := null;
  end if;

  if p_strategy_id is not null and not exists (
    select 1 from public.strategies where id = p_strategy_id and user_id = v_user_id and active = true
  ) then
    raise exception 'STRATEGY_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.trades (
    user_id, account_id, instrument_id, trade_date, entry_time, mode,
    direction, origin, timeframe, entry_type, entry_price,
    stop_loss_price, stop_loss_points, take_profit_price, take_profit_points,
    rr_planned, risk_percentage, risk_amount, recommended_lot, actual_lot,
    balance_before, status, strategy_id, notes, emotion_before, followed_plan,
    analysis_image_url
  ) values (
    v_user_id, p_account_id, p_instrument_id, v_trade_date, p_entry_at, p_mode,
    p_direction, p_origin, p_timeframe, p_entry_type, p_entry_price,
    p_stop_loss_price, p_stop_loss_points, p_take_profit_price, p_take_profit_points,
    p_rr_planned, v_risk_pct, v_risk_amount, v_recommended_lot, p_actual_lot,
    v_account.mt5_registered_balance, 'OPEN', p_strategy_id, p_notes, p_emotion_before,
    p_followed_plan,
    case when p_analysis_storage_path is null then null else p_analysis_storage_path end
  ) returning * into v_trade;

  if p_analysis_storage_path is not null then
    insert into public.trade_images(user_id, trade_id, image_type, storage_path, mime_type, size_bytes)
    values (v_user_id, v_trade.id, 'ANALYSIS', p_analysis_storage_path, p_analysis_mime_type, p_analysis_size_bytes);
  end if;

  if p_mode = 'REAL' then
    insert into public.pretrade_checklists(
      user_id, trade_id, market_structure, support_resistance, entry_confirmation,
      sl_defined, tp_defined, risk_correct, analysis_image_uploaded, complies_with_plan
    ) values (
      v_user_id, v_trade.id, p_check_market_structure, p_check_support_resistance,
      p_check_entry_confirmation, p_check_sl_defined, p_check_tp_defined,
      p_check_risk_correct, true, p_check_complies_with_plan
    );
  end if;

  return v_trade;
end;
$$;

revoke all on function public.create_trade_transactional(
  uuid, uuid, public.trade_mode, public.trade_direction, public.trade_origin,
  public.trade_timeframe, public.trade_entry_type, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, uuid, text, public.emotion_before, boolean,
  text, text, bigint, boolean, boolean, boolean, boolean, boolean, boolean, boolean, timestamptz
) from public;
grant execute on function public.create_trade_transactional(
  uuid, uuid, public.trade_mode, public.trade_direction, public.trade_origin,
  public.trade_timeframe, public.trade_entry_type, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, uuid, text, public.emotion_before, boolean,
  text, text, bigint, boolean, boolean, boolean, boolean, boolean, boolean, boolean, timestamptz
) to authenticated;


-- ------------------------------------------------------------
-- RPC: close a real trade and update journal balance atomically.
-- MT5 registered balance is never modified here.
-- ------------------------------------------------------------
create or replace function public.close_trade_transactional(
  p_trade_id uuid,
  p_status public.trade_status,
  p_pnl_usd numeric,
  p_pnl_points numeric,
  p_emotion_after public.emotion_after,
  p_discipline boolean,
  p_result_storage_path text default null,
  p_result_mime_type text default null,
  p_result_size_bytes bigint default null,
  p_exit_at timestamptz default now()
)
returns public.trades
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_trade public.trades;
  v_account public.trading_accounts;
  v_settings public.user_trading_settings;
  v_new_journal_balance numeric;
  v_r_multiple numeric;
  v_result_exists boolean;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_status not in ('WON','LOST','BREAK_EVEN','CANCELLED') then
    raise exception 'INVALID_CLOSING_STATUS' using errcode = '22023';
  end if;

  select * into v_trade
  from public.trades
  where id = p_trade_id and user_id = v_user_id
  for update;
  if not found then raise exception 'TRADE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_trade.status <> 'OPEN' then raise exception 'TRADE_ALREADY_CLOSED' using errcode = 'P0001'; end if;

  select * into v_account
  from public.trading_accounts
  where id = v_trade.account_id and user_id = v_user_id
  for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_settings from public.user_trading_settings where user_id = v_user_id;
  if not found then raise exception 'TRADING_SETTINGS_NOT_FOUND' using errcode = 'P0002'; end if;

  if p_status = 'WON' and (p_pnl_usd is null or p_pnl_usd <= 0) then
    raise exception 'WIN_REQUIRES_POSITIVE_PNL' using errcode = '22023';
  elsif p_status = 'LOST' and (p_pnl_usd is null or p_pnl_usd >= 0) then
    raise exception 'LOSS_REQUIRES_NEGATIVE_PNL' using errcode = '22023';
  elsif p_status in ('BREAK_EVEN','CANCELLED') and coalesce(p_pnl_usd, 0) <> 0 then
    raise exception 'NON_FINANCIAL_CLOSE_REQUIRES_ZERO_PNL' using errcode = '22023';
  end if;

  if p_exit_at < coalesce(v_trade.entry_time, v_trade.created_at) then
    raise exception 'EXIT_BEFORE_ENTRY' using errcode = '22023';
  end if;

  if p_result_storage_path is not null then
    if split_part(p_result_storage_path, '/', 1) <> v_user_id::text
       or split_part(p_result_storage_path, '/', 2) <> 'trades' then
      raise exception 'INVALID_RESULT_IMAGE_PATH' using errcode = '22023';
    end if;
    if p_result_mime_type not in ('image/jpeg','image/png','image/webp') then
      raise exception 'INVALID_IMAGE_MIME' using errcode = '22023';
    end if;
    if p_result_size_bytes is null or p_result_size_bytes <= 0 or p_result_size_bytes > v_settings.max_image_size_bytes then
      raise exception 'INVALID_IMAGE_SIZE' using errcode = '22023';
    end if;
    select exists(
      select 1 from storage.objects
       where bucket_id = 'trade-images'
         and name = p_result_storage_path
         and owner_id = v_user_id::text
    ) into v_result_exists;
    if not v_result_exists then raise exception 'RESULT_IMAGE_NOT_FOUND' using errcode = 'P0002'; end if;
  end if;

  -- STUDY operations never affect financial balances/statistics.
  if v_trade.mode = 'REAL' and p_status <> 'CANCELLED' then
    v_new_journal_balance := v_account.journal_calculated_balance + coalesce(p_pnl_usd, 0);
    if v_new_journal_balance < 0 then
      raise exception 'JOURNAL_BALANCE_CANNOT_BE_NEGATIVE' using errcode = 'P0001';
    end if;
  else
    v_new_journal_balance := v_account.journal_calculated_balance;
  end if;

  if v_trade.risk_amount > 0 and p_status <> 'CANCELLED' then
    v_r_multiple := coalesce(p_pnl_usd, 0) / v_trade.risk_amount;
  else
    v_r_multiple := null;
  end if;

  update public.trades
     set status = p_status,
         exit_time = p_exit_at,
         pnl_usd = case when v_trade.mode = 'STUDY' then p_pnl_usd else coalesce(p_pnl_usd, 0) end,
         pnl_points = p_pnl_points,
         r_multiple = v_r_multiple,
         balance_after = case when v_trade.mode = 'REAL' then v_new_journal_balance else null end,
         emotion_after = p_emotion_after,
         discipline = p_discipline,
         result_image_url = coalesce(p_result_storage_path, result_image_url)
   where id = p_trade_id
   returning * into v_trade;

  if v_trade.mode = 'REAL' and p_status <> 'CANCELLED' then
    update public.trading_accounts
       set journal_calculated_balance = v_new_journal_balance
     where id = v_account.id;

    insert into public.balance_snapshots(user_id, account_id, balance_type, balance)
    values (v_user_id, v_account.id, 'JOURNAL_CALCULATED', v_new_journal_balance);

    insert into public.monthly_snapshots(
      user_id, account_id, month_start, monthly_start_balance, journal_end_balance
    ) values (
      v_user_id,
      v_account.id,
      date_trunc('month', timezone('America/Bogota', p_exit_at))::date,
      v_account.mt5_registered_balance,
      v_new_journal_balance
    )
    on conflict (account_id, month_start)
    do update set journal_end_balance = excluded.journal_end_balance, updated_at = now();
  end if;

  if p_result_storage_path is not null then
    insert into public.trade_images(user_id, trade_id, image_type, storage_path, mime_type, size_bytes)
    values (v_user_id, v_trade.id, 'RESULT', p_result_storage_path, p_result_mime_type, p_result_size_bytes);
  end if;

  return v_trade;
end;
$$;

revoke all on function public.close_trade_transactional(
  uuid, public.trade_status, numeric, numeric, public.emotion_after, boolean,
  text, text, bigint, timestamptz
) from public;
grant execute on function public.close_trade_transactional(
  uuid, public.trade_status, numeric, numeric, public.emotion_after, boolean,
  text, text, bigint, timestamptz
) to authenticated;

commit;
