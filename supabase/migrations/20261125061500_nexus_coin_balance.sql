-- Equilibra moedas por jogo: jogos com muitos drops rendem menos por drop, jogos lentos rendem mais.
create or replace function public.nexus_award_coin_drop(selected_game text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare coin_amount integer; recent_count integer;
begin
 if auth.uid() is null then raise exception 'Faça login para coletar moedas.'; end if;
 if selected_game not in ('space-nexus','extra-dungeon','extra-gems','extra-race','extra-defense') then raise exception 'Jogo inválido para coleta de moedas.'; end if;
 select count(*) into recent_count from public.nexus_loot_drops d where d.user_id=auth.uid() and d.item_type='currency' and d.created_at>now()-interval '60 seconds';
 if recent_count>=20 then raise exception 'Limite temporário de moedas atingido.'; end if;
 coin_amount:=case selected_game
  when 'space-nexus' then 1
  when 'extra-race' then 1
  when 'extra-gems' then 1+floor(random()*2)::integer
  when 'extra-dungeon' then 2+floor(random()*2)::integer
  when 'extra-defense' then 2+floor(random()*3)::integer
  else 1 end;
 insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at) values(auth.uid(),coin_amount,coin_amount,now())
 on conflict(user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,collection_score=public.nexus_loot_wallets.collection_score+excluded.collection_score,updated_at=now();
 insert into public.nexus_loot_drops(user_id,match_id,item_key,item_name,item_type,rarity,icon,quantity,score_value) values(auth.uid(),null,'nexus-coins','Moedas NEXUS','currency','comum','🪙',coin_amount,coin_amount);
 return jsonb_build_object('coins',coin_amount,'item_name','Moedas NEXUS','icon','🪙');
end; $$;
