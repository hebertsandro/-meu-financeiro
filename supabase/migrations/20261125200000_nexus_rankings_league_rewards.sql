-- Top global por jogo, top global da liga e baús de promoção de liga.
create table if not exists public.nexus_league_rewards(
 user_id uuid not null references auth.users(id) on delete cascade,
 league_idx int not null,
 claimed_at timestamptz not null default now(),
 primary key(user_id,league_idx)
);
alter table public.nexus_league_rewards enable row level security;
drop policy if exists "league rewards own read" on public.nexus_league_rewards;
create policy "league rewards own read" on public.nexus_league_rewards for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.nexus_game_leaderboard(game_key_input text, limit_input int default 50)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare v_lim int:=least(greatest(coalesce(limit_input,50),1),100); v jsonb;
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 with agg as (
  select m.user_id,max(m.score) best,count(*) matches,count(*) filter (where m.won) wins
  from public.competition_match_history m where m.game_key=game_key_input group by m.user_id
 ), ranked as (
  select a.*,row_number() over (order by a.best desc,a.matches desc,a.user_id) rnk,p.username,p.display_name,p.avatar,p.avatar_frame,coalesce(p.game_xp,0) game_xp
  from agg a join public.social_profiles p on p.user_id=a.user_id and coalesce(p.is_suspended,false)=false
 )
 select jsonb_build_object(
  'top',coalesce((select jsonb_agg(to_jsonb(r)-'rnk'||jsonb_build_object('rank',r.rnk) order by r.rnk) from ranked r where r.rnk<=v_lim),'[]'::jsonb),
  'me',(select to_jsonb(r)-'rnk'||jsonb_build_object('rank',r.rnk) from ranked r where r.user_id=auth.uid()),
  'players',(select count(*) from ranked)) into v;
 return v;
end; $$;

create or replace function public.nexus_league_leaderboard(limit_input int default 50)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare v_lim int:=least(greatest(coalesce(limit_input,50),1),100); v jsonb;
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 with ranked as (
  select p.user_id,p.username,p.display_name,p.avatar,p.avatar_frame,coalesce(p.game_xp,0) game_xp,
   row_number() over (order by coalesce(p.game_xp,0) desc,p.user_id) rnk
  from public.social_profiles p where coalesce(p.is_suspended,false)=false and coalesce(p.game_xp,0)>0
 )
 select jsonb_build_object(
  'top',coalesce((select jsonb_agg(to_jsonb(r)-'rnk'||jsonb_build_object('rank',r.rnk) order by r.rnk) from ranked r where r.rnk<=v_lim),'[]'::jsonb),
  'me',(select to_jsonb(r)-'rnk'||jsonb_build_object('rank',r.rnk) from ranked r where r.user_id=auth.uid()),
  'players',(select count(*) from ranked)) into v;
 return v;
end; $$;

create or replace function public.nexus_league_reward_status()
returns jsonb language plpgsql security definer set search_path='' stable as $$
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 return jsonb_build_object('claimed',coalesce((select jsonb_agg(league_idx) from public.nexus_league_rewards where user_id=auth.uid()),'[]'::jsonb));
end; $$;

create or replace function public.nexus_claim_league_reward(league_idx_input int)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_xp int; v_min int; v_coins int;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 if league_idx_input not between 1 and 5 then raise exception 'Liga inválida.'; end if;
 select coalesce(game_xp,0) into v_xp from public.social_profiles where user_id=v_uid;
 v_min:=(array[0,500,1500,3000,6000,10000])[league_idx_input+1];
 v_coins:=(array[0,100,250,500,1000,2000])[league_idx_input+1];
 if coalesce(v_xp,0)<v_min then raise exception 'Você ainda não chegou nessa liga.'; end if;
 insert into public.nexus_league_rewards(user_id,league_idx) values(v_uid,league_idx_input) on conflict do nothing;
 if not found then raise exception 'Baú já aberto.'; end if;
 insert into public.nexus_loot_wallets(user_id,coins,collection_score) values(v_uid,v_coins,0)
  on conflict (user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,updated_at=now();
 return jsonb_build_object('ok',true,'coins',v_coins);
end; $$;

revoke all on function public.nexus_game_leaderboard(text,int),public.nexus_league_leaderboard(int),public.nexus_league_reward_status(),public.nexus_claim_league_reward(int) from public,anon;
grant execute on function public.nexus_game_leaderboard(text,int),public.nexus_league_leaderboard(int),public.nexus_league_reward_status(),public.nexus_claim_league_reward(int) to authenticated;
