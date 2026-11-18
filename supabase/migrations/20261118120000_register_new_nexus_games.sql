CREATE OR REPLACE FUNCTION public.competition_record_match(selected_game text, match_score integer, earned_xp integer, selected_mode text DEFAULT 'normal'::text, did_win boolean DEFAULT false, match_duration integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare new_match uuid; season_start timestamptz; season_end timestamptz; tournament_start timestamptz; tournament_end timestamptz; recent_count integer; coin_reward integer; reward_roll numeric; reward_key text; reward_name text; reward_rarity text; reward_type text; reward_icon text; reward_value integer;
begin
 if auth.uid() is null then raise exception 'Faça login para registrar a partida.'; end if;
 if selected_game not in ('space-nexus','piggy-run','quiz','extra-dungeon','extra-gems','extra-race','extra-defense') then raise exception 'Jogo inválido.'; end if;
 if match_score is null or match_score<0 or match_score>1000000 then raise exception 'Pontuação inválida.'; end if;
 if earned_xp is null or earned_xp<0 or earned_xp>1000 then raise exception 'XP inválido.'; end if;
 if match_duration is null or match_duration<0 or match_duration>7200 then raise exception 'Duração inválida.'; end if;
 if selected_game='quiz' and (
   match_score>5
   or earned_xp>25
   or earned_xp<>match_score*5
   or coalesce(did_win,false)<>(match_score>=4)
   or coalesce(selected_mode,'')<>'5-perguntas'
 ) then raise exception 'Resultado do quiz fora dos limites válidos.'; end if;
 if selected_game='quiz' and exists(
   select 1 from public.competition_match_history h
   where h.user_id=auth.uid()
     and h.game_key='quiz'
     and h.played_at>now()-interval '2 hours'
 ) then raise exception 'O Quiz já foi jogado nas últimas duas horas.'; end if;
 if selected_game='piggy-run' and (match_score>1000 or earned_xp>100 or (coalesce(did_win,false) and match_score<100)) then raise exception 'Resultado do Asas da Fortuna fora dos limites válidos.'; end if;
 if selected_game in ('extra-dungeon','extra-gems','extra-race','extra-defense') and (match_score>1000 or earned_xp>100 or (coalesce(did_win,false) and match_score<10)) then raise exception 'Resultado do jogo NEXUS fora dos limites válidos.'; end if;
 if selected_game='space-nexus' and (selected_mode not in ('easy','medium','hard','infinite') or (coalesce(did_win,false) and match_score<500)) then raise exception 'Resultado do Space Nexus fora dos limites válidos.'; end if;
 select count(*) into recent_count from public.competition_match_history h where h.user_id=auth.uid() and h.played_at>now()-interval '60 seconds';
 if recent_count>=10 then raise exception 'Muitas partidas registradas em sequência. Aguarde um minuto.'; end if;
 insert into public.competition_match_history(user_id,game_key,score,xp_earned,mode,won,duration_seconds) values(auth.uid(),selected_game,match_score,earned_xp,left(coalesce(selected_mode,'normal'),24),coalesce(did_win,false),match_duration)
 returning id into new_match;
 -- Recompensa pequena e constante por partida concluída, inclusive no Quiz.
 coin_reward := case
   when selected_game='quiz' then 2+floor(random()*2)::integer
   when selected_game='piggy-run' then 3+floor(random()*2)::integer
   else 2+floor(random()*3)::integer
 end;
 insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at)
 values(auth.uid(),coin_reward,coin_reward,now())
 on conflict(user_id) do update set
   coins=public.nexus_loot_wallets.coins+excluded.coins,
   collection_score=public.nexus_loot_wallets.collection_score+excluded.collection_score,
   updated_at=now();
 insert into public.nexus_loot_drops(user_id,match_id,item_key,item_name,item_type,rarity,icon,quantity,score_value)
 values(auth.uid(),new_match,'nexus-coins','Moedas NEXUS','currency','comum','🪙',coin_reward,coin_reward);

 -- Chance de drop por partida: 32% no total, com raridades escalonadas.
 reward_roll:=random(); reward_key:=null; reward_name:=null; reward_rarity:=null;
 reward_type:=null; reward_icon:=null; reward_value:=0;
 if reward_roll<0.0005 then
   reward_key:='ancient-relic'; reward_name:='Relíquia Ancestral'; reward_rarity:='lendario'; reward_type:='relic'; reward_icon:='🏺'; reward_value:=12000;
 elsif reward_roll<0.003 then
   reward_key:='celestial-artifact'; reward_name:='Artefato Celestial'; reward_rarity:='lendario'; reward_type:='artifact'; reward_icon:='💠'; reward_value:=6000;
 elsif reward_roll<0.015 then
   reward_key:='quantum-core'; reward_name:='Núcleo Quântico'; reward_rarity:='epico'; reward_type:='artifact'; reward_icon:='🔮'; reward_value:=2200;
 elsif reward_roll<0.06 then
   reward_key:='star-fragment'; reward_name:='Fragmento Estelar'; reward_rarity:='raro'; reward_type:='fragment'; reward_icon:='🌠'; reward_value:=700;
 elsif reward_roll<0.16 then
   reward_key:='mystery-chest'; reward_name:='Baú Misterioso'; reward_rarity:='incomum'; reward_type:='chest'; reward_icon:='🎁'; reward_value:=250;
 elsif reward_roll<0.32 then
   reward_key:='prism-shard'; reward_name:='Fragmento Prismático'; reward_rarity:='comum'; reward_type:='fragment'; reward_icon:='🔹'; reward_value:=70;
 end if;
 if reward_key is not null then
   insert into public.nexus_loot_inventory(user_id,item_key,item_name,item_type,rarity,icon,quantity,score_value,updated_at)
   values(auth.uid(),reward_key,reward_name,reward_type,reward_rarity,reward_icon,1,reward_value,now())
   on conflict(user_id,item_key) do update set
     quantity=public.nexus_loot_inventory.quantity+1,updated_at=now();
   insert into public.nexus_loot_drops(user_id,match_id,item_key,item_name,item_type,rarity,icon,quantity,score_value)
   values(auth.uid(),new_match,reward_key,reward_name,reward_type,reward_rarity,reward_icon,1,reward_value);
   update public.nexus_loot_wallets set collection_score=collection_score+reward_value,updated_at=now()
   where user_id=auth.uid();
 end if;


 season_start:=timestamptz '2026-01-01 00:00:00+00'+floor(extract(epoch from (now()-timestamptz '2026-01-01 00:00:00+00'))/2592000)*interval '30 days';season_end:=season_start+interval '30 days';
 insert into public.competition_seasons(name,starts_at,ends_at,status) values('Temporada NEXUS · '||to_char(season_start at time zone 'UTC','DD/MM/YYYY'),season_start,season_end,'active') on conflict(starts_at) do update set status='active';
 update public.competition_seasons set status='completed' where ends_at<=now() and status='active';
 insert into public.competition_season_scores(season_id,user_id,xp_points,total_score,matches_played,wins,updated_at) select s.id,auth.uid(),earned_xp,match_score,1,case when did_win then 1 else 0 end,now() from public.competition_seasons s where s.starts_at=season_start on conflict(season_id,user_id) do update set xp_points=public.competition_season_scores.xp_points+excluded.xp_points,total_score=public.competition_season_scores.total_score+excluded.total_score,matches_played=public.competition_season_scores.matches_played+1,wins=public.competition_season_scores.wins+excluded.wins,updated_at=now();
 tournament_start:=date_trunc('week',now());tournament_end:=tournament_start+interval '7 days';
 insert into public.competition_weekly_tournaments(name,starts_at,ends_at,status) values('Torneio semanal · '||to_char(tournament_start,'DD/MM'),tournament_start,tournament_end,'active') on conflict(starts_at) do update set status='active';
 update public.competition_weekly_tournaments set status='completed' where ends_at<=now() and status='active';
 insert into public.competition_tournament_entries(tournament_id,user_id,points,matches_played,updated_at) select t.id,auth.uid(),earned_xp,1,now() from public.competition_weekly_tournaments t where t.starts_at=tournament_start on conflict(tournament_id,user_id) do update set points=public.competition_tournament_entries.points+excluded.points,matches_played=public.competition_tournament_entries.matches_played+1,updated_at=now();
 if coalesce(did_win,false) then insert into public.competition_game_medals(user_id,game_key,medals_count,updated_at) values(auth.uid(),selected_game,1,now()) on conflict(user_id,game_key) do update set medals_count=public.competition_game_medals.medals_count+1,updated_at=now(); end if;
 update public.competition_challenge_members cm set best_score=greatest(cm.best_score,match_score),matches_played=cm.matches_played+1,updated_at=now() from public.competition_challenges c where cm.challenge_id=c.id and cm.user_id=auth.uid() and c.game_key=selected_game and c.status='active' and c.ends_at>now();
 update public.competition_challenges c set status='completed',winner_id=auth.uid() where c.status='active' and c.game_key=selected_game and c.ends_at>now() and c.winner_id is null and c.target_score<=match_score and exists(select 1 from public.competition_challenge_members cm where cm.challenge_id=c.id and cm.user_id=auth.uid());
 update public.competition_challenges set status='expired' where status='active' and ends_at<=now();
 return new_match;
end; $function$
