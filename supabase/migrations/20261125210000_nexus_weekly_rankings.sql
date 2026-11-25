-- Ranking semanal por jogo (semana começa na segunda, fuso de São Paulo), rival acima e prêmios do top 3.
create table if not exists public.nexus_weekly_prizes(
 user_id uuid not null references auth.users(id) on delete cascade,
 week_start date not null,
 game_key text not null,
 rank int not null,
 coins int not null,
 claimed_at timestamptz not null default now(),
 primary key(user_id,week_start,game_key)
);
alter table public.nexus_weekly_prizes enable row level security;
drop policy if exists "weekly prizes own read" on public.nexus_weekly_prizes;
create policy "weekly prizes own read" on public.nexus_weekly_prizes for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.nexus_rank_board(game_key_input text, period_input text default 'all', limit_input int default 50)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare v_lim int:=least(greatest(coalesce(limit_input,50),1),100); v jsonb;
 v_start date:=(date_trunc('week',now() at time zone 'America/Sao_Paulo'))::date;
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 with agg as (
  select m.user_id,max(m.score) best,count(*) matches,count(*) filter (where m.won) wins
  from public.competition_match_history m
  where m.game_key=game_key_input and (period_input<>'week' or (m.played_at at time zone 'America/Sao_Paulo')::date>=v_start)
  group by m.user_id
 ), ranked as (
  select a.*,row_number() over (order by a.best desc,a.matches desc,a.user_id) rnk,p.username,p.display_name,p.avatar,p.avatar_frame
  from agg a join public.social_profiles p on p.user_id=a.user_id and coalesce(p.is_suspended,false)=false
 ), me as (select * from ranked where user_id=auth.uid())
 select jsonb_build_object(
  'top',coalesce((select jsonb_agg(to_jsonb(r)-'rnk'||jsonb_build_object('rank',r.rnk) order by r.rnk) from ranked r where r.rnk<=v_lim),'[]'::jsonb),
  'me',(select to_jsonb(r)-'rnk'||jsonb_build_object('rank',r.rnk) from me r),
  'above',(select to_jsonb(r)-'rnk'||jsonb_build_object('rank',r.rnk) from ranked r where r.rnk=(select rnk-1 from me)),
  'players',(select count(*) from ranked),
  'ends_at',((v_start+7)::timestamp at time zone 'America/Sao_Paulo')) into v;
 return v;
end; $$;

create or replace function public.nexus_weekly_prizes(claim_input boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_cur date:=(date_trunc('week',now() at time zone 'America/Sao_Paulo'))::date; v_prev date;
 g text; r record; v_coins int; v_total int:=0; v_list jsonb:='[]'::jsonb; v_done boolean;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 v_prev:=v_cur-7;
 foreach g in array array['space-nexus','piggy-run','extra-gems','extra-dungeon','extra-race','extra-defense','quiz'] loop
  select x.rnk into r from (
   select a.user_id,row_number() over (order by a.best desc,a.matches desc,a.user_id) rnk from (
    select m.user_id,max(m.score) best,count(*) matches from public.competition_match_history m
    join public.social_profiles p on p.user_id=m.user_id and coalesce(p.is_suspended,false)=false
    where m.game_key=g and (m.played_at at time zone 'America/Sao_Paulo')::date>=v_prev and (m.played_at at time zone 'America/Sao_Paulo')::date<v_cur group by m.user_id) a
  ) x where x.user_id=v_uid and x.rnk<=3;
  if found then
   v_coins:=case r.rnk when 1 then 300 when 2 then 150 else 75 end;
   select exists(select 1 from public.nexus_weekly_prizes w where w.user_id=v_uid and w.week_start=v_prev and w.game_key=g) into v_done;
   if claim_input and not v_done then
    insert into public.nexus_weekly_prizes(user_id,week_start,game_key,rank,coins) values(v_uid,v_prev,g,r.rnk,v_coins) on conflict do nothing;
    insert into public.nexus_loot_wallets(user_id,coins,collection_score) values(v_uid,v_coins,0)
     on conflict (user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,updated_at=now();
    v_done:=true; v_total:=v_total+v_coins;
   elsif not v_done then v_total:=v_total+v_coins; end if;
   v_list:=v_list||jsonb_build_array(jsonb_build_object('game_key',g,'rank',r.rnk,'coins',v_coins,'claimed',v_done));
  end if;
 end loop;
 return jsonb_build_object('prizes',v_list,'total',v_total,'week_start',v_prev);
end; $$;

revoke all on function public.nexus_rank_board(text,text,int),public.nexus_weekly_prizes(boolean) from public,anon;
grant execute on function public.nexus_rank_board(text,text,int),public.nexus_weekly_prizes(boolean) to authenticated;
