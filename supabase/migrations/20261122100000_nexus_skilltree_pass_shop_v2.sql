-- NEXUS progression v2: real skill tree (prerequisites), 11-tier pass with coin rewards, bigger shop.
create or replace function public.nexus_progression_unlock_skill(skill_key_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_cost integer; v_req text[]; v_skills text[]; v_wallet bigint;
begin
 if v_uid is null then raise exception 'Faça login para evoluir.'; end if;
 select c, r into v_cost, v_req from (values
  ('extra-heart',100,'{}'::text[]),
  ('iron-core',160,array['extra-heart']),
  ('sell-bonus',220,array['iron-core']),
  ('coin-boost',140,'{}'::text[]),
  ('start-cash',150,array['coin-boost']),
  ('gem-moves',200,array['start-cash']),
  ('quick-cd',120,'{}'::text[]),
  ('tower-discount',240,array['quick-cd']),
  ('score-plus',260,array['tower-discount']),
  ('legend',600,array['sell-bonus','gem-moves','score-plus'])
 ) as t(k,c,r) where k=skill_key_input;
 if v_cost is null then raise exception 'Habilidade inválida.'; end if;
 insert into public.nexus_player_progress(user_id) values(v_uid) on conflict(user_id) do nothing;
 select unlocked_skills into v_skills from public.nexus_player_progress where user_id=v_uid for update;
 if skill_key_input=any(v_skills) then return jsonb_build_object('ok',true,'already_unlocked',true); end if;
 if not (v_req <@ v_skills) then raise exception 'Desbloqueie primeiro as habilidades anteriores deste caminho.'; end if;
 select coins into v_wallet from public.nexus_loot_wallets where user_id=v_uid for update;
 if coalesce(v_wallet,0)<v_cost then raise exception 'Moedas insuficientes. Jogue para ganhar mais.'; end if;
 update public.nexus_loot_wallets set coins=coins-v_cost,updated_at=now() where user_id=v_uid;
 update public.nexus_player_progress set unlocked_skills=array_append(unlocked_skills,skill_key_input),updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'cost',v_cost);
end; $$;

create or replace function public.nexus_progression_purchase_cosmetic(cosmetic_key_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_cost integer; v_owned text[]; v_wallet bigint;
begin
 if v_uid is null then raise exception 'Faça login para comprar.'; end if;
 v_cost:=case cosmetic_key_input
  when 'cosmetic-neon-trail' then 90 when 'cosmetic-prism-frame' then 160
  when 'cosmetic-gold-crown' then 240 when 'cosmetic-ruby-aura' then 320
  when 'title-star-pilot' then 120 when 'title-guardian' then 180
  when 'title-gem-master' then 140 when 'title-void-hunter' then 220
  when 'title-coin-baron' then 260 when 'title-nexus-legend' then 600
  else null end;
 if v_cost is null then raise exception 'Item não encontrado na loja.'; end if;
 insert into public.nexus_player_progress(user_id) values(v_uid) on conflict(user_id) do nothing;
 select owned_cosmetics into v_owned from public.nexus_player_progress where user_id=v_uid for update;
 if cosmetic_key_input=any(v_owned) then return jsonb_build_object('ok',true,'already_owned',true); end if;
 select coins into v_wallet from public.nexus_loot_wallets where user_id=v_uid for update;
 if coalesce(v_wallet,0)<v_cost then raise exception 'Moedas insuficientes.'; end if;
 update public.nexus_loot_wallets set coins=coins-v_cost,updated_at=now() where user_id=v_uid;
 update public.nexus_player_progress set owned_cosmetics=array_append(owned_cosmetics,cosmetic_key_input),updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'cost',v_cost);
end; $$;

