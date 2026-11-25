create or replace function public.nexus_sync_game_xp(xp_input integer, correct_input integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_xp int; v_cor int; v_new int; v_newc int;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select game_xp,game_correct into v_xp,v_cor from public.social_profiles where user_id=v_uid for update;
 if not found then return jsonb_build_object('ok',false); end if;
 v_new:=least(greatest(coalesce(xp_input,0),coalesce(v_xp,0)),coalesce(v_xp,0)+3000);
 v_newc:=least(greatest(coalesce(correct_input,0),coalesce(v_cor,0)),coalesce(v_cor,0)+300);
 update public.social_profiles set game_xp=v_new,game_correct=v_newc,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'game_xp',v_new,'game_correct',v_newc);
end; $$;
