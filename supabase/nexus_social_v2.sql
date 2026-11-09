-- NEXUS SOCIAL V2: clãs com missões, salas privadas por convite e duelos vinculados às salas.
-- Execute após nexus_social_expansion.sql. Reexecutável.
alter table public.social_rooms add column if not exists room_type text not null default 'private' check (room_type in ('private','public'));
alter table public.social_rooms add column if not exists max_members integer not null default 12 check (max_members between 2 and 100);
update public.social_rooms set room_type=case when is_private then 'private' else 'public' end;
alter table public.social_rooms alter column is_private set default true;
alter table public.social_clans add column if not exists motto text not null default '' check (char_length(motto)<=100);
alter table public.social_challenges add column if not exists clan_id uuid references public.social_clans(id) on delete cascade;
alter table public.social_challenges add column if not exists room_id uuid references public.social_rooms(id) on delete cascade;
alter table public.social_challenges add column if not exists game_key text;
alter table public.social_challenges add column if not exists winner_id uuid references auth.users(id) on delete set null;

create table if not exists public.social_room_invites(
 room_id uuid not null references public.social_rooms(id) on delete cascade,
 invited_user_id uuid not null references auth.users(id) on delete cascade,
 invited_by uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 primary key(room_id,invited_user_id)
);
alter table public.social_room_invites enable row level security;
drop policy if exists "Room invite recipients read" on public.social_room_invites;
create policy "Room invite recipients read" on public.social_room_invites for select to authenticated using(invited_user_id=auth.uid() or invited_by=auth.uid());
drop policy if exists "Room invite recipients update" on public.social_room_invites;
create policy "Room invite recipients update" on public.social_room_invites for update to authenticated using(invited_user_id=auth.uid()) with check(invited_user_id=auth.uid());
grant select,update on public.social_room_invites to authenticated;

create or replace function public.social_create_room(room_name text, room_description text default '', private_room boolean default true, member_limit integer default 12)
returns uuid language plpgsql security definer set search_path=public as $nexus$
declare new_room uuid;
begin
 if auth.uid() is null then raise exception 'Faça login para criar uma sala.'; end if;
 insert into public.social_rooms(name,description,created_by,is_private,room_type,max_members)
 values(trim(room_name),coalesce(room_description,''),auth.uid(),private_room,case when private_room then 'private' else 'public' end,greatest(2,least(coalesce(member_limit,12),100)))
 returning id into new_room;
 insert into public.social_room_members(room_id,user_id) values(new_room,auth.uid());
 return new_room;
end; $nexus$;
revoke all on function public.social_create_room(text,text,boolean,integer) from public;
grant execute on function public.social_create_room(text,text,boolean,integer) to authenticated;

create or replace function public.social_invite_room_friend(target_room uuid,target_user uuid)
returns void language plpgsql security definer set search_path=public as $nexus$
declare r public.social_rooms%rowtype;
begin
 select * into r from public.social_rooms where id=target_room;
 if not found or not exists(select 1 from public.social_room_members where room_id=target_room and user_id=auth.uid()) then raise exception 'Somente participantes podem convidar.'; end if;
 if not exists(select 1 from public.social_friendships f where (f.user_a=auth.uid() and f.user_b=target_user) or (f.user_b=auth.uid() and f.user_a=target_user)) then raise exception 'Só é possível convidar amigos.'; end if;
 if exists(select 1 from public.social_room_members where room_id=target_room and user_id=target_user) then raise exception 'Esse amigo já está na sala.'; end if;
 insert into public.social_room_invites(room_id,invited_user_id,invited_by) values(target_room,target_user,auth.uid())
 on conflict(room_id,invited_user_id) do update set invited_by=excluded.invited_by,status='pending',created_at=now();
end; $nexus$;
revoke all on function public.social_invite_room_friend(uuid,uuid) from public;
grant execute on function public.social_invite_room_friend(uuid,uuid) to authenticated;

create or replace function public.social_accept_room_invite(target_room uuid)
returns void language plpgsql security definer set search_path=public as $nexus$
declare r public.social_rooms%rowtype;
begin
 select * into r from public.social_rooms where id=target_room for update;
 if not found then raise exception 'Sala não encontrada.'; end if;
 if not exists(select 1 from public.social_room_invites where room_id=target_room and invited_user_id=auth.uid() and status='pending') then raise exception 'Convite não encontrado.'; end if;
 if (select count(*) from public.social_room_members where room_id=target_room)>=r.max_members then raise exception 'Sala cheia.'; end if;
 insert into public.social_room_members(room_id,user_id) values(target_room,auth.uid()) on conflict do nothing;
 update public.social_room_invites set status='accepted' where room_id=target_room and invited_user_id=auth.uid();
end; $nexus$;
revoke all on function public.social_accept_room_invite(uuid) from public;
grant execute on function public.social_accept_room_invite(uuid) to authenticated;

drop policy if exists "Discover public rooms" on public.social_rooms;
create policy "Discover public rooms" on public.social_rooms for select to authenticated using(room_type='public' or created_by=auth.uid() or public.social_is_room_member(id,auth.uid()));
drop policy if exists "Join public rooms" on public.social_room_members;
create policy "Join public rooms" on public.social_room_members for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.social_rooms r where r.id=room_id and r.room_type='public'));
drop policy if exists "Room members read messages" on public.social_room_messages;
create policy "Room members read messages" on public.social_room_messages for select to authenticated using(public.social_is_room_member(room_id,auth.uid()));
drop policy if exists "Room members send messages" on public.social_room_messages;
create policy "Room members send messages" on public.social_room_messages for insert to authenticated with check(sender_id=auth.uid() and public.social_is_room_member(room_id,auth.uid()));

