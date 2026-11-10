alter table public.social_conversation_preferences add column if not exists is_muted boolean not null default false;
create table if not exists public.social_room_preferences(
 room_id uuid not null references public.social_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 is_muted boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
alter table public.social_room_preferences enable row level security;
drop policy if exists "Users read own room preferences" on public.social_room_preferences;
create policy "Users read own room preferences" on public.social_room_preferences for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users create own room preferences" on public.social_room_preferences;
create policy "Users create own room preferences" on public.social_room_preferences for insert to authenticated
with check(user_id=(select auth.uid()) and social_is_room_member(room_id,(select auth.uid())));
drop policy if exists "Users update own room preferences" on public.social_room_preferences;
create policy "Users update own room preferences" on public.social_room_preferences for update to authenticated
using(user_id=(select auth.uid()) and social_is_room_member(room_id,(select auth.uid())))
with check(user_id=(select auth.uid()) and social_is_room_member(room_id,(select auth.uid())));

drop policy if exists "Private replies stay in conversation" on public.social_messages;
create policy "Private replies stay in conversation" on public.social_messages as restrictive for insert to authenticated
with check(reply_to_id is null or exists(select 1 from public.social_messages parent where parent.id=social_messages.reply_to_id and parent.conversation_id=social_messages.conversation_id));
drop policy if exists "Group replies stay in room" on public.social_room_messages;
create policy "Group replies stay in room" on public.social_room_messages as restrictive for insert to authenticated
with check(reply_to_id is null or exists(select 1 from public.social_room_messages parent where parent.id=social_room_messages.reply_to_id and parent.room_id=social_room_messages.room_id));
drop policy if exists "Clan replies stay in clan" on public.social_clan_messages;
create policy "Clan replies stay in clan" on public.social_clan_messages as restrictive for insert to authenticated
with check(reply_to_id is null or exists(select 1 from public.social_clan_messages parent where parent.id=social_clan_messages.reply_to_id and parent.clan_id=social_clan_messages.clan_id));

create or replace function private.social_notify_private_message()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare sender_name text;
begin
 select coalesce(p.display_name,p.username,'Um jogador') into sender_name from public.social_profiles p where p.user_id=new.sender_id;
 insert into public.notifications(user_id,title,message,category)
 select cm.user_id,'Nova mensagem de '||coalesce(sender_name,'um jogador'),left(coalesce(new.body,'Arquivo enviado'),110),'social'
 from public.social_conversation_members cm
 left join public.social_conversation_preferences pref on pref.conversation_id=cm.conversation_id and pref.user_id=cm.user_id
 where cm.conversation_id=new.conversation_id and cm.user_id<>new.sender_id and not coalesce(pref.is_muted,false);
 return new;
end;$function$;

create or replace function private.social_notify_room_message()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare sender_name text; room_name text;
begin
 select coalesce(p.display_name,p.username,'Um jogador') into sender_name from public.social_profiles p where p.user_id=new.sender_id;
 select r.name into room_name from public.social_rooms r where r.id=new.room_id;
 insert into public.notifications(user_id,title,message,category)
 select rm.user_id,'Nova mensagem em '||coalesce(room_name,'seu grupo'),coalesce(sender_name,'um jogador')||': '||left(coalesce(new.body,'Arquivo enviado'),85),'social'
 from public.social_room_members rm
 left join public.social_room_preferences pref on pref.room_id=rm.room_id and pref.user_id=rm.user_id
 where rm.room_id=new.room_id and rm.user_id<>new.sender_id and not coalesce(pref.is_muted,false);
 return new;
end;$function$;
