create table if not exists public.nexus_daily_claims(
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  quest_key text not null,
  claimed_at timestamptz not null default now(),
  primary key(user_id,day,quest_key)
);
alter table public.nexus_daily_claims enable row level security;
drop policy if exists "daily claims read own" on public.nexus_daily_claims;
create policy "daily claims read own" on public.nexus_daily_claims for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.nexus_daily_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_today date:=(now() at time zone 'America/Sao_Paulo')::date;
 v_matches int; v_wins int; v_games int; v_streak int:=0; v_d date; v_claimed jsonb;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select count(*),count(*) filter (where won),count(distinct game_key) into v_matches,v_wins,v_games
  from public.competition_match_history where user_id=v_uid and (played_at at time zone 'America/Sao_Paulo')::date=v_today;
 v_d:=v_today;
 if v_matches=0 then v_d:=v_today-1; end if;
 loop
  exit when not exists(select 1 from public.competition_match_history where user_id=v_uid and (played_at at time zone 'America/Sao_Paulo')::date=v_d);
  v_streak:=v_streak+1; v_d:=v_d-1; exit when v_streak>=365;
 end loop;
 select coalesce(jsonb_agg(quest_key),'[]'::jsonb) into v_claimed from public.nexus_daily_claims where user_id=v_uid and day=v_today;
 return jsonb_build_object('matches',v_matches,'wins',v_wins,'games',v_games,'streak',v_streak,'claimed',v_claimed);
end; $$;

create or replace function public.nexus_claim_daily_quest(quest_key_input text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_today date:=(now() at time zone 'America/Sao_Paulo')::date;
 v_matches int; v_wins int; v_games int; v_ok boolean:=false; v_reward int:=0; v_streak int;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select count(*),count(*) filter (where won),count(distinct game_key) into v_matches,v_wins,v_games
  from public.competition_match_history where user_id=v_uid and (played_at at time zone 'America/Sao_Paulo')::date=v_today;
 if quest_key_input='daily-play-3' then v_ok:=v_matches>=3; v_reward:=40;
 elsif quest_key_input='daily-play-6' then v_ok:=v_matches>=6; v_reward:=80;
 elsif quest_key_input='daily-win' then v_ok:=v_wins>=1; v_reward:=50;
 elsif quest_key_input='daily-variety' then v_ok:=v_games>=2; v_reward:=60;
 else raise exception 'Missão inválida.'; end if;
 if not v_ok then raise exception 'Missão ainda não concluída.'; end if;
 insert into public.nexus_daily_claims(user_id,day,quest_key) values(v_uid,v_today,quest_key_input) on conflict do nothing;
 if not found then raise exception 'Recompensa já resgatada hoje.'; end if;
 insert into public.nexus_loot_wallets(user_id,coins,collection_score) values(v_uid,v_reward,0)
  on conflict (user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,updated_at=now();
 return jsonb_build_object('ok',true,'reward',v_reward);
end; $$;
revoke all on function public.nexus_daily_status() from public, anon;
revoke all on function public.nexus_claim_daily_quest(text) from public, anon;
grant execute on function public.nexus_daily_status() to authenticated;
grant execute on function public.nexus_claim_daily_quest(text) to authenticated;
