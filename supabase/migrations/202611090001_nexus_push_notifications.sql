create table if not exists public.nexus_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.nexus_push_subscriptions enable row level security;

drop policy if exists "Users can read their own push subscriptions" on public.nexus_push_subscriptions;
create policy "Users can read their own push subscriptions" on public.nexus_push_subscriptions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can register their own push subscriptions" on public.nexus_push_subscriptions;
create policy "Users can register their own push subscriptions" on public.nexus_push_subscriptions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own push subscriptions" on public.nexus_push_subscriptions;
create policy "Users can update their own push subscriptions" on public.nexus_push_subscriptions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own push subscriptions" on public.nexus_push_subscriptions;
create policy "Users can remove their own push subscriptions" on public.nexus_push_subscriptions for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.nexus_push_subscriptions to authenticated;
