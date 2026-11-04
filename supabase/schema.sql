-- Execute este arquivo no SQL Editor do seu projeto Supabase.
-- As políticas RLS limitam cada registro ao usuário autenticado que o criou.
create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  type text not null check (type in ('entrada','gasto')),
  category text not null default 'Outros',
  description text not null default '',
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  limit_amount numeric(12,2) not null default 0 check (limit_amount >= 0),
  used numeric(12,2) not null default 0 check (used >= 0),
  due_day integer check (due_day between 1 and 31),
  created_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  status text not null default 'Pendente' check (status in ('Pendente','Pago')),
  is_continuous boolean not null default false,
  paid_month text,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target numeric(12,2) not null check (target > 0),
  saved numeric(12,2) not null default 0 check (saved >= 0),
  deadline date,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
alter table public.cards enable row level security;
alter table public.debts enable row level security;
alter table public.goals enable row level security;

drop policy if exists "Users manage own transactions" on public.transactions;
create policy "Users manage own transactions" on public.transactions for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own cards" on public.cards;
create policy "Users manage own cards" on public.cards for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own debts" on public.debts;
create policy "Users manage own debts" on public.debts for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals" on public.goals for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.transactions, public.cards, public.debts, public.goals to authenticated;
