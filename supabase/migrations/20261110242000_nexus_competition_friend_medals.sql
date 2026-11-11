alter table public.competition_rank_medals drop constraint if exists competition_rank_medals_medal_key_check;
alter table public.competition_rank_medals add constraint competition_rank_medals_medal_key_check check(medal_key in ('global-season','weekly-tournament','friends-weekly'));
create or replace function public.competition_finalize_periods()
returns integer language plpgsql security definer set search_path='' as $$
declare period record; claimed uuid; winner uuid; friend_winner uuid; awarded integer:=0;
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 for period in select s.id from public.competition_seasons s where s.ends_at<=now() loop
  claimed:=null;
  insert into public.competition_awarded_periods(period_type,period_id) values('season',period.id) on conflict do nothing returning period_id into claimed;
  if claimed is not null then
   select x.user_id into winner from public.competition_season_scores x where x.season_id=period.id order by x.xp_points desc,x.total_score desc,x.wins desc,x.updated_at asc limit 1;
   if winner is not null then insert into public.competition_rank_medals(user_id,medal_key,medals_count,updated_at) values(winner,'global-season',1,now()) on conflict(user_id,medal_key) do update set medals_count=public.competition_rank_medals.medals_count+1,updated_at=now(); end if;
   update public.competition_seasons set status='completed' where id=period.id;awarded:=awarded+1;
  end if;
 end loop;
 for period in select t.id from public.competition_weekly_tournaments t where t.ends_at<=now() loop
  claimed:=null;
  insert into public.competition_awarded_periods(period_type,period_id) values('tournament',period.id) on conflict do nothing returning period_id into claimed;
  if claimed is not null then
   select x.user_id into winner from public.competition_tournament_entries x where x.tournament_id=period.id order by x.points desc,x.matches_played desc,x.updated_at asc limit 1;
   if winner is not null then insert into public.competition_rank_medals(user_id,medal_key,medals_count,updated_at) values(winner,'weekly-tournament',1,now()) on conflict(user_id,medal_key) do update set medals_count=public.competition_rank_medals.medals_count+1,updated_at=now(); end if;
   for friend_winner in
    select e.user_id from public.competition_tournament_entries e
    where e.tournament_id=period.id
      and exists(select 1 from public.social_friendships f join public.competition_tournament_entries fe on fe.tournament_id=e.tournament_id and fe.user_id=case when f.user_a=e.user_id then f.user_b else f.user_a end where f.user_a=e.user_id or f.user_b=e.user_id)
      and not exists(select 1 from public.social_friendships f join public.competition_tournament_entries fe on fe.tournament_id=e.tournament_id and fe.user_id=case when f.user_a=e.user_id then f.user_b else f.user_a end where (f.user_a=e.user_id or f.user_b=e.user_id) and fe.points>e.points)
   loop
    insert into public.competition_rank_medals(user_id,medal_key,medals_count,updated_at) values(friend_winner,'friends-weekly',1,now())
    on conflict(user_id,medal_key) do update set medals_count=public.competition_rank_medals.medals_count+1,updated_at=now();
   end loop;
   update public.competition_weekly_tournaments set status='completed' where id=period.id;awarded:=awarded+1;
  end if;
 end loop;
 return awarded;
end; $$;
revoke all on function public.competition_finalize_periods() from public,anon;
grant execute on function public.competition_finalize_periods() to authenticated;