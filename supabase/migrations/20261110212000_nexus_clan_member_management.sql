-- Only the clan creator can manage roles; members may leave themselves.
drop policy if exists "Clan leaders manage member roles" on public.social_clan_members;
create policy "Clan leaders manage member roles" on public.social_clan_members for update to authenticated
using(exists(select 1 from public.social_clans c where c.id=clan_id and c.created_by=(select auth.uid())))
with check(role in ('leader','officer','member') and exists(select 1 from public.social_clans c where c.id=clan_id and c.created_by=(select auth.uid())));
drop policy if exists "Clan leaders remove members" on public.social_clan_members;
create policy "Clan leaders remove members" on public.social_clan_members for delete to authenticated
using(user_id=(select auth.uid()) or exists(select 1 from public.social_clans c where c.id=clan_id and c.created_by=(select auth.uid())));
