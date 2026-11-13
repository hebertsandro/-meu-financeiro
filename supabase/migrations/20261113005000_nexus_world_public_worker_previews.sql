drop policy if exists "Clan members view NEXUS World workers" on public.social_world_workers;
create policy "NEXUS World workers are visible with public islands" on public.social_world_workers
 for select to authenticated using (true);
