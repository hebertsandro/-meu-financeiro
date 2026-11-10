-- NEXUS Social chat controls: edits, reactions, read receipts and safe group role management.
alter table public.social_messages enable row level security;
drop policy if exists "Users edit own private messages" on public.social_messages;
create policy "Users edit own private messages" on public.social_messages for update to authenticated
using(sender_id=(select auth.uid())) with check(sender_id=(select auth.uid()));
alter table public.social_room_messages enable row level security;
drop policy if exists "Users edit own group messages" on public.social_room_messages;
create policy "Users edit own group messages" on public.social_room_messages for update to authenticated
using(sender_id=(select auth.uid()) and social_is_room_member(room_id,(select auth.uid()))) with check(sender_id=(select auth.uid()) and social_is_room_member(room_id,(select auth.uid())));
alter table public.social_clan_messages enable row level security;
drop policy if exists "Users edit own clan messages" on public.social_clan_messages;
create policy "Users edit own clan messages" on public.social_clan_messages for update to authenticated
using(sender_id=(select auth.uid()) and exists(select 1 from public.social_clan_members m where m.clan_id=social_clan_messages.clan_id and m.user_id=(select auth.uid()))) with check(sender_id=(select auth.uid()) and exists(select 1 from public.social_clan_members m where m.clan_id=social_clan_messages.clan_id and m.user_id=(select auth.uid())));

create table if not exists public.social_room_message_reactions (
 message_id uuid not null references public.social_room_messages(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction text not null check(reaction in ('❤️','🔥','👏','😂','👍')),
 created_at timestamptz not null default now(), primary key(message_id,user_id)
);
alter table public.social_room_message_reactions enable row level security;
drop policy if exists "Room members read message reactions" on public.social_room_message_reactions;
create policy "Room members read message reactions" on public.social_room_message_reactions for select to authenticated
using(exists(select 1 from public.social_room_messages m where m.id=message_id and social_is_room_member(m.room_id,(select auth.uid()))));
drop policy if exists "Room members react to messages" on public.social_room_message_reactions;
create policy "Room members react to messages" on public.social_room_message_reactions for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.social_room_messages m where m.id=message_id and social_is_room_member(m.room_id,(select auth.uid()))));
drop policy if exists "Users update own room reactions" on public.social_room_message_reactions;
create policy "Users update own room reactions" on public.social_room_message_reactions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Users delete own room reactions" on public.social_room_message_reactions;
create policy "Users delete own room reactions" on public.social_room_message_reactions for delete to authenticated using(user_id=(select auth.uid()));

create table if not exists public.social_clan_message_reactions (
 message_id uuid not null references public.social_clan_messages(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction text not null check(reaction in ('❤️','🔥','👏','😂','👍')),
 created_at timestamptz not null default now(), primary key(message_id,user_id)
);
alter table public.social_clan_message_reactions enable row level security;
drop policy if exists "Clan members read message reactions" on public.social_clan_message_reactions;
create policy "Clan members read message reactions" on public.social_clan_message_reactions for select to authenticated
using(exists(select 1 from public.social_clan_messages m join public.social_clan_members cm on cm.clan_id=m.clan_id where m.id=message_id and cm.user_id=(select auth.uid())));
drop policy if exists "Clan members react to messages" on public.social_clan_message_reactions;
create policy "Clan members react to messages" on public.social_clan_message_reactions for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.social_clan_messages m join public.social_clan_members cm on cm.clan_id=m.clan_id where m.id=message_id and cm.user_id=(select auth.uid())));
drop policy if exists "Users update own clan reactions" on public.social_clan_message_reactions;
create policy "Users update own clan reactions" on public.social_clan_message_reactions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Users delete own clan reactions" on public.social_clan_message_reactions;
create policy "Users delete own clan reactions" on public.social_clan_message_reactions for delete to authenticated using(user_id=(select auth.uid()));

drop policy if exists "Room creators remove members" on public.social_room_members;
create policy "Room creators remove members" on public.social_room_members for delete to authenticated
using(user_id=(select auth.uid()) or exists(select 1 from public.social_rooms r where r.id=room_id and r.created_by=(select auth.uid())));

create or replace function public.social_mark_conversation_read(target_conversation uuid)
returns integer language plpgsql security definer set search_path=''
as $function$
declare changed integer;
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 if not exists(select 1 from public.social_conversation_members m where m.conversation_id=target_conversation and m.user_id=auth.uid()) then
  raise exception 'Você não participa desta conversa.';
 end if;
 update public.social_messages set read_at=now()
 where conversation_id=target_conversation and sender_id<>auth.uid() and read_at is null;
 get diagnostics changed=row_count;
 return changed;
end;
$function$;
revoke all on function public.social_mark_conversation_read(uuid) from public,anon;
grant execute on function public.social_mark_conversation_read(uuid) to authenticated;
