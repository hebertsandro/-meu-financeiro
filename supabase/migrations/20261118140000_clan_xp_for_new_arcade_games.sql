CREATE OR REPLACE FUNCTION public.social_record_clan_game_xp(target_game text, xp_delta integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare cid uuid; mission record; delta integer;
begin
 if auth.uid() is null then raise exception 'Faça login para registrar XP do clã.'; end if;
 if target_game not in ('quiz','space-nexus','piggy-run','extra-dungeon','extra-gems','extra-race','extra-defense') then raise exception 'Jogo inválido.'; end if;
 if xp_delta is null or xp_delta<1 or
    xp_delta>(case target_game when 'quiz' then 5 when 'piggy-run' then 25 else 35 end)
 then raise exception 'Quantidade de XP fora do limite permitido para este jogo.'; end if;
 delta:=xp_delta;
 select clan_id into cid from public.social_clan_members where user_id=auth.uid() limit 1;
 if cid is null then return; end if;
 insert into public.social_clan_member_xp(clan_id,user_id,contributed_xp,updated_at)
 values(cid,auth.uid(),delta,now())
 on conflict(clan_id,user_id) do update set contributed_xp=public.social_clan_member_xp.contributed_xp+excluded.contributed_xp,updated_at=now();
 update public.social_clans set clan_xp=clan_xp+delta,level=1+floor(sqrt((clan_xp+delta)::numeric/100))::integer where id=cid;
 for mission in
  select * from public.social_clan_missions
  where clan_id=cid and status='active' and metric='xp' and (game_key='any' or game_key=target_game)
  for update
 loop
  update public.social_clan_mission_members set progress=least(mission.goal,progress+delta)
  where mission_id=mission.id and user_id=auth.uid();
  update public.social_clan_missions set progress=least(goal,progress+delta),
   status=case when progress+delta>=goal then 'completed' else 'active' end,
   completed_at=case when progress+delta>=goal then now() else null end
  where id=mission.id;
  if mission.progress+delta>=mission.goal and mission.reward_enabled and mission.reward_xp>0 then
   update public.social_clans set clan_xp=clan_xp+mission.reward_xp,
    level=1+floor(sqrt((clan_xp+mission.reward_xp)::numeric/100))::integer where id=cid;
  end if;
 end loop;
end; $function$
;