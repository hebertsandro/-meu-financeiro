create or replace function public.nexus_world_claim_workers(target_clan uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w record; member record; elapsed_hours integer; total_xp integer:=0; total_coins integer:=0; worker_count integer:=0; claimed_count integer:=0; member_count integer:=0; member_index integer:=0; share_xp integer; share_coins integer; rem_xp integer; rem_coins integer;
begin
 if auth.uid() is null then raise exception 'Faça login para recolher a produção.'; end if;
 if not exists(select 1 from public.social_clan_members m where m.clan_id=target_clan and m.user_id=auth.uid()) then raise exception 'Você precisa fazer parte desta ilha.'; end if;
 for w in select id,last_collected_at from public.social_world_workers where clan_id=target_clan order by id for update loop
  worker_count:=worker_count+1;
  elapsed_hours:=least(8,greatest(0,floor(extract(epoch from (now()-w.last_collected_at))/3600)::integer));
  if elapsed_hours>0 then
   total_xp:=total_xp+(elapsed_hours*2); total_coins:=total_coins+elapsed_hours; claimed_count:=claimed_count+1;
   update public.social_world_workers set last_collected_at=case when elapsed_hours>=8 then now() else last_collected_at+(elapsed_hours*interval '1 hour') end where id=w.id;
  end if;
 end loop;
 if total_xp>0 then
  select count(*) into member_count from public.social_clan_members where clan_id=target_clan;
  if member_count>0 then
   share_xp:=total_xp/member_count; rem_xp:=mod(total_xp,member_count);
   share_coins:=total_coins/member_count; rem_coins:=mod(total_coins,member_count);
   for member in select user_id from public.social_clan_members where clan_id=target_clan order by user_id loop
    member_index:=member_index+1;
    update public.social_profiles set game_xp=coalesce(game_xp,0)+share_xp+case when member_index<=rem_xp then 1 else 0 end,updated_at=now() where user_id=member.user_id;
    insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at)
    values(member.user_id,share_coins+case when member_index<=rem_coins then 1 else 0 end,share_coins+case when member_index<=rem_coins then 1 else 0 end,now())
    on conflict(user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,collection_score=public.nexus_loot_wallets.collection_score+excluded.collection_score,updated_at=now();
   end loop;
  end if;
 end if;
 return jsonb_build_object('workers',worker_count,'productive_workers',claimed_count,'xp',total_xp,'coins',total_coins,'shared_with',member_count,'cap_hours',8);
end; $$;
revoke all on function public.nexus_world_claim_workers(uuid) from public,anon;
grant execute on function public.nexus_world_claim_workers(uuid) to authenticated;
