begin;

-- Phase 5: safe per-user instrument configuration.
-- The shared catalog remains read-only; users only manage their own overrides.


-- Expose broker metadata directly from the view so API consumers do not rely
-- on relationship inference through a PostgreSQL view.
create or replace view public.instrument_catalog_view
with (security_invoker = true)
as
select
  e.id,
  e.broker_id,
  b.code as broker_code,
  b.display_name as broker_name,
  e.display_name,
  e.category,
  e.symbol,
  e.minimum_lot,
  e.lot_step,
  e.maximum_lot,
  e.tick_size,
  e.tick_value,
  e.contract_size,
  e.base_lot,
  e.strategy_bias,
  e.requires_configuration,
  e.active,
  e.configured_by_user_id
from public.effective_instruments e
join public.brokers b on b.id = e.broker_id;

grant select on table public.instrument_catalog_view to authenticated;

-- All mutations now go through the validated RPCs below.
revoke insert, update, delete on table public.user_instrument_settings from authenticated;
grant select on table public.user_instrument_settings to authenticated;


create or replace function public.upsert_user_instrument_settings(
  p_instrument_id uuid,
  p_symbol text default null,
  p_minimum_lot numeric default null,
  p_lot_step numeric default null,
  p_maximum_lot numeric default null,
  p_tick_size numeric default null,
  p_tick_value numeric default null,
  p_contract_size numeric default null,
  p_base_lot numeric default null,
  p_active boolean default true
)
returns public.user_instrument_settings
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.user_instrument_settings;
  v_requires_configuration boolean;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (select 1 from public.instruments where id = p_instrument_id and active = true) then
    raise exception 'INSTRUMENT_NOT_FOUND';
  end if;

  if p_minimum_lot is not null and p_minimum_lot <= 0 then raise exception 'INVALID_MINIMUM_LOT'; end if;
  if p_lot_step is not null and p_lot_step <= 0 then raise exception 'INVALID_LOT_STEP'; end if;
  if p_maximum_lot is not null and p_maximum_lot <= 0 then raise exception 'INVALID_MAXIMUM_LOT'; end if;
  if p_minimum_lot is not null and p_maximum_lot is not null and p_maximum_lot < p_minimum_lot then
    raise exception 'MAXIMUM_LOT_BELOW_MINIMUM';
  end if;
  if p_tick_size is not null and p_tick_size <= 0 then raise exception 'INVALID_TICK_SIZE'; end if;
  if p_tick_value is not null and p_tick_value <= 0 then raise exception 'INVALID_TICK_VALUE'; end if;
  if p_contract_size is not null and p_contract_size <= 0 then raise exception 'INVALID_CONTRACT_SIZE'; end if;
  if p_base_lot is not null and p_base_lot <= 0 then raise exception 'INVALID_BASE_LOT'; end if;

  -- Product requirement: do not consider an instrument contractually configured
  -- until the fields required for precise risk sizing are known.
  v_requires_configuration := not (
    p_minimum_lot is not null and
    p_lot_step is not null and
    p_tick_size is not null and
    p_tick_value is not null and
    p_contract_size is not null
  );

  insert into public.user_instrument_settings (
    user_id, instrument_id, symbol, minimum_lot, lot_step, maximum_lot,
    tick_size, tick_value, contract_size, base_lot,
    requires_configuration, active
  ) values (
    v_user_id, p_instrument_id, nullif(trim(p_symbol), ''), p_minimum_lot, p_lot_step, p_maximum_lot,
    p_tick_size, p_tick_value, p_contract_size, p_base_lot,
    v_requires_configuration, p_active
  )
  on conflict (user_id, instrument_id) do update set
    symbol = excluded.symbol,
    minimum_lot = excluded.minimum_lot,
    lot_step = excluded.lot_step,
    maximum_lot = excluded.maximum_lot,
    tick_size = excluded.tick_size,
    tick_value = excluded.tick_value,
    contract_size = excluded.contract_size,
    base_lot = excluded.base_lot,
    requires_configuration = excluded.requires_configuration,
    active = excluded.active,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.reset_user_instrument_settings(p_instrument_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;

  delete from public.user_instrument_settings
   where user_id = v_user_id
     and instrument_id = p_instrument_id;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.upsert_user_instrument_settings(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,boolean) from public, anon;
revoke all on function public.reset_user_instrument_settings(uuid) from public, anon;
grant execute on function public.upsert_user_instrument_settings(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,boolean) to authenticated;
grant execute on function public.reset_user_instrument_settings(uuid) to authenticated;

commit;
