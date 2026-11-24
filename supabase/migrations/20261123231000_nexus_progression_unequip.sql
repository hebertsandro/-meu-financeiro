create or replace function public.nexus_progression_unequip(item_key_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Faça login para alterar itens.'; end if;
 if item_key_input like 'title-%' or item_key_input like 'pass-title-%' then
   update public.nexus_player_progress set equipped_title=null,updated_at=now() where user_id=v_uid and equipped_title=item_key_input;
   update public.social_profiles set player_title=null,updated_at=now() where user_id=v_uid and exists(select 1 from public.nexus_player_progress p where p.user_id=v_uid and p.equipped_title is null);
 else
   update public.nexus_player_progress set equipped_cosmetic=null,updated_at=now() where user_id=v_uid and equipped_cosmetic=item_key_input;
   update public.social_profiles set avatar_frame='violet',card_frame='violet',updated_at=now() where user_id=v_uid and exists(select 1 from public.nexus_player_progress p where p.user_id=v_uid and p.equipped_cosmetic is null);
 end if;
 return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.nexus_progression_unequip(text) from public, anon;
grant execute on function public.nexus_progression_unequip(text) to authenticated;
