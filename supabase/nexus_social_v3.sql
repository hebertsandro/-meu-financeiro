-- NEXUS SOCIAL V3: salas invisiveis por codigo/convite, clãs completos e arena sincronizada.
-- Executar apos nexus_social_v2.sql. Reexecutavel.
alter table public.social_rooms add column if not exists access_code text;
update public.social_rooms set access_code=upper(substr(encode(gen_random_bytes(6),'hex'),1,8)) where access_code is null;
alter table public.social_rooms alter column access_code set not null;
create unique index if not exists social_rooms_access_code_uidx on public.social_rooms(access_code);
alter table public.social_rooms add column if not exists room_type text not null default 'private';
update public.social_rooms set room_type='private',is_private=true;
drop policy if exists "Discover public rooms" on public.social_rooms;
drop policy if exists "Room creator and members read" on public.social_rooms;
create policy "Room creator and members read" on public.social_rooms for select to authenticated using(created_by=auth.uid() or public.social_is_room_member(id,auth.uid()));
create or replace function public.social_create_room(room_name text,room_description text default '',private_room boolean default true,member_limit integer default 12)
returns uuid language plpgsql security definer set search_path=public as $nexus$
declare new_room uuid; code text;
begin
 if auth.uid() is null then raise exception 'Faça login para criar uma sala.'; end if;
 if private_room is false then raise exception 'As salas NEXUS são privadas e acessadas por convite ou código.'; end if;
 code:=upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
 insert into public.social_rooms(name,description,created_by,is_private,room_type,max_members,access_code)
 values(trim(room_name),coalesce(room_description,''),auth.uid(),true,'private',greatest(2,least(coalesce(member_limit,12),100)),code) returning id into new_room;
 insert into public.social_room_members(room_id,user_id) values(new_room,auth.uid());
 return new_room;
end; $nexus$;
revoke all on function public.social_create_room(text,text,boolean,integer) from public;
grant execute on function public.social_create_room(text,text,boolean,integer) to authenticated;
create or replace function public.social_join_room_by_code(room_code text)
returns uuid language plpgsql security definer set search_path=public as $nexus$
declare r public.social_rooms%rowtype;
begin
 select * into r from public.social_rooms where access_code=upper(trim(room_code)) for update;
 if not found then raise exception 'Código não encontrado. Confira e tente novamente.'; end if;
 if (select count(*) from public.social_room_members where room_id=r.id)>=r.max_members then raise exception 'Esta sala está cheia.'; end if;
 insert into public.social_room_members(room_id,user_id) values(r.id,auth.uid()) on conflict do nothing;
 return r.id;
end; $nexus$;
revoke all on function public.social_join_room_by_code(text) from public;
grant execute on function public.social_join_room_by_code(text) to authenticated;

-- Personalização e identidade de clã.
alter table public.social_clans add column if not exists banner_url text not null default '';
alter table public.social_clans add column if not exists color_theme text not null default 'violet';
alter table public.social_clans add column if not exists motto text not null default '';
alter table public.social_clans add column if not exists clan_xp bigint not null default 0;
alter table public.social_clans add column if not exists level integer not null default 1;
create table if not exists public.social_clan_messages(
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.social_clans(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
alter table public.social_clan_messages enable row level security;
drop policy if exists "Clan members read messages" on public.social_clan_messages;
create policy "Clan members read messages" on public.social_clan_messages for select to authenticated using(exists(select 1 from public.social_clan_members m where m.clan_id=social_clan_messages.clan_id and m.user_id=auth.uid()));
drop policy if exists "Clan members send messages" on public.social_clan_messages;
create policy "Clan members send messages" on public.social_clan_messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.social_clan_members m where m.clan_id=social_clan_messages.clan_id and m.user_id=auth.uid()));
grant select,insert on public.social_clan_messages to authenticated;
create or replace function public.social_update_clan_look(target_clan uuid,new_emblem text,new_banner text,new_theme text,new_motto text)
returns void language plpgsql security definer set search_path=public as $nexus$
begin
 if not exists(select 1 from public.social_clan_members where clan_id=target_clan and user_id=auth.uid() and role='leader') then raise exception 'Somente o ADM do clã pode alterar sua identidade.'; end if;
 update public.social_clans set emblem=left(coalesce(new_emblem,'🛡️'),12),banner_url=left(coalesce(new_banner,''),500),color_theme=case when new_theme in ('violet','cyan','gold','crimson','emerald') then new_theme else 'violet' end,motto=left(coalesce(new_motto,''),100) where id=target_clan;
end; $nexus$;
revoke all on function public.social_update_clan_look(uuid,text,text,text,text) from public;
grant execute on function public.social_update_clan_look(uuid,text,text,text,text) to authenticated;

-- Missões, chat e salas habilitados em realtime.
alter table public.social_room_duels add column if not exists starts_at timestamptz;
alter table public.social_room_duels add column if not exists current_round integer not null default 0;
alter table public.social_room_duels add column if not exists game_state jsonb not null default '{}'::jsonb;
alter table public.social_room_duels add column if not exists challenger_score integer not null default 0;
alter table public.social_room_duels add column if not exists opponent_score integer not null default 0;
drop function if exists public.social_start_room_duel(uuid);
create or replace function public.social_start_room_duel(target_duel uuid)
returns timestamptz language plpgsql security definer set search_path=public as $nexus$
declare scheduled timestamptz;
begin
 update public.social_room_duels set status='live',started_at=now(),starts_at=now()+interval '3 seconds',current_round=0,challenger_score=0,opponent_score=0,game_state='{}'::jsonb
 where id=target_duel and created_by=auth.uid() and status='accepted' returning starts_at into scheduled;
 if not found then raise exception 'O duelo precisa ser aceito pelo amigo antes de começar.'; end if;
 return scheduled;
