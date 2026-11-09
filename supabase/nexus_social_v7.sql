-- NEXUS SOCIAL V7: saída com escolha do ADM e exclusão automática quando não restarem membros.
-- Execute no Supabase SQL Editor após nexus_social_v6.sql.

create or replace function public.social_leave_room(
  target_room uuid,
  admin_action text default 'transfer'
)
returns void
language plpgsql
security definer
set search_path=public
as $nexus$
declare
  room_owner uuid;
  next_owner uuid;
  removed integer;
begin
  if auth.uid() is null then raise exception 'Faça login para sair do grupo.'; end if;
  if coalesce(admin_action,'transfer') not in ('transfer','delete') then
    raise exception 'Ação de administração inválida.';
  end if;

  select created_by into room_owner
  from public.social_rooms where id=target_room for update;
  if not found then raise exception 'Grupo não encontrado.'; end if;

  if room_owner=auth.uid() and admin_action='delete' then
    delete from public.social_rooms where id=target_room;
    return;
  end if;

  delete from public.social_room_members
  where room_id=target_room and user_id=auth.uid();
  get diagnostics removed = row_count;
  if removed=0 then raise exception 'Você não participa mais deste grupo.'; end if;

  select user_id into next_owner
  from public.social_room_members
  where room_id=target_room
  order by joined_at nulls last,user_id
  limit 1;

  if next_owner is null then
    -- O grupo é removido para todos quando o último participante sai.
    delete from public.social_rooms where id=target_room;
  elsif room_owner=auth.uid() then
    -- Se o ADM escolheu transferir, o membro mais antigo assume.
    update public.social_rooms set created_by=next_owner where id=target_room;
  end if;
end;
$nexus$;

create or replace function public.social_leave_clan(
  target_clan uuid,
  admin_action text default 'transfer'
)
returns void
language plpgsql
security definer
set search_path=public
as $nexus$
declare
  my_role text;
  next_leader uuid;
  removed integer;
begin
  if auth.uid() is null then raise exception 'Faça login para sair do clã.'; end if;
  if coalesce(admin_action,'transfer') not in ('transfer','delete') then
    raise exception 'Ação de administração inválida.';
  end if;

  select role into my_role
  from public.social_clan_members
  where clan_id=target_clan and user_id=auth.uid()
  for update;
  if not found then raise exception 'Você não participa deste clã.'; end if;

  if my_role='leader' and admin_action='delete' then
    delete from public.social_clans where id=target_clan;
    return;
  end if;

  delete from public.social_clan_members
  where clan_id=target_clan and user_id=auth.uid();
  get diagnostics removed = row_count;
  if removed=0 then raise exception 'Não foi possível sair do clã.'; end if;

  select user_id into next_leader
  from public.social_clan_members
  where clan_id=target_clan
  order by joined_at nulls last,user_id
  limit 1;

  if next_leader is null then
    -- O clã é removido para todos quando o último integrante sai.
    delete from public.social_clans where id=target_clan;
  elsif my_role='leader' then
    -- Se o ADM escolheu transferir, o membro mais antigo assume.
    update public.social_clan_members set role='leader'
    where clan_id=target_clan and user_id=next_leader;
  end if;
end;
$nexus$;

revoke all on function public.social_leave_room(uuid,text) from public;
revoke all on function public.social_leave_clan(uuid,text) from public;
grant execute on function public.social_leave_room(uuid,text) to authenticated;
grant execute on function public.social_leave_clan(uuid,text) to authenticated;
