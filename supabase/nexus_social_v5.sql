-- NEXUS SOCIAL V5: grupos privados sem código de acesso.
-- Execute no Supabase SQL Editor após V4.
alter table public.social_rooms alter column access_code drop not null;

create or replace function public.social_create_room(
 room_name text,
 room_description text default '',
 private_room boolean default true,
 member_limit integer default 50
) returns uuid
language plpgsql
security definer
set search_path=public
as $nexus$
declare new_room uuid;
begin
 if auth.uid() is null then
  raise exception 'Faça login para criar um grupo.';
 end if;
 if char_length(trim(coalesce(room_name,'')))<3 then
  raise exception 'O nome do grupo precisa ter pelo menos 3 caracteres.';
 end if;
 insert into public.social_rooms(name,description,created_by,is_private,room_type,max_members,access_code)
 values(
  left(trim(room_name),50),
  left(coalesce(room_description,''),240),
  auth.uid(),
  true,
  'private',
  greatest(2,least(coalesce(member_limit,50),100)),
  null
 )
 returning id into new_room;
 insert into public.social_room_members(room_id,user_id)
 values(new_room,auth.uid());
 return new_room;
end;
$nexus$;

revoke all on function public.social_create_room(text,text,boolean,integer) from public;
grant execute on function public.social_create_room(text,text,boolean,integer) to authenticated;
