-- NEXUS COMPETITION: medalhas de campeões globais e torneios semanais
create table if not exists public.competition_rank_medals(user_id uuid not null references auth.users(id) on delete cascade,medal_key text not null check(medal_key in ('global-season','weekly-tournament')),medals_count integer not null default 0 check(medals_count>=0),updated_at timestamptz not null default now(),primary key(user_id,medal_key));
create table if not exists public.competition_awarded_periods(period_type text not null check(period_type in ('season','tournament')),period_id uuid not null,awarded_at timestamptz not null default now(),primary key(period_type,period_id));
alter table public.competition_rank_medals enable row level security;
alter table public.competition_awarded_periods enable row level security;
drop policy if exists "Users read own rank medals" on public.competition_rank_medals;
create policy "Users read own rank medals" on public.competition_rank_medals for select to authenticated using(user_id=(select auth.uid()));
grant select on public.competition_rank_medals to authenticated;
create or replace function public.competition_finalize_periods()
returns integer language plpgsql security definer set search_path='' as $$
declare period record; claimed uuid; winner uuid; awarded integer:=0;
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
   update public.competition_weekly_tournaments set status='completed' where id=period.id;awarded:=awarded+1;
  end if;
 end loop;
 return awarded;
end; $$;
revoke all on function public.competition_finalize_periods() from public,anon;
grant execute on function public.competition_finalize_periods() to authenticated;