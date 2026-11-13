create table if not exists public.social_world_discoveries (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.social_clans(id) on delete cascade,
 discovery_key text not null check (discovery_key in ('aurora','crystal','ancient_gate','sky_garden','deep_signal')),
 discovered_by uuid not null references auth.users(id) on delete cascade,
 discovered_at timestamptz not null default now(),
 unique (clan_id, discovery_key)
);
alter table public.social_world_discoveries enable row level security;
drop policy if exists "World discoveries are visible" on public.social_world_discoveries;
create policy "World discoveries are visible" on public.social_world_discoveries for select to authenticated using (true);
drop policy if exists "Clan members discover territories" on public.social_world_discoveries;
create policy "Clan members discover territories" on public.social_world_discoveries for insert to authenticated with check (discovered_by = (select auth.uid()) and exists (select 1 from public.social_clan_members m where m.clan_id = social_world_discoveries.clan_id and m.user_id = (select auth.uid())));
grant select,insert on public.social_world_discoveries to authenticated;
revoke all on public.social_world_discoveries from anon;
create table if not exists public.social_world_events (
 id uuid primary key default gen_random_uuid(),
 event_key text not null unique,
 title text not null,
 description text not null,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 target_discoveries integer not null default 5 check (target_discoveries > 0),
 created_at timestamptz not null default now()
);
alter table public.social_world_events enable row level security;
drop policy if exists "World events are publicly readable" on public.social_world_events;
create policy "World events are publicly readable" on public.social_world_events for select to authenticated using (true);
grant select on public.social_world_events to authenticated;
revoke all on public.social_world_events from anon;
insert into public.social_world_events(event_key,title,description,starts_at,ends_at,target_discoveries)
values ('first_contact_2026','O Primeiro Contato','Explore os cinco territórios ocultos e ajude a ativar o portal central do NEXUS World.',now(),now()+interval '30 days',5)
on conflict (event_key) do nothing;

do $$ begin if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_world_discoveries') then alter publication supabase_realtime add table public.social_world_discoveries; end if; end $$;
