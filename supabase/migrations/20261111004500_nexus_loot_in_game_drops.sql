
alter table public.nexus_loot_drops alter column match_id drop not null;

create or replace function public.nexus_award_loot_drop(selected_game text,source_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare roll numeric; item_key text; item_name text; item_rarity text; item_type text; item_icon text; item_value integer; attempts integer; chance_factor numeric;
begin
 if auth.uid() is null then raise exception 'Faça login para receber drops.'; end if;
 if selected_game not in ('space-nexus','piggy-run') then raise exception 'Jogo inválido.'; end if;
 if source_key not in ('enemy_kill','boss_kill','piggy_pickup') then raise exception 'Origem de drop inválida.'; end if;
 if (selected_game='space-nexus' and source_key='piggy_pickup') or (selected_game='piggy-run' and source_key in ('enemy_kill','boss_kill')) then raise exception 'Origem incompatível com o jogo.'; end if;
 select count(*) into attempts from public.nexus_loot_drops d where d.user_id=auth.uid() and d.created_at>now()-interval '60 seconds';
 if attempts>=80 then raise exception 'Limite temporário de drops atingido.'; end if;
 roll:=random(); item_key:=null; item_name:=null; item_rarity:=null; item_type:=null; item_icon:=null; item_value:=0;
 if source_key='piggy_pickup' then
   if roll<0.0002 then item_key:='ancient-relic';item_name:='Relíquia Ancestral';item_rarity:='lendario';item_type:='relic';item_icon:='🏺';item_value:=12000;
   elsif roll<0.0012 then item_key:='season-exclusive-'||to_char(now(),'YYYYMM');item_name:='Relíquia de Temporada';item_rarity:='exclusivo';item_type:='seasonal';item_icon:='🌌';item_value:=9000;
   elsif roll<0.0042 then item_key:='celestial-artifact';item_name:='Artefato Celestial';item_rarity:='lendario';item_type:='artifact';item_icon:='💠';item_value:=6000;
   elsif roll<0.0242 then item_key:='quantum-core';item_name:='Núcleo Quântico';item_rarity:='epico';item_type:='artifact';item_icon:='🔮';item_value:=2200;
   elsif roll<0.1042 then item_key:='star-fragment';item_name:='Fragmento Estelar';item_rarity:='raro';item_type:='fragment';item_icon:='🌠';item_value:=700;
   elsif roll<0.3242 then item_key:='mystery-chest';item_name:='Baú Misterioso';item_rarity:='incomum';item_type:='chest';item_icon:='🎁';item_value:=250;
   elsif roll<0.7242 then item_key:='prism-shard';item_name:='Fragmento Prismático';item_rarity:='comum';item_type:='fragment';item_icon:='🔹';item_value:=70; end if;
 else
   chance_factor:=case when source_key='boss_kill' then 2.5 else 1 end;
   if roll<0.00002*chance_factor then item_key:='ancient-relic';item_name:='Relíquia Ancestral';item_rarity:='lendario';item_type:='relic';item_icon:='🏺';item_value:=12000;
   elsif roll<0.00008*chance_factor then item_key:='season-exclusive-'||to_char(now(),'YYYYMM');item_name:='Relíquia de Temporada';item_rarity:='exclusivo';item_type:='seasonal';item_icon:='🌌';item_value:=9000;
   elsif roll<0.0003*chance_factor then item_key:='celestial-artifact';item_name:='Artefato Celestial';item_rarity:='lendario';item_type:='artifact';item_icon:='💠';item_value:=6000;
   elsif roll<0.0015*chance_factor then item_key:='quantum-core';item_name:='Núcleo Quântico';item_rarity:='epico';item_type:='artifact';item_icon:='🔮';item_value:=2200;
   elsif roll<0.006*chance_factor then item_key:='star-fragment';item_name:='Fragmento Estelar';item_rarity:='raro';item_type:='fragment';item_icon:='🌠';item_value:=700;
   elsif roll<0.018*chance_factor then item_key:='mystery-chest';item_name:='Baú Misterioso';item_rarity:='incomum';item_type:='chest';item_icon:='🎁';item_value:=250;
   elsif roll<0.04*chance_factor then item_key:='prism-shard';item_name:='Fragmento Prismático';item_rarity:='comum';item_type:='fragment';item_icon:='🔹';item_value:=70; end if;
 end if;
 if item_key is null then return null; end if;
 insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at) values(auth.uid(),0,item_value,now())
 on conflict(user_id) do update set collection_score=public.nexus_loot_wallets.collection_score+excluded.collection_score,updated_at=now();
 insert into public.nexus_loot_inventory(user_id,item_key,item_name,item_type,rarity,icon,quantity,score_value,updated_at)
 values(auth.uid(),item_key,item_name,item_type,item_rarity,item_icon,1,item_value,now())
 on conflict(user_id,item_key) do update set quantity=public.nexus_loot_inventory.quantity+1,updated_at=now();
 insert into public.nexus_loot_drops(user_id,match_id,item_key,item_name,item_type,rarity,icon,quantity,score_value)
 values(auth.uid(),null,item_key,item_name,item_type,item_rarity,item_icon,1,item_value);
 return jsonb_build_object('item_key',item_key,'item_name',item_name,'item_type',item_type,'rarity',item_rarity,'icon',item_icon,'quantity',1,'score_value',item_value);
