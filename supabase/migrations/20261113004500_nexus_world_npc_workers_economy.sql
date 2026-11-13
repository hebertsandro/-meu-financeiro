-- NEXUS WORLD WORKERS: NPCs produce only in-app XP and NEXUS coins.
create table if not exists public.social_world_workers (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.social_clans(id) on delete cascade,
 building_id uuid not null unique references public.social_clan_world_buildings(id) on delete cascade,
 hired_by uuid not null references auth.users(id) on delete restrict,
 npc_name text not null,
 hired_at timestamptz not null default now(),
 last_collected_at timestamptz not null default now()
);
create index if not exists social_world_workers_clan_idx on public.social_world_workers(clan_id);
alter table public.social_world_workers enable row level security;
drop policy if exists "Clan members view NEXUS World workers" on public.social_world_workers;
create policy "Clan members view NEXUS World workers" on public.social_world_workers
 for select to authenticated using (
  exists(select 1 from public.social_clan_members m where m.clan_id=social_world_workers.clan_id and m.user_id=(select auth.uid()))
 );
revoke all on public.social_world_workers from anon, public, authenticated;
grant select on public.social_world_workers to authenticated;

create or replace function public.nexus_world_hire_worker(target_building uuid, payment_method text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b record; cost_coins integer:=30; cost_xp integer:=100; npc text; wallet_coins bigint; player_xp integer;
begin
 if auth.uid() is null then raise exception 'Faça login para contratar um trabalhador.'; end if;
 if payment_method not in ('coins','xp') then raise exception 'Forma de pagamento inválida.'; end if;
 select w.id,w.clan_id,w.building_type into b from public.social_clan_world_buildings w where w.id=target_building for update;
 if not found then raise exception 'Construção não encontrada.'; end if;
 if not exists(select 1 from public.social_clan_members m where m.clan_id=b.clan_id and m.user_id=auth.uid()) then raise exception 'Você precisa fazer parte desta ilha.'; end if;
 if exists(select 1 from public.social_world_workers x where x.building_id=b.id) then raise exception 'Esta construção já tem um trabalhador.'; end if;
 if payment_method='coins' then
  insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at) values(auth.uid(),0,0,now()) on conflict(user_id) do nothing;
  select coins into wallet_coins from public.nexus_loot_wallets where user_id=auth.uid() for update;
  if coalesce(wallet_coins,0)<cost_coins then raise exception 'Você precisa de 30 Moedas NEXUS para contratar.'; end if;
  update public.nexus_loot_wallets set coins=coins-cost_coins,updated_at=now() where user_id=auth.uid();
 else
  select game_xp into player_xp from public.social_profiles where user_id=auth.uid() for update;
  if coalesce(player_xp,0)<cost_xp then raise exception 'Você precisa de 100 XP para contratar.'; end if;
  update public.social_profiles set game_xp=game_xp-cost_xp,updated_at=now() where user_id=auth.uid();
 end if;
 npc:=(array['Lumi','Niko','Teca','Zuri','Pip','Kiko','Mika','Tobi','Yuna','Bilu','Cora','Noa'])[1+floor(random()*12)::integer];
 insert into public.social_world_workers(clan_id,building_id,hired_by,npc_name) values(b.clan_id,b.id,auth.uid(),npc);
 return jsonb_build_object('success',true,'npc_name',npc,'building_id',b.id,'cost',case when payment_method='coins' then cost_coins else cost_xp end,'payment_method',payment_method);
end; $$;

create or replace function public.nexus_world_claim_workers(target_clan uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w record; elapsed_hours integer; total_xp integer:=0; total_coins integer:=0; worker_count integer:=0; claimed_count integer:=0;
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
  update public.social_profiles set game_xp=game_xp+total_xp,updated_at=now() where user_id=auth.uid();
  insert into public.nexus_loot_wallets(user_id,coins,collection_score,updated_at) values(auth.uid(),total_coins,total_coins,now())
  on conflict(user_id) do update set coins=public.nexus_loot_wallets.coins+excluded.coins,collection_score=public.nexus_loot_wallets.collection_score+excluded.collection_score,updated_at=now();
 end if;
 return jsonb_build_object('workers',worker_count,'productive_workers',claimed_count,'xp',total_xp,'coins',total_coins,'cap_hours',8);
end; $$;
revoke all on function public.nexus_world_hire_worker(uuid,text) from public,anon;
revoke all on function public.nexus_world_claim_workers(uuid) from public,anon;
grant execute on function public.nexus_world_hire_worker(uuid,text) to authenticated;
grant execute on function public.nexus_world_claim_workers(uuid) to authenticated;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_world_workers') then alter publication supabase_realtime add table public.social_world_workers; end if; end $$;