create or replace function public.nexus_progression_claim_pass_reward(reward_key_input text, season_id_input uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_threshold integer; v_coins integer; v_xp integer; v_owned text[]; v_season uuid;
begin
 if v_uid is null then raise exception 'Faça login para resgatar.'; end if;
 select t, c into v_threshold, v_coins from (values
  ('pass-coins-1',150,40),('pass-title-recruit',250,0),('pass-coins-2',400,60),('pass-trail-blue',500,0),
  ('pass-coins-3',750,80),('pass-title-explorer',1000,0),('pass-coins-4',1250,120),('pass-frame-prism',1500,0),
  ('pass-coins-5',1750,150),('pass-title-veteran',2000,0),('pass-title-champion',3000,0)
 ) as x(k,t,c) where k=reward_key_input;
 if v_threshold is null then raise exception 'Recompensa inválida.'; end if;
 select id into v_season from public.competition_seasons where id=season_id_input and status='active' and starts_at<=now() and ends_at>now() for update;
 if v_season is null then raise exception 'Esta temporada já terminou. Aguarde a próxima.'; end if;
 select coalesce(xp_points,0) into v_xp from public.competition_season_scores where season_id=v_season and user_id=v_uid;
 if coalesce(v_xp,0)<v_threshold then raise exception 'Continue jogando nesta temporada para liberar a recompensa.'; end if;
 insert into public.nexus_player_progress(user_id) values(v_uid) on conflict(user_id) do nothing;
 insert into public.nexus_player_pass_claims(user_id,season_id,reward_key) values(v_uid,v_season,reward_key_input) on conflict do nothing;
 if not found then return jsonb_build_object('ok',true,'already_claimed',true); end if;
 if v_coins>0 then
  insert into public.nexus_loot_wallets(user_id,coins) values(v_uid,v_coins) on conflict(user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,updated_at=now();
 else
  select owned_cosmetics into v_owned from public.nexus_player_progress where user_id=v_uid for update;
  if not (reward_key_input=any(coalesce(v_owned,'{}'::text[]))) then
   update public.nexus_player_progress set owned_cosmetics=array_append(owned_cosmetics,reward_key_input),updated_at=now() where user_id=v_uid;
  end if;
 end if;
 return jsonb_build_object('ok',true,'coins',v_coins);
end; $$;

create or replace function public.nexus_progression_equip(item_key_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_owned text[];
begin
 if v_uid is null then raise exception 'Faça login para equipar.'; end if;
 select owned_cosmetics into v_owned from public.nexus_player_progress where user_id=v_uid for update;
 if not (item_key_input=any(coalesce(v_owned,'{}'::text[]))) then raise exception 'Você ainda não possui este item.'; end if;
 if item_key_input like 'title-%' or item_key_input like 'pass-title-%' then
   update public.nexus_player_progress set equipped_title=item_key_input,updated_at=now() where user_id=v_uid;
   update public.social_profiles set player_title=case item_key_input
    when 'title-star-pilot' then 'Piloto Estelar' when 'title-guardian' then 'Guardião do Cofrinho'
    when 'title-gem-master' then 'Mestre das Gemas' when 'title-void-hunter' then 'Caçador do Vácuo'
    when 'title-coin-baron' then 'Barão das Moedas' when 'title-nexus-legend' then 'Lenda Viva'
    when 'pass-title-recruit' then 'Recruta NEXUS' when 'pass-title-explorer' then 'Explorador'
    when 'pass-title-veteran' then 'Veterano NEXUS' when 'pass-title-champion' then 'Campeão da Temporada'
    else null end,updated_at=now() where user_id=v_uid;
 else
   update public.nexus_player_progress set equipped_cosmetic=item_key_input,updated_at=now() where user_id=v_uid;
   update public.social_profiles set
    avatar_frame=case when item_key_input in ('cosmetic-neon-trail','pass-trail-blue') then 'cyan' when item_key_input='cosmetic-gold-crown' then 'gold' when item_key_input='cosmetic-ruby-aura' then 'ruby' else avatar_frame end,
    card_frame=case when item_key_input in ('cosmetic-prism-frame','pass-frame-prism') then 'chrome' when item_key_input='cosmetic-gold-crown' then 'gold' when item_key_input='cosmetic-ruby-aura' then 'ruby' else card_frame end,
    updated_at=now() where user_id=v_uid;
 end if;
 return jsonb_build_object('ok',true);
end; $$;

revoke all on function public.nexus_progression_unlock_skill(text) from public, anon;
revoke all on function public.nexus_progression_purchase_cosmetic(text) from public, anon;
revoke all on function public.nexus_progression_claim_pass_reward(text,uuid) from public, anon;
revoke all on function public.nexus_progression_equip(text) from public, anon;
grant execute on function public.nexus_progression_unlock_skill(text) to authenticated;
grant execute on function public.nexus_progression_purchase_cosmetic(text) to authenticated;
grant execute on function public.nexus_progression_claim_pass_reward(text,uuid) to authenticated;
grant execute on function public.nexus_progression_equip(text) to authenticated;
