begin;

-- Phase 4: Trading account management.
-- Financial balances remain protected: MT5 balance changes only through
-- register_mt5_balance(); journal balance changes only through trade settlement.

create or replace function public.update_trading_account(
  p_account_id uuid,
  p_name text,
  p_broker_id uuid,
  p_platform text,
  p_currency text
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
  if p_currency !~ '^[A-Za-z]{3}$' then
    raise exception 'INVALID_CURRENCY' using errcode = '22023';
  end if;
  if not exists (select 1 from public.brokers where id = p_broker_id and active = true) then
    raise exception 'BROKER_NOT_FOUND' using errcode = '22023';
  end if;

  select * into v_account
  from public.trading_accounts
  where id = p_account_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.trading_accounts
     set name = trim(p_name),
         broker_id = p_broker_id,
         platform = upper(trim(p_platform)),
         currency = upper(trim(p_currency))
   where id = p_account_id
   returning * into v_account;

  return v_account;
end;
$$;

revoke all on function public.update_trading_account(uuid, text, uuid, text, text) from public;
grant execute on function public.update_trading_account(uuid, text, uuid, text, text) to authenticated;

create or replace function public.set_trading_account_active(
  p_account_id uuid,
  p_active boolean
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

  select * into v_account
  from public.trading_accounts
  where id = p_account_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.trading_accounts
     set active = p_active
   where id = p_account_id
   returning * into v_account;

  return v_account;
end;
$$;

revoke all on function public.set_trading_account_active(uuid, boolean) from public;
grant execute on function public.set_trading_account_active(uuid, boolean) to authenticated;

-- Indexes for account screens and snapshot history.
create index if not exists trading_accounts_user_active_idx
  on public.trading_accounts(user_id, active, created_at desc);

create index if not exists balance_snapshots_account_captured_idx
  on public.balance_snapshots(account_id, captured_at desc);

commit;
