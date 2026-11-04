-- Assinaturas recorrentes do Meu Financeiro
-- Execute este arquivo uma única vez no SQL Editor do Supabase.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  frequency text not null default 'mensal' check (frequency in ('mensal','anual')),
  next_charge_date date not null,
  card_id uuid references public.cards(id) on delete set null,
  status text not null default 'Ativa' check (status in ('Ativa','Cancelada')),
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
alter table public.subscriptions enable row level security;
drop policy if exists "Users manage own subscriptions" on public.subscriptions;
create policy "Users manage own subscriptions" on public.subscriptions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.subscriptions to authenticated;
