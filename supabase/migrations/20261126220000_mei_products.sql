create table if not exists public.mei_products(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 80),
 price numeric(12,2) not null check (price>=0),
 margin numeric(6,2) not null default 0,
 data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists mei_products_user_idx on public.mei_products(user_id,created_at desc);
alter table public.mei_products enable row level security;
create policy "mei_products_select_own" on public.mei_products for select to authenticated using (user_id=(select auth.uid()));
create policy "mei_products_insert_own" on public.mei_products for insert to authenticated with check (user_id=(select auth.uid()));
create policy "mei_products_update_own" on public.mei_products for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "mei_products_delete_own" on public.mei_products for delete to authenticated using (user_id=(select auth.uid()));
