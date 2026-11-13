create table if not exists public.social_clan_world_buildings (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.social_clans(id) on delete cascade,
  building_type text not null check (building_type in ('house','observatory','garden','lighthouse','workshop')),
  slot smallint not null check (slot between 1 and 8),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (clan_id, slot)
);
alter table public.social_clan_world_buildings enable row level security;
drop policy if exists "Clan members view island buildings" on public.social_clan_world_buildings;
create policy "Clan members view island buildings" on public.social_clan_world_buildings for select to authenticated using (exists (select 1 from public.social_clan_members m where m.clan_id = social_clan_world_buildings.clan_id and m.user_id = (select auth.uid())));
drop policy if exists "Clan members build on their island" on public.social_clan_world_buildings;
create policy "Clan members build on their island" on public.social_clan_world_buildings for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.social_clan_members m where m.clan_id = social_clan_world_buildings.clan_id and m.user_id = (select auth.uid())));
drop policy if exists "Builders and clan founders remove island buildings" on public.social_clan_world_buildings;
create policy "Builders and clan founders remove island buildings" on public.social_clan_world_buildings for delete to authenticated using (created_by = (select auth.uid()) or exists (select 1 from public.social_clans c where c.id = social_clan_world_buildings.clan_id and c.created_by = (select auth.uid())));
grant select, insert, delete on public.social_clan_world_buildings to authenticated;
revoke all on public.social_clan_world_buildings from anon;