end; $$;
revoke all on function public.nexus_award_loot_drop(text,text) from public,anon;
grant execute on function public.nexus_award_loot_drop(text,text) to authenticated;

create or replace function public.competition_record_match(selected_game text,match_score integer,earned_xp integer,selected_mode text default 'normal',did_win boolean default false,match_duration integer default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare new_match uuid; season_start timestamptz; season_end timestamptz; tournament_start timestamptz; tournament_end timestamptz; recent_count integer; coin_reward integer;
begin
 if auth.uid() is null then raise exception 'Faça login para registrar a partida.'; end if;
 if selected_game not in ('space-nexus','piggy-run','quiz') then raise exception 'Jogo inválido.'; end if;
 if match_score is null or match_score<0 or match_score>1000000 then raise exception 'Pontuação inválida.'; end if;
 if earned_xp is null or earned_xp<0 or earned_xp>1000 then raise exception 'XP inválido.'; end if;
 if match_duration is null or match_duration<0 or match_duration>7200 then raise exception 'Duração inválida.'; end if;
 if selected_game='quiz' and (match_score>5 or earned_xp>25 or (coalesce(did_win,false) and match_score<4)) then raise exception 'Resultado do quiz fora dos limites válidos.'; end if;
 if selected_game='piggy-run' and (match_score>1000 or earned_xp>100 or (coalesce(did_win,false) and match_score<100)) then raise exception 'Resultado do Asas da Fortuna fora dos limites válidos.'; end if;
 if selected_game='space-nexus' and (selected_mode not in ('easy','medium','hard') or (coalesce(did_win,false) and match_score<500)) then raise exception 'Resultado do Space Nexus fora dos limites válidos.'; end if;
 select count(*) into recent_count from public.competition_match_history h where h.user_id=auth.uid() and h.played_at>now()-interval '60 seconds';
 if recent_count>=10 then raise exception 'Muitas partidas registradas em sequência. Aguarde um minuto.'; end if;
 insert into public.competition_match_history(user_id,game_key,score,xp_earned,mode,won,duration_seconds) values(auth.uid(),selected_game,match_score,earned_xp,left(coalesce(selected_mode,'normal'),24),coalesce(did_win,false),match_duration) returning id into new_match;
 -- Recompensa-base: moedas calculadas no servidor, nunca aceitas do cliente.
 coin_reward:=least(5,1+floor(match_score::numeric/250)::integer);
 insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at)
 values(auth.uid(),coin_reward,coin_reward,now())
 on conflict(user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,
 collection_score=public.nexus_loot_wallets.collection_score+excluded.collection_score,updated_at=now();
 insert into public.nexus_loot_drops(user_id,match_id,item_key,item_name,item_type,rarity,icon,quantity,score_value)
 values(auth.uid(),new_match,'nexus-coins','Moedas NEXUS','currency','comum','🪙',coin_reward,coin_reward);
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
end; $$;
revoke all on function public.competition_record_match(text,integer,integer,text,boolean,integer) from public,anon;
grant execute on function public.competition_record_match(text,integer,integer,text,boolean,integer) to authenticated;