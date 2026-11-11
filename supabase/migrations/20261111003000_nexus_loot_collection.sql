
-- NEXUS LOOT: saldo e pontuação de coleção separados do XP.
create table if not exists public.nexus_loot_wallets(
 user_id uuid primary key references auth.users(id) on delete cascade,
 coins bigint not null default 0 check(coins>=0),
 collection_score bigint not null default 0 check(collection_score>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.nexus_loot_inventory(
 user_id uuid not null references auth.users(id) on delete cascade,
 item_key text not null,
 item_name text not null,
 item_type text not null check(item_type in ('artifact','fragment','relic','chest','seasonal')),
 rarity text not null,
 icon text not null default '💎',
 quantity integer not null default 0 check(quantity>=0),
 score_value integer not null check(score_value>=0),
 updated_at timestamptz not null default now(),
 primary key(user_id,item_key)
);
create table if not exists public.nexus_loot_drops(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 match_id uuid not null references public.competition_match_history(id) on delete cascade,
 item_key text not null,
 item_name text not null,
 item_type text not null,
 rarity text not null,
 icon text not null default '🎁',
 quantity integer not null default 1 check(quantity>0),
 score_value integer not null check(score_value>=0),
 created_at timestamptz not null default now()
);
create index if not exists nexus_loot_wallet_score_idx on public.nexus_loot_wallets(collection_score desc);
create index if not exists nexus_loot_drops_user_date_idx on public.nexus_loot_drops(user_id,created_at desc);
alter table public.nexus_loot_wallets enable row level security;
alter table public.nexus_loot_inventory enable row level security;
alter table public.nexus_loot_drops enable row level security;
drop policy if exists "Authenticated read loot rankings" on public.nexus_loot_wallets;
create policy "Authenticated read loot rankings" on public.nexus_loot_wallets for select to authenticated using(true);
drop policy if exists "Users read own loot inventory" on public.nexus_loot_inventory;
create policy "Users read own loot inventory" on public.nexus_loot_inventory for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users read own loot drops" on public.nexus_loot_drops;
create policy "Users read own loot drops" on public.nexus_loot_drops for select to authenticated using(user_id=(select auth.uid()));
grant select on public.nexus_loot_wallets,public.nexus_loot_inventory,public.nexus_loot_drops to authenticated;
create or replace function public.competition_record_match(selected_game text,match_score integer,earned_xp integer,selected_mode text default 'normal',did_win boolean default false,match_duration integer default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare new_match uuid; season_start timestamptz; season_end timestamptz; tournament_start timestamptz; tournament_end timestamptz; recent_count integer; loot_roll numeric; loot_key text; loot_name text; loot_rarity text; loot_type text; loot_icon text; loot_value integer; coin_reward integer;
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
 coin_reward:=least(75,8+floor(match_score::numeric/25)::integer);
 insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at)
 values(auth.uid(),coin_reward,coin_reward,now())
 on conflict(user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,
 collection_score=public.nexus_loot_wallets.collection_score+excluded.collection_score,updated_at=now();
 insert into public.nexus_loot_drops(user_id,match_id,item_key,item_name,item_type,rarity,icon,quantity,score_value)
 values(auth.uid(),new_match,'nexus-coins','Moedas NEXUS','currency','comum','🪙',coin_reward,coin_reward);
 -- Uma única rolagem por partida. Os itens de topo têm chances extremamente baixas.
 loot_roll:=random(); loot_key:=null; loot_name:=null; loot_rarity:=null; loot_type:=null; loot_icon:=null; loot_value:=0;
 if loot_roll<0.0003 then
   loot_key:='ancient-relic'; loot_name:='Relíquia Ancestral'; loot_rarity:='lendario'; loot_type:='relic'; loot_icon:='🏺'; loot_value:=12000;
 elsif loot_roll<0.0013 then
   loot_key:='season-exclusive-'||to_char(now(),'YYYYMM'); loot_name:='Relíquia de Temporada'; loot_rarity:='exclusivo'; loot_type:='seasonal'; loot_icon:='🌌'; loot_value:=9000;
 elsif loot_roll<0.005 then
   loot_key:='celestial-artifact'; loot_name:='Artefato Celestial'; loot_rarity:='lendario'; loot_type:='artifact'; loot_icon:='💠'; loot_value:=6000;
 elsif loot_roll<0.018 then
   loot_key:='quantum-core'; loot_name:='Núcleo Quântico'; loot_rarity:='epico'; loot_type:='artifact'; loot_icon:='🔮'; loot_value:=2200;
 elsif loot_roll<0.055 then
   loot_key:='star-fragment'; loot_name:='Fragmento Estelar'; loot_rarity:='raro'; loot_type:='fragment'; loot_icon:='🌠'; loot_value:=700;
 elsif loot_roll<0.13 then
   loot_key:='mystery-chest'; loot_name:='Baú Misterioso'; loot_rarity:='incomum'; loot_type:='chest'; loot_icon:='🎁'; loot_value:=250;
 elsif loot_roll<0.25 then
   loot_key:='prism-shard'; loot_name:='Fragmento Prismático'; loot_rarity:='comum'; loot_type:='fragment'; loot_icon:='🔹'; loot_value:=70;
 end if;
 if loot_key is not null then
   insert into public.nexus_loot_inventory(user_id,item_key,item_name,item_type,rarity,icon,quantity,score_value,updated_at)
   values(auth.uid(),loot_key,loot_name,loot_type,loot_rarity,loot_icon,1,loot_value,now())
   on conflict(user_id,item_key) do update set quantity=public.nexus_loot_inventory.quantity+1,updated_at=now();
   insert into public.nexus_loot_drops(user_id,match_id,item_key,item_name,item_type,rarity,icon,quantity,score_value)
   values(auth.uid(),new_match,loot_key,loot_name,loot_type,loot_rarity,loot_icon,1,loot_value);
   update public.nexus_loot_wallets set collection_score=collection_score+loot_value,updated_at=now() where user_id=auth.uid();
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
end; $$;
revoke all on function public.competition_record_match(text,integer,integer,text,boolean,integer) from public,anon;
grant execute on function public.competition_record_match(text,integer,integer,text,boolean,integer) to authenticated;