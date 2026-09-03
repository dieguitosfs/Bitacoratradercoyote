-- FASE 6: canonical financial risk helpers in PostgreSQL.
-- All calculations use NUMERIC; no floating-point types are used.

create or replace function public.risk_percentage_for_balance(p_balance numeric)
returns numeric
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when p_balance < 0 then null
    when p_balance <= 500 then 4::numeric
    when p_balance <= 1000 then 3::numeric
    when p_balance <= 5000 then 2::numeric
    else 1::numeric
  end;
$$;

create or replace function public.risk_amount_for_balance(p_balance numeric)
returns numeric
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when public.risk_percentage_for_balance(p_balance) is null then null
    else round(p_balance * public.risk_percentage_for_balance(p_balance) / 100, 8)
  end;
$$;

revoke all on function public.risk_percentage_for_balance(numeric) from public, anon;
revoke all on function public.risk_amount_for_balance(numeric) from public, anon;
grant execute on function public.risk_percentage_for_balance(numeric) to authenticated, service_role;
grant execute on function public.risk_amount_for_balance(numeric) to authenticated, service_role;

comment on function public.risk_percentage_for_balance(numeric) is
  'Canonical account risk percentage: <=500 4%, <=1000 3%, <=5000 2%, >5000 1%.';
comment on function public.risk_amount_for_balance(numeric) is
  'Canonical maximum risk amount for a balance, using NUMERIC arithmetic.';
