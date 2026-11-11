-- NEXUS REWARDS v2: balanced match coins, cross-game item drops and improved relic odds.
-- The server remains authoritative: rewards are calculated here, never trusted from the browser.

do $migration$
declare
  fn text;
  declaration text;
  insertion text;
begin
  select pg_get_functiondef('public.competition_record_match(text,integer,integer,text,boolean,integer)'::regprocedure) into fn;

  declaration := 'coin_reward integer;';
  if position(declaration in fn)=0 then
    raise exception 'Declaração de recompensas não encontrada em competition_record_match.';
  end if;
  fn := replace(fn, declaration,
    'coin_reward integer; reward_roll numeric; reward_key text; reward_name text; reward_rarity text; reward_type text; reward_icon text; reward_value integer;');

  insertion := $reward$
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
$reward$;

  if position(' returning id into new_match;' in fn)=0 then
    raise exception 'Ponto de inserção da partida não encontrado.';
  end if;
  fn := replace(fn, ' returning id into new_match;', insertion);
  execute fn;
end;
$migration$;

-- Improve in-run Space Nexus drop odds (enemy and boss kills).
do $drops$
declare
  fn text;
begin
  select pg_get_functiondef('public.nexus_award_loot_drop(text,text)'::regprocedure) into fn;
  -- Use temporary markers so threshold replacements cannot cascade.
  fn:=replace(fn,'0.00002*chance_factor','__DROP_A__');
  fn:=replace(fn,'0.00008*chance_factor','__DROP_B__');
  fn:=replace(fn,'0.0003*chance_factor','__DROP_C__');
  fn:=replace(fn,'0.0015*chance_factor','__DROP_D__');
  fn:=replace(fn,'0.006*chance_factor','__DROP_E__');
  fn:=replace(fn,'0.018*chance_factor','__DROP_F__');
  fn:=replace(fn,'0.04*chance_factor','__DROP_G__');
  fn:=replace(fn,'__DROP_A__','0.00008*chance_factor');
  fn:=replace(fn,'__DROP_B__','0.00030*chance_factor');
  fn:=replace(fn,'__DROP_C__','0.0010*chance_factor');
  fn:=replace(fn,'__DROP_D__','0.0040*chance_factor');
  fn:=replace(fn,'__DROP_E__','0.015*chance_factor');
  fn:=replace(fn,'__DROP_F__','0.035*chance_factor');
  fn:=replace(fn,'__DROP_G__','0.08*chance_factor');
  execute fn;
end;
$drops$;
