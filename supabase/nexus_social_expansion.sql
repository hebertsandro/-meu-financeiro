-- NEXUS SOCIAL EXPANSION — chat, segurança, salas, clãs e desafios
-- Migração aditiva e reexecutável. Execute no Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.social_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('harassment','spam','inappropriate','impersonation','other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create table if not exists public.social_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (created_by, id)
);
create table if not exists public.social_conversation_members (
  conversation_id uuid not null references public.social_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.social_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists social_messages_conversation_created_idx on public.social_messages(conversation_id, created_at desc);

create table if not exists public.social_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 50),
  description text not null default '' check (char_length(description) <= 240),
  created_by uuid not null references auth.users(id) on delete cascade,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.social_room_members (
  room_id uuid not null references public.social_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create table if not exists public.social_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.social_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists social_room_messages_room_created_idx on public.social_room_messages(room_id, created_at desc);

create table if not exists public.social_clans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 32),
  tag text not null unique check (tag ~ '^[A-Z0-9]{2,6}$'),
  description text not null default '' check (char_length(description) <= 300),
  emblem text not null default '🛡️',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.social_clan_members (
  clan_id uuid not null references public.social_clans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('leader','officer','member')),
  joined_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);

create table if not exists public.social_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 70),
  description text not null default '' check (char_length(description) <= 300),
  challenge_type text not null check (challenge_type in ('duel','mission')),
  goal integer not null default 1 check (goal > 0),
  status text not null default 'open' check (status in ('open','active','completed','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.social_challenge_members (
  challenge_id uuid not null references public.social_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.social_blocks enable row level security;
alter table public.social_reports enable row level security;
alter table public.social_conversations enable row level security;
alter table public.social_conversation_members enable row level security;
alter table public.social_messages enable row level security;
alter table public.social_rooms enable row level security;
alter table public.social_room_members enable row level security;
alter table public.social_room_messages enable row level security;
alter table public.social_clans enable row level security;
alter table public.social_clan_members enable row level security;
alter table public.social_challenges enable row level security;
alter table public.social_challenge_members enable row level security;

drop policy if exists "Users manage own blocks" on public.social_blocks;
create policy "Users manage own blocks" on public.social_blocks for all to authenticated
 using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
drop policy if exists "Users submit reports" on public.social_reports;
create policy "Users submit reports" on public.social_reports for insert to authenticated
 with check (auth.uid() = reporter_id and reporter_id <> reported_id);
drop policy if exists "Users read own reports" on public.social_reports;
create policy "Users read own reports" on public.social_reports for select to authenticated
 using (auth.uid() = reporter_id);

drop policy if exists "Members read conversations" on public.social_conversations;
create policy "Members read conversations" on public.social_conversations for select to authenticated
 using (exists(select 1 from public.social_conversation_members m where m.conversation_id=id and m.user_id=auth.uid()));
drop policy if exists "Authenticated create conversations" on public.social_conversations;
create policy "Authenticated create conversations" on public.social_conversations for insert to authenticated with check (auth.uid()=created_by);
drop policy if exists "Members read conversation members" on public.social_conversation_members;
create policy "Members read conversation members" on public.social_conversation_members for select to authenticated
 using (exists(select 1 from public.social_conversation_members mine where mine.conversation_id=conversation_id and mine.user_id=auth.uid()));
drop policy if exists "Members read messages" on public.social_messages;
create policy "Members read messages" on public.social_messages for select to authenticated
 using (exists(select 1 from public.social_conversation_members m where m.conversation_id=social_messages.conversation_id and m.user_id=auth.uid()));
drop policy if exists "Members send messages without blocks" on public.social_messages;
create policy "Members send messages without blocks" on public.social_messages for insert to authenticated
 with check (
  sender_id=auth.uid()
  and exists(select 1 from public.social_conversation_members m where m.conversation_id=social_messages.conversation_id and m.user_id=auth.uid())
  and not exists(
   select 1 from public.social_conversation_members other
   join public.social_blocks b on (b.blocker_id=other.user_id and b.blocked_id=auth.uid()) or (b.blocker_id=auth.uid() and b.blocked_id=other.user_id)
   where other.conversation_id=social_messages.conversation_id and other.user_id<>auth.uid()
  )
 );

drop policy if exists "Discover public rooms" on public.social_rooms;
create policy "Discover public rooms" on public.social_rooms for select to authenticated
 using (not is_private or created_by=auth.uid() or exists(select 1 from public.social_room_members m where m.room_id=id and m.user_id=auth.uid()));
drop policy if exists "Create rooms" on public.social_rooms;
create policy "Create rooms" on public.social_rooms for insert to authenticated with check (created_by=auth.uid());
drop policy if exists "Read room members" on public.social_room_members;
create policy "Read room members" on public.social_room_members for select to authenticated
 using (exists(select 1 from public.social_rooms r where r.id=room_id and (not r.is_private or exists(select 1 from public.social_room_members me where me.room_id=r.id and me.user_id=auth.uid()))));
drop policy if exists "Join public rooms" on public.social_room_members;
create policy "Join public rooms" on public.social_room_members for insert to authenticated
 with check (user_id=auth.uid() and exists(select 1 from public.social_rooms r where r.id=room_id and not r.is_private));
drop policy if exists "Room members read messages" on public.social_room_messages;
create policy "Room members read messages" on public.social_room_messages for select to authenticated
 using (exists(select 1 from public.social_room_members m where m.room_id=social_room_messages.room_id and m.user_id=auth.uid()));
drop policy if exists "Room members send messages" on public.social_room_messages;
create policy "Room members send messages" on public.social_room_messages for insert to authenticated
 with check (sender_id=auth.uid() and exists(select 1 from public.social_room_members m where m.room_id=social_room_messages.room_id and m.user_id=auth.uid()));

drop policy if exists "Discover clans" on public.social_clans;
create policy "Discover clans" on public.social_clans for select to authenticated using (true);
drop policy if exists "Create clans" on public.social_clans;
create policy "Create clans" on public.social_clans for insert to authenticated with check (created_by=auth.uid());
drop policy if exists "Read clan members" on public.social_clan_members;
create policy "Read clan members" on public.social_clan_members for select to authenticated using (true);
drop policy if exists "Join clans" on public.social_clan_members;
create policy "Join clans" on public.social_clan_members for insert to authenticated with check (user_id=auth.uid());

drop policy if exists "Discover challenges" on public.social_challenges;
create policy "Discover challenges" on public.social_challenges for select to authenticated using (true);
drop policy if exists "Create challenges" on public.social_challenges;
create policy "Create challenges" on public.social_challenges for insert to authenticated with check (creator_id=auth.uid());
drop policy if exists "Read challenge members" on public.social_challenge_members;
create policy "Read challenge members" on public.social_challenge_members for select to authenticated using (true);
drop policy if exists "Join challenges" on public.social_challenge_members;
create policy "Join challenges" on public.social_challenge_members for insert to authenticated
 with check (user_id=auth.uid() and exists(select 1 from public.social_challenges c where c.id=challenge_id and c.status='open'));

create or replace function public.social_start_private_chat(target_user uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_conversation uuid;
begin
 if target_user is null or target_user=auth.uid() then raise exception 'Destinatário inválido.'; end if;
 if not exists (
  select 1 from public.social_friendships f
  where (f.user_a=least(auth.uid(),target_user) and f.user_b=greatest(auth.uid(),target_user))
 ) then raise exception 'Adicione esta pessoa como amiga antes de iniciar uma conversa.'; end if;
 if exists(select 1 from public.social_blocks b where (b.blocker_id=auth.uid() and b.blocked_id=target_user) or (b.blocker_id=target_user and b.blocked_id=auth.uid())) then
  raise exception 'Esta conversa não está disponível por causa das configurações de bloqueio.';
 end if;
 select c.id into new_conversation
 from public.social_conversations c
 join public.social_conversation_members a on a.conversation_id=c.id and a.user_id=auth.uid()
 join public.social_conversation_members b on b.conversation_id=c.id and b.user_id=target_user
 limit 1;
 if new_conversation is null then
  insert into public.social_conversations(created_by) values(auth.uid()) returning id into new_conversation;
  insert into public.social_conversation_members(conversation_id,user_id) values(new_conversation,auth.uid()),(new_conversation,target_user);
 end if;
 return new_conversation;
end; $$;
revoke all on function public.social_start_private_chat(uuid) from public;
grant execute on function public.social_start_private_chat(uuid) to authenticated;

create or replace function public.social_create_room(room_name text, room_description text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare new_room uuid;
begin
 insert into public.social_rooms(name,description,created_by) values(trim(room_name),coalesce(room_description,''),auth.uid()) returning id into new_room;
 insert into public.social_room_members(room_id,user_id) values(new_room,auth.uid());
 return new_room;
end; $$;
revoke all on function public.social_create_room(text,text) from public;
grant execute on function public.social_create_room(text,text) to authenticated;

create or replace function public.social_create_clan(clan_name text, clan_tag text, clan_description text default '', clan_emblem text default '🛡️')
returns uuid language plpgsql security definer set search_path=public as $$
declare new_clan uuid;
begin
 insert into public.social_clans(name,tag,description,emblem,created_by)
 values(trim(clan_name),upper(trim(clan_tag)),coalesce(clan_description,''),coalesce(clan_emblem,'🛡️'),auth.uid())
 returning id into new_clan;
 insert into public.social_clan_members(clan_id,user_id,role) values(new_clan,auth.uid(),'leader');
 return new_clan;
end; $$;
revoke all on function public.social_create_clan(text,text,text,text) from public;
grant execute on function public.social_create_clan(text,text,text,text) to authenticated;

create or replace function public.social_create_challenge(challenge_title text, challenge_description text, kind text, target_goal integer default 1, finish_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_challenge uuid;
begin
 if kind not in ('duel','mission') then raise exception 'Tipo de desafio inválido.'; end if;
 insert into public.social_challenges(creator_id,title,description,challenge_type,goal,ends_at,status)
 values(auth.uid(),trim(challenge_title),coalesce(challenge_description,''),kind,greatest(target_goal,1),finish_at,'open')
 returning id into new_challenge;
 insert into public.social_challenge_members(challenge_id,user_id) values(new_challenge,auth.uid());
 return new_challenge;
end; $$;
revoke all on function public.social_create_challenge(text,text,text,integer,timestamptz) from public;
grant execute on function public.social_create_challenge(text,text,text,integer,timestamptz) to authenticated;

-- Habilita publicação Realtime sem falhar se a publicação padrão não existir.
do $$
declare t text;
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['social_messages','social_room_messages'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
    execute format('alter publication supabase_realtime add table public.%I',t);
   end if;
  end loop;
 end if;
end $$;

grant select,insert on public.social_blocks to authenticated;
grant select,insert on public.social_reports to authenticated;
grant select,insert on public.social_conversations to authenticated;
grant select,insert on public.social_conversation_members to authenticated;
grant select,insert on public.social_messages to authenticated;
grant select,insert on public.social_rooms to authenticated;
grant select,insert on public.social_room_members to authenticated;
grant select,insert on public.social_room_messages to authenticated;
grant select,insert on public.social_clans to authenticated;
grant select,insert on public.social_clan_members to authenticated;
grant select,insert on public.social_challenges to authenticated;
grant select,insert on public.social_challenge_members to authenticated;
