-- Coins are now granted when the player physically collects a coin during Space Nexus.
do $body$
declare
  fn text;
  old_block text;
begin
  select pg_get_functiondef('public.competition_record_match(text,integer,integer,text,boolean,integer)'::regprocedure) into fn;
  old_block := E' -- Recompensa-base: moedas calculadas no servidor, nunca aceitas do cliente.\n coin_reward:=least(5,1+floor(match_score::numeric/250)::integer);\n insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at)\n values(auth.uid(),coin_reward,coin_reward,now())\n on conflict(user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,\n collection_score=public.nexus_loot_wallets.collection_score+excluded.collection_score,updated_at=now();\n insert into public.nexus_loot_drops(user_id,match_id,item_key,item_name,item_type,rarity,icon,quantity,score_value)\n values(auth.uid(),new_match,''nexus-coins'',''Moedas NEXUS'',''currency'',''comum'',''🪙'',coin_reward,coin_reward);';
  if position(old_block in fn)=0 then
    raise exception 'Bloco antigo de moedas não encontrado.';
  end if;
  fn:=replace(fn,old_block,'');
  execute fn;
end;
$body$;

create or replace function public.nexus_award_coin_drop(selected_game text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  coin_amount integer;
  recent_count integer;
begin
  if auth.uid() is null then raise exception 'Faça login para coletar moedas.'; end if;
  if selected_game <> 'space-nexus' then raise exception 'Jogo inválido para coleta de moedas.'; end if;

  select count(*) into recent_count
  from public.nexus_loot_drops d
  where d.user_id=auth.uid()
    and d.item_type='currency'
    and d.created_at>now()-interval '60 seconds';
  if recent_count>=24 then raise exception 'Limite temporário de moedas atingido.'; end if;

  coin_amount:=1+floor(random()*2)::integer;
  insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at)
  values(auth.uid(),coin_amount,coin_amount,now())
  on conflict(user_id) do update
    set coins=public.nexus_loot_wallets.coins+excluded.coins,
        collection_score=public.nexus_loot_wallets.collection_score+excluded.collection_score,
        updated_at=now();

  insert into public.nexus_loot_drops(user_id,match_id,item_key,item_name,item_type,rarity,icon,quantity,score_value)
  values(auth.uid(),null,'nexus-coins','Moedas NEXUS','currency','comum','🪙',coin_amount,coin_amount);

  return jsonb_build_object('coins',coin_amount,'item_name','Moedas NEXUS','icon','🪙');
end;
$function$;

revoke all on function public.nexus_award_coin_drop(text) from public, anon;
grant execute on function public.nexus_award_coin_drop(text) to authenticated;