create or replace function public.social_create_clan_mission(target_clan uuid, mission_title text, mission_description text, target_goal integer default 100)
returns uuid language plpgsql security definer set search_path=public as $nexus$
declare new_id uuid;
begin
 if not exists(select 1 from public.social_clan_members where clan_id=target_clan and user_id=auth.uid() and role in ('leader','officer')) then raise exception 'Somente líder ou oficial pode criar missões.'; end if;
 insert into public.social_challenges(creator_id,title,description,challenge_type,goal,clan_id,status)
 values(auth.uid(),trim(mission_title),coalesce(mission_description,''),'mission',greatest(1,least(target_goal,100000)),target_clan,'open') returning id into new_id;
 insert into public.social_challenge_members(challenge_id,user_id) select new_id,user_id from public.social_clan_members where clan_id=target_clan;
 return new_id;
end; $nexus$;
revoke all on function public.social_create_clan_mission(uuid,text,text,integer) from public;
grant execute on function public.social_create_clan_mission(uuid,text,text,integer) to authenticated;

create or replace function public.social_increment_challenge_progress(target_challenge uuid, increment_by integer default 1)
returns table(my_progress integer, challenge_status text, total_progress bigint)
language plpgsql security definer set search_path=public as $nexus$
declare ch public.social_challenges%rowtype; current_progress integer; total bigint;
begin
 select * into ch from public.social_challenges where id=target_challenge for update;
 if not found or ch.status not in ('open','active') then raise exception 'Este desafio não está ativo.'; end if;
 if ch.clan_id is not null and not exists(select 1 from public.social_clan_members where clan_id=ch.clan_id and user_id=auth.uid()) then raise exception 'Apenas membros do clã podem contribuir.'; end if;
 update public.social_challenge_members set progress=least(ch.goal,progress+greatest(1,least(coalesce(increment_by,1),100)))
 where challenge_id=target_challenge and user_id=auth.uid() returning progress into current_progress;
 if not found then raise exception 'Você não faz parte deste desafio.'; end if;
 select coalesce(sum(progress),0) into total from public.social_challenge_members where challenge_id=target_challenge;
 if total>=ch.goal then update public.social_challenges set status='completed' where id=target_challenge;
 else update public.social_challenges set status='active' where id=target_challenge; end if;
 return query select current_progress,(select status from public.social_challenges where id=target_challenge),total;
end; $nexus$;
revoke all on function public.social_increment_challenge_progress(uuid,integer) from public;
grant execute on function public.social_increment_challenge_progress(uuid,integer) to authenticated;

create table if not exists public.social_room_duels(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.social_rooms(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 opponent_id uuid not null references auth.users(id) on delete cascade,
 game_key text not null check(game_key in ('space-nexus','piggy-run','memory','quiz','gem-match','tic-tac-toe')),
 status text not null default 'pending' check(status in ('pending','accepted','live','completed','declined','cancelled')),
 challenger_score integer,
 opponent_score integer,
 winner_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 started_at timestamptz,
 finished_at timestamptz,
 check(created_by<>opponent_id)
);
alter table public.social_room_duels enable row level security;
drop policy if exists "Room duel participants read" on public.social_room_duels;
create policy "Room duel participants read" on public.social_room_duels for select to authenticated using(
 (created_by=auth.uid() or opponent_id=auth.uid()) and public.social_is_room_member(room_id,auth.uid())
);
grant select on public.social_room_duels to authenticated;

create or replace function public.social_create_room_duel(target_room uuid,target_opponent uuid,selected_game text)
returns uuid language plpgsql security definer set search_path=public as $nexus$
declare new_id uuid;
begin
 if not public.social_is_room_member(target_room,auth.uid()) or not public.social_is_room_member(target_room,target_opponent) then raise exception 'Os dois jogadores precisam estar na sala.'; end if;
 if selected_game not in ('space-nexus','piggy-run','memory','quiz','gem-match','tic-tac-toe') then raise exception 'Jogo inválido.'; end if;
 insert into public.social_room_duels(room_id,created_by,opponent_id,game_key) values(target_room,auth.uid(),target_opponent,selected_game) returning id into new_id;
 return new_id;
end; $nexus$;
revoke all on function public.social_create_room_duel(uuid,uuid,text) from public;
grant execute on function public.social_create_room_duel(uuid,uuid,text) to authenticated;


create or replace function public.social_respond_room_duel(target_duel uuid, accept_duel boolean)
returns void language plpgsql security definer set search_path=public as $nexus$
declare d public.social_room_duels%rowtype;
begin
 select * into d from public.social_room_duels where id=target_duel for update;
 if not found or d.opponent_id<>auth.uid() or d.status<>'pending' then raise exception 'Este convite de duelo não está disponível.'; end if;
 update public.social_room_duels set status=case when accept_duel then 'accepted' else 'declined' end where id=target_duel;
end; $nexus$;
revoke all on function public.social_respond_room_duel(uuid,boolean) from public;
grant execute on function public.social_respond_room_duel(uuid,boolean) to authenticated;

create or replace function public.social_start_room_duel(target_duel uuid)
returns void language plpgsql security definer set search_path=public as $nexus$
begin
 update public.social_room_duels set status='live',started_at=now()
 where id=target_duel and created_by=auth.uid() and status='accepted';
 if not found then raise exception 'O duelo precisa ser aceito pelo amigo antes de começar.'; end if;
end; $nexus$;
revoke all on function public.social_start_room_duel(uuid) from public;
grant execute on function public.social_start_room_duel(uuid) to authenticated;

alter table public.social_room_duels replica identity full;
do $nexus$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_room_duels') then
  alter publication supabase_realtime add table public.social_room_duels;
 end if;
end; $nexus$;
