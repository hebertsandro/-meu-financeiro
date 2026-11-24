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
    avatar_frame=case item_key_input when 'cosmetic-ruby-aura' then 'ember' when 'cosmetic-gold-crown' then 'royal' when 'cosmetic-prism-frame' then 'prismatic' when 'cosmetic-neon-trail' then 'neontrail' when 'pass-trail-blue' then 'bluetrail' when 'pass-frame-prism' then 'shard' else avatar_frame end,
    card_frame=case item_key_input when 'cosmetic-ruby-aura' then 'ember' when 'cosmetic-gold-crown' then 'royal' when 'cosmetic-prism-frame' then 'prismatic' when 'cosmetic-neon-trail' then 'neontrail' when 'pass-trail-blue' then 'bluetrail' when 'pass-frame-prism' then 'shard' else card_frame end,
    updated_at=now() where user_id=v_uid;
 end if;
 return jsonb_build_object('ok',true);
end; $$;
