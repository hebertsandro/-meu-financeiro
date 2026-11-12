create or replace function public.competition_mp_is_member(room_id_input uuid) returns boolean
language sql stable security definer set search_path=public,auth as $$
 select exists(select 1 from public.competition_mp_members m where m.room_id=room_id_input and m.user_id=auth.uid())
$$;
revoke all on function public.competition_mp_is_member(uuid) from public,anon;
grant execute on function public.competition_mp_is_member(uuid) to authenticated;
drop policy if exists "mp members read rooms" on public.competition_mp_rooms;
create policy "mp members read rooms" on public.competition_mp_rooms for select to authenticated using (public.competition_mp_is_member(id));
drop policy if exists "mp members read roster" on public.competition_mp_members;
create policy "mp members read roster" on public.competition_mp_members for select to authenticated using (public.competition_mp_is_member(room_id));
drop policy if exists "mp members read answers" on public.competition_mp_answers;
create policy "mp members read answers" on public.competition_mp_answers for select to authenticated using (public.competition_mp_is_member(room_id));
