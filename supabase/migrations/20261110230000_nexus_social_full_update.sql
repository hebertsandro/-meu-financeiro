create table if not exists public.social_post_polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.social_posts(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(question) between 5 and 180),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 4),
  created_at timestamptz not null default now()
);
create table if not exists public.social_post_poll_votes (
  poll_id uuid not null references public.social_post_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check (option_index between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
create table if not exists public.social_clan_updates (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.social_clans(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('announcement','event','post')),
  title text not null check (char_length(title) between 3 and 100),
  body text not null default '' check (char_length(body) <= 2000),
  starts_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists social_post_polls_post_id_idx on public.social_post_polls(post_id);
create index if not exists social_post_poll_votes_poll_id_idx on public.social_post_poll_votes(poll_id);
create index if not exists social_clan_updates_clan_created_idx on public.social_clan_updates(clan_id, created_at desc);
alter table public.social_post_polls enable row level security;
alter table public.social_post_poll_votes enable row level security;
alter table public.social_clan_updates enable row level security;
grant select, insert, update, delete on public.social_post_polls to authenticated;
grant select, insert, update, delete on public.social_post_poll_votes to authenticated;
grant select, insert, update, delete on public.social_clan_updates to authenticated;
drop policy if exists "Feed members read polls" on public.social_post_polls;
create policy "Feed members read polls" on public.social_post_polls for select to authenticated using (exists (select 1 from public.social_posts p where p.id = post_id and private.social_feed_can_view_author(p.author_id)));
drop policy if exists "Authors create polls on own posts" on public.social_post_polls;
create policy "Authors create polls on own posts" on public.social_post_polls for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.social_posts p where p.id = post_id and p.author_id = (select auth.uid())));
drop policy if exists "Authors update own polls" on public.social_post_polls;
create policy "Authors update own polls" on public.social_post_polls for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
drop policy if exists "Authors delete own polls" on public.social_post_polls;
create policy "Authors delete own polls" on public.social_post_polls for delete to authenticated using (created_by = (select auth.uid()));
drop policy if exists "Feed members read poll votes" on public.social_post_poll_votes;
create policy "Feed members read poll votes" on public.social_post_poll_votes for select to authenticated using (exists (select 1 from public.social_post_polls po join public.social_posts p on p.id = po.post_id where po.id = poll_id and private.social_feed_can_view_author(p.author_id)));
drop policy if exists "Users vote once per poll" on public.social_post_poll_votes;
create policy "Users vote once per poll" on public.social_post_poll_votes for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.social_post_polls po join public.social_posts p on p.id = po.post_id where po.id = poll_id and private.social_feed_can_view_author(p.author_id) and option_index < jsonb_array_length(po.options)));
drop policy if exists "Users change own poll vote" on public.social_post_poll_votes;
create policy "Users change own poll vote" on public.social_post_poll_votes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "Users remove own poll vote" on public.social_post_poll_votes;
create policy "Users remove own poll vote" on public.social_post_poll_votes for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Clan members read updates" on public.social_clan_updates;
create policy "Clan members read updates" on public.social_clan_updates for select to authenticated using (exists (select 1 from public.social_clan_members m where m.clan_id = social_clan_updates.clan_id and m.user_id = (select auth.uid())));
drop policy if exists "Clan officers create updates" on public.social_clan_updates;
create policy "Clan officers create updates" on public.social_clan_updates for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.social_clan_members m where m.clan_id = social_clan_updates.clan_id and m.user_id = (select auth.uid()) and m.role in ('leader','officer')));
drop policy if exists "Clan officers update updates" on public.social_clan_updates;
create policy "Clan officers update updates" on public.social_clan_updates for update to authenticated using (exists (select 1 from public.social_clan_members m where m.clan_id = social_clan_updates.clan_id and m.user_id = (select auth.uid()) and m.role in ('leader','officer'))) with check (exists (select 1 from public.social_clan_members m where m.clan_id = social_clan_updates.clan_id and m.user_id = (select auth.uid()) and m.role in ('leader','officer')));
drop policy if exists "Clan officers delete updates" on public.social_clan_updates;
create policy "Clan officers delete updates" on public.social_clan_updates for delete to authenticated using (exists (select 1 from public.social_clan_members m where m.clan_id = social_clan_updates.clan_id and m.user_id = (select auth.uid()) and m.role in ('leader','officer')));
do $$ begin alter publication supabase_realtime add table public.social_post_polls; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.social_post_poll_votes; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.social_clan_updates; exception when duplicate_object then null; when undefined_object then null; end $$;