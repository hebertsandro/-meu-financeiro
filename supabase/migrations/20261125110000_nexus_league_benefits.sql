-- Benefícios de liga e sequência nas recompensas das missões diárias.
create or replace function public.nexus_claim_daily_quest(quest_key_input text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_today date:=(now() at time zone 'America/Sao_Paulo')::date;
 v_matches int; v_wins int; v_games int; v_ok boolean:=false; v_reward int:=0;
 v_xp int:=0; v_pct int:=0; v_streak int:=0; v_bonus int:=0;
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
 select coalesce(game_xp,0) into v_xp from public.social_profiles where user_id=v_uid;
 v_pct:=case when v_xp>=10000 then 30 when v_xp>=6000 then 20 when v_xp>=3000 then 15 when v_xp>=1500 then 10 when v_xp>=500 then 5 else 0 end;
 begin v_streak:=coalesce((public.nexus_daily_status()->>'streak')::int,0); exception when others then v_streak:=0; end;
 v_bonus:=floor(v_reward*v_pct/100.0)::int+2*least(v_streak,7);
 insert into public.nexus_loot_wallets(user_id,coins,collection_score) values(v_uid,v_reward+v_bonus,0)
  on conflict (user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,updated_at=now();
 return jsonb_build_object('ok',true,'reward',v_reward+v_bonus,'base',v_reward,'bonus',v_bonus);
end; $$;
