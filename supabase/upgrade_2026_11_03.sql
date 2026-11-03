-- Atualização incremental do Meu Financeiro.
-- Execute no SQL Editor do Supabase. Não apaga nem altera os registros existentes.

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  total_amount numeric(12,2) not null check (total_amount > 0),
  installment_count integer not null check (installment_count between 2 and 120),
  first_due_date date not null,
  card_id uuid references public.cards(id) on delete set null,
  paid_count integer not null default 0 check (paid_count >= 0),
  created_at timestamptz not null default now(),
  check (paid_count <= installment_count)
);

create table if not exists public.card_limit_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  previous_limit numeric(12,2) not null,
  new_limit numeric(12,2) not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.goal_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  movement_type text not null check (movement_type in ('deposito','retirada')),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

alter table public.installments enable row level security;
alter table public.card_limit_history enable row level security;
alter table public.goal_movements enable row level security;

drop policy if exists "Users manage own installments" on public.installments;
create policy "Users manage own installments" on public.installments for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own card limit history" on public.card_limit_history;
create policy "Users manage own card limit history" on public.card_limit_history for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own goal movements" on public.goal_movements;
create policy "Users manage own goal movements" on public.goal_movements for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.installments, public.card_limit_history, public.goal_movements to authenticated;
