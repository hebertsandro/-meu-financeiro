alter table public.social_clan_world_buildings drop constraint if exists social_clan_world_buildings_building_type_check;
alter table public.social_clan_world_buildings add constraint social_clan_world_buildings_building_type_check check (building_type in ('house','observatory','garden','lighthouse','workshop','archive','portal','dock'));
drop policy if exists "Clan members view island buildings" on public.social_clan_world_buildings;
drop policy if exists "NEXUS World islands are discoverable" on public.social_clan_world_buildings;
create policy "NEXUS World islands are discoverable" on public.social_clan_world_buildings for select to authenticated using (true);
grant select,insert,delete on public.social_clan_world_buildings to authenticated;
