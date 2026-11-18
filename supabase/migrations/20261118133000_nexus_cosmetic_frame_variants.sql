CREATE OR REPLACE FUNCTION public.nexus_progression_equip(item_key_input text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_owned text[];
begin
 if v_uid is null then raise exception 'Faça login para equipar.'; end if;
 select owned_cosmetics into v_owned from public.nexus_player_progress where user_id=v_uid for update;
 if not (item_key_input=any(coalesce(v_owned,'{}'::text[]))) then raise exception 'Você ainda não possui este item.'; end if;
 if item_key_input like 'title-%' or item_key_input like 'pass-title-%' then
   update public.nexus_player_progress set equipped_title=item_key_input,updated_at=now() where user_id=v_uid;
   update public.social_profiles set player_title=case item_key_input when 'title-star-pilot' then 'Piloto Estelar' when 'title-guardian' then 'Guardião do Cofrinho' when 'pass-title-recruit' then 'Recruta NEXUS' when 'pass-title-explorer' then 'Explorador' when 'pass-title-veteran' then 'Veterano NEXUS' else null end,updated_at=now() where user_id=v_uid;
 else
   update public.nexus_player_progress set equipped_cosmetic=item_key_input,updated_at=now() where user_id=v_uid;
   update public.social_profiles set avatar_frame=case when item_key_input in ('cosmetic-neon-trail','pass-trail-blue') then 'neon' else avatar_frame end,card_frame=case when item_key_input in ('cosmetic-prism-frame','pass-frame-prism') then 'prism' else card_frame end,updated_at=now() where user_id=v_uid;
 end if;
 return jsonb_build_object('ok',true);
end; $function$
;