-- Execute uma vez no SQL Editor do Supabase para habilitar contas contínuas.
alter table public.debts
  add column if not exists is_continuous boolean not null default false,
  add column if not exists paid_month text;

comment on column public.debts.is_continuous is 'Indica uma conta que se repete mensalmente.';
comment on column public.debts.paid_month is 'Mês (YYYY-MM) em que a conta contínua foi marcada como paga.';
