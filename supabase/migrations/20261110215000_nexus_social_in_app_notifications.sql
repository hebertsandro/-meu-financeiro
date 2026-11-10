-- Add NEXUS Social events to the existing in-app notification center.
alter table public.notifications drop constraint if exists notifications_category_check;
alter table public.notifications add constraint notifications_category_check
check(category=any(array['cartoes','contas','metas','entradas','gastos','parcelas','geral','social']::text[]));

create or replace function private.social_notify_friend_request()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare sender_name text;
begin
 select coalesce(p.display_name,p.username,'Um jogador') into sender_name from public.social_profiles p where p.user_id=new.sender_id;
 insert into public.notifications(user_id,title,message,category) values(new.receiver_id,'Nova solicitação de amizade',sender_name||' quer adicionar você no NEXUS Social.','social');
 return new;
end;$function$;
drop trigger if exists social_notify_friend_request on public.social_friend_requests;
create trigger social_notify_friend_request after insert on public.social_friend_requests for each row when(new.status='pending') execute function private.social_notify_friend_request();

create or replace function private.social_notify_private_message()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare sender_name text;
begin
 select coalesce(p.display_name,p.username,'Um jogador') into sender_name from public.social_profiles p where p.user_id=new.sender_id;
 insert into public.notifications(user_id,title,message,category)
 select cm.user_id,'Nova mensagem de '||sender_name,left(coalesce(new.body,'Arquivo enviado'),110),'social'
 from public.social_conversation_members cm where cm.conversation_id=new.conversation_id and cm.user_id<>new.sender_id;
 return new;
end;$function$;
drop trigger if exists social_notify_private_message on public.social_messages;
create trigger social_notify_private_message after insert on public.social_messages for each row execute function private.social_notify_private_message();

create or replace function private.social_notify_room_message()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare sender_name text; room_name text;
begin
 select coalesce(p.display_name,p.username,'Um jogador') into sender_name from public.social_profiles p where p.user_id=new.sender_id;
 select r.name into room_name from public.social_rooms r where r.id=new.room_id;
 insert into public.notifications(user_id,title,message,category)
 select rm.user_id,'Nova mensagem em '||coalesce(room_name,'seu grupo'),sender_name||': '||left(coalesce(new.body,'Arquivo enviado'),85),'social'
 from public.social_room_members rm where rm.room_id=new.room_id and rm.user_id<>new.sender_id;
 return new;
end;$function$;
drop trigger if exists social_notify_room_message on public.social_room_messages;
create trigger social_notify_room_message after insert on public.social_room_messages for each row execute function private.social_notify_room_message();

create or replace function private.social_notify_clan_message()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare sender_name text; clan_name text;
begin
 select coalesce(p.display_name,p.username,'Um jogador') into sender_name from public.social_profiles p where p.user_id=new.sender_id;
 select c.name into clan_name from public.social_clans c where c.id=new.clan_id;
 insert into public.notifications(user_id,title,message,category)
 select cm.user_id,'Nova mensagem em '||coalesce(clan_name,'seu clã'),sender_name||': '||left(coalesce(new.body,'Arquivo enviado'),85),'social'
 from public.social_clan_members cm where cm.clan_id=new.clan_id and cm.user_id<>new.sender_id;
 return new;
end;$function$;
drop trigger if exists social_notify_clan_message on public.social_clan_messages;
create trigger social_notify_clan_message after insert on public.social_clan_messages for each row execute function private.social_notify_clan_message();

create or replace function private.social_notify_room_invite()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare room_name text; inviter_name text;
begin
 select r.name into room_name from public.social_rooms r where r.id=new.room_id;
 select coalesce(p.display_name,p.username,'Um jogador') into inviter_name from public.social_profiles p where p.user_id=new.invited_by;
 insert into public.notifications(user_id,title,message,category) values(new.invited_user_id,'Convite para grupo',inviter_name||' convidou você para '||coalesce(room_name,'um grupo privado')||'.','social');
 return new;
end;$function$;
drop trigger if exists social_notify_room_invite on public.social_room_invites;
create trigger social_notify_room_invite after insert on public.social_room_invites for each row execute function private.social_notify_room_invite();

create or replace function private.social_notify_post_activity()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare post_author uuid; actor_id uuid; actor_name text; title_text text; message_text text;
begin
 if tg_table_name='social_post_likes' then actor_id:=new.user_id; else actor_id:=new.author_id; end if;
 select p.author_id into post_author from public.social_posts p where p.id=new.post_id;
 if post_author is null or post_author=actor_id then return new; end if;
 select coalesce(p.display_name,p.username,'Um jogador') into actor_name from public.social_profiles p where p.user_id=actor_id;
 if tg_table_name='social_post_likes' then title_text:='Curtiram sua publicação';message_text:=actor_name||' curtiu sua publicação.';
 else title_text:='Novo comentário';message_text:=actor_name||' comentou: '||left(coalesce(new.body,''),90); end if;
 insert into public.notifications(user_id,title,message,category) values(post_author,title_text,message_text,'social');
 return new;
end;$function$;
drop trigger if exists social_notify_post_like on public.social_post_likes;
create trigger social_notify_post_like after insert on public.social_post_likes for each row execute function private.social_notify_post_activity();
drop trigger if exists social_notify_post_comment on public.social_post_comments;
create trigger social_notify_post_comment after insert on public.social_post_comments for each row execute function private.social_notify_post_activity();

revoke all on function private.social_notify_friend_request() from public,anon,authenticated;
revoke all on function private.social_notify_private_message() from public,anon,authenticated;
revoke all on function private.social_notify_room_message() from public,anon,authenticated;
revoke all on function private.social_notify_clan_message() from public,anon,authenticated;
revoke all on function private.social_notify_room_invite() from public,anon,authenticated;
revoke all on function private.social_notify_post_activity() from public,anon,authenticated;
