-- NEXUS SOCIAL V4: missões de clã por jogo, contribuição individual e recompensas configuráveis.
-- Execute após nexus_social_v3.sql. Reexecutável.
create table if not exists public.social_clan_member_xp(
 clan_id uuid not null references public.social_clans(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 contributed_xp bigint not null default 0,
 updated_at timestamptz not null default now(),
 primary key(clan_id,user_id)
);
alter table public.social_clan_member_xp enable row level security;
drop policy if exists "Clan members read contribution XP" on public.social_clan_member_xp;
create policy "Clan members read contribution XP" on public.social_clan_member_xp for select to authenticated
 using(exists(select 1 from public.social_clan_members m where m.clan_id=social_clan_member_xp.clan_id and m.user_id=auth.uid()));
grant select on public.social_clan_member_xp to authenticated;

create table if not exists public.social_clan_missions(
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.social_clans(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 3 and 70),
 description text not null default '',
 game_key text not null default 'any',
 metric text not null default 'xp' check(metric in ('xp','wins','games','score')),
 goal bigint not null check(goal>0),
 progress bigint not null default 0,
 reward_xp integer not null default 0 check(reward_xp between 0 and 100000),
 reward_enabled boolean not null default true,
 status text not null default 'active' check(status in ('active','completed','cancelled')),
 created_at timestamptz not null default now(),
 completed_at timestamptz
);
alter table public.social_clan_missions enable row level security;
drop policy if exists "Clan members read missions" on public.social_clan_missions;
create policy "Clan members read missions" on public.social_clan_missions for select to authenticated
 using(exists(select 1 from public.social_clan_members m where m.clan_id=social_clan_missions.clan_id and m.user_id=auth.uid()));
grant select on public.social_clan_missions to authenticated;

create table if not exists public.social_clan_mission_members(
 mission_id uuid not null references public.social_clan_missions(id) on delete cascade,
 clan_id uuid not null references public.social_clans(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 progress bigint not null default 0,
 primary key(mission_id,user_id)
);
alter table public.social_clan_mission_members enable row level security;
drop policy if exists "Clan members read mission progress" on public.social_clan_mission_members;
create policy "Clan members read mission progress" on public.social_clan_mission_members for select to authenticated
 using(exists(select 1 from public.social_clan_members m where m.clan_id=social_clan_mission_members.clan_id and m.user_id=auth.uid()));
grant select on public.social_clan_mission_members to authenticated;

create or replace function public.social_create_clan_game_mission(
 target_clan uuid, mission_title text, mission_description text, target_game text,
 target_metric text, target_goal bigint, reward_amount integer, enable_reward boolean
) returns uuid language plpgsql security definer set search_path=public as $nexus$
declare new_id uuid;
begin
 if not exists(select 1 from public.social_clan_members where clan_id=target_clan and user_id=auth.uid() and role in ('leader','officer')) then
  raise exception 'Somente ADM ou oficial pode criar missões.';
 end if;
 if target_metric not in ('xp','wins','games','score') then raise exception 'Tipo de meta inválido.'; end if;
 insert into public.social_clan_missions(clan_id,created_by,title,description,game_key,metric,goal,reward_xp,reward_enabled)
 values(target_clan,auth.uid(),trim(mission_title),coalesce(mission_description,''),coalesce(nullif(target_game,''),'any'),target_metric,greatest(1,target_goal),greatest(0,least(coalesce(reward_amount,0),100000)),coalesce(enable_reward,true))
 returning id into new_id;
 insert into public.social_clan_mission_members(mission_id,clan_id,user_id)
 select new_id,target_clan,user_id from public.social_clan_members where clan_id=target_clan;
 return new_id;
end; $nexus$;
revoke all on function public.social_create_clan_game_mission(uuid,text,text,text,text,bigint,integer,boolean) from public;
grant execute on function public.social_create_clan_game_mission(uuid,text,text,text,text,bigint,integer,boolean) to authenticated;

create or replace function public.social_record_clan_game_xp(target_game text, xp_delta integer)
returns void language plpgsql security definer set search_path=public as $nexus$
declare cid uuid; mission record; delta integer;
begin
 delta:=greatest(0,least(coalesce(xp_delta,0),10000));
 if auth.uid() is null or delta=0 then return; end if;
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
end; $nexus$;
revoke all on function public.social_record_clan_game_xp(text,integer) from public;
grant execute on function public.social_record_clan_game_xp(text,integer) to authenticated;

do $nexus$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_clan_member_xp') then alter publication supabase_realtime add table public.social_clan_member_xp; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_clan_missions') then alter publication supabase_realtime add table public.social_clan_missions; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_clan_mission_members') then alter publication supabase_realtime add table public.social_clan_mission_members; end if;
end; $nexus$;