end; $nexus$;
revoke all on function public.social_start_room_duel(uuid) from public;
grant execute on function public.social_start_room_duel(uuid) to authenticated;
create or replace function public.social_submit_duel_score(target_duel uuid,score_delta integer,round_number integer)
returns table(challenger integer,opponent integer)
language plpgsql security definer set search_path=public as $nexus$
declare d public.social_room_duels%rowtype;
begin
 select * into d from public.social_room_duels where id=target_duel for update;
 if not found or auth.uid() not in (d.created_by,d.opponent_id) or d.status<>'live' or now()<d.starts_at then raise exception 'A partida ainda não começou ou não está disponível.'; end if;
 if round_number<=d.current_round then raise exception 'Esta rodada já foi registrada.'; end if;
 update public.social_room_duels set current_round=round_number,
 challenger_score=challenger_score+case when d.created_by=auth.uid() then greatest(0,least(score_delta,100)) else 0 end,
 opponent_score=opponent_score+case when d.opponent_id=auth.uid() then greatest(0,least(score_delta,100)) else 0 end
 where id=target_duel returning challenger_score,opponent_score into challenger,opponent;
 return next;
end; $nexus$;
revoke all on function public.social_submit_duel_score(uuid,integer,integer) from public;
grant execute on function public.social_submit_duel_score(uuid,integer,integer) to authenticated;
alter table public.social_room_duels replica identity full;
do $nexus$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_clan_messages') then alter publication supabase_realtime add table public.social_clan_messages; end if;
end; $nexus$;


create table if not exists public.social_room_duel_answers(
 duel_id uuid not null references public.social_room_duels(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 round_number integer not null check(round_number between 1 and 20),
 points integer not null default 0 check(points between 0 and 100),
 created_at timestamptz not null default now(),
 primary key(duel_id,user_id,round_number)
);
alter table public.social_room_duel_answers enable row level security;
drop policy if exists "Duel participants read answers" on public.social_room_duel_answers;
create policy "Duel participants read answers" on public.social_room_duel_answers for select to authenticated using(exists(select 1 from public.social_room_duels d where d.id=duel_id and auth.uid() in (d.created_by,d.opponent_id)));
grant select on public.social_room_duel_answers to authenticated;
create or replace function public.social_submit_duel_score(target_duel uuid,score_delta integer,round_number integer)
returns table(challenger integer,opponent integer)
language plpgsql security definer set search_path=public as $nexus$
declare d public.social_room_duels%rowtype;
begin
 select * into d from public.social_room_duels where id=target_duel for update;
 if not found or auth.uid() not in (d.created_by,d.opponent_id) or d.status<>'live' or now()<d.starts_at then raise exception 'A partida ainda não começou ou não está disponível.'; end if;
 insert into public.social_room_duel_answers(duel_id,user_id,round_number,points)
 values($1,auth.uid(),$3,greatest(0,least($2,100)))
 on conflict on constraint social_room_duel_answers_pkey do nothing;
 update public.social_room_duels set
 challenger_score=(select coalesce(sum(points),0) from public.social_room_duel_answers where duel_id=target_duel and user_id=d.created_by),
 opponent_score=(select coalesce(sum(points),0) from public.social_room_duel_answers where duel_id=target_duel and user_id=d.opponent_id)
 where id=target_duel;
 return query select d2.challenger_score,d2.opponent_score from public.social_room_duels d2 where d2.id=target_duel;
end; $nexus$;
revoke all on function public.social_submit_duel_score(uuid,integer,integer) from public;
grant execute on function public.social_submit_duel_score(uuid,integer,integer) to authenticated;
do $nexus$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_room_duel_answers') then alter publication supabase_realtime add table public.social_room_duel_answers; end if;
end; $nexus$;


create or replace function public.social_get_player_clan(target_user uuid default auth.uid())
returns table(clan_id uuid,clan_name text,clan_tag text,clan_emblem text,clan_role text,clan_level integer)
language sql stable security definer set search_path=public as $nexus$
 select c.id,c.name,c.tag,c.emblem,m.role,c.level
 from public.social_clan_members m join public.social_clans c on c.id=m.clan_id
 where m.user_id=target_user order by case m.role when 'leader' then 0 when 'officer' then 1 else 2 end,m.joined_at limit 1;
$nexus$;
revoke all on function public.social_get_player_clan(uuid) from public;
grant execute on function public.social_get_player_clan(uuid) to authenticated;


create or replace function public.social_award_clan_xp()
returns trigger language plpgsql security definer set search_path=public as $nexus$
declare cid uuid; delta integer;
begin
 select clan_id into cid from public.social_challenges where id=new.challenge_id;
 if cid is not null then
  delta:=greatest(0,new.progress-coalesce(old.progress,0));
  if delta>0 then update public.social_clans set clan_xp=clan_xp+delta,level=1+floor(sqrt((clan_xp+delta)::numeric/100))::integer where id=cid; end if;
 end if;
 return new;
end; $nexus$;
drop trigger if exists social_clan_xp_on_mission_progress on public.social_challenge_members;
create trigger social_clan_xp_on_mission_progress after insert or update of progress on public.social_challenge_members for each row execute function public.social_award_clan_xp();
