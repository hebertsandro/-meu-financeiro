-- NEXUS SOCIAL V6: sair de grupos/clãs e remover conversas da própria caixa de entrada.
-- Execute no Supabase SQL Editor após nexus_social_v5.sql.

create or replace function public.social_leave_room(target_room uuid)
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
  select created_by into room_owner
  from public.social_rooms where id=target_room for update;
  if not found then raise exception 'Grupo não encontrado.'; end if;

  delete from public.social_room_members
  where room_id=target_room and user_id=auth.uid();
  get diagnostics removed = row_count;
  if removed=0 then raise exception 'Você não participa mais deste grupo.'; end if;

  if room_owner=auth.uid() then
    select user_id into next_owner
    from public.social_room_members
    where room_id=target_room
    order by user_id
    limit 1;

    if next_owner is null then
      delete from public.social_rooms where id=target_room;
    else
      update public.social_rooms set created_by=next_owner where id=target_room;
    end if;
  end if;
end;
$nexus$;

create or replace function public.social_hide_conversation(target_conversation uuid)
returns void
language plpgsql
security definer
set search_path=public
as $nexus$
declare removed integer;
begin
  if auth.uid() is null then raise exception 'Faça login para excluir a conversa.'; end if;
  delete from public.social_conversation_members
  where conversation_id=target_conversation and user_id=auth.uid();
  get diagnostics removed = row_count;
  if removed=0 then raise exception 'Conversa não encontrada na sua lista.'; end if;
  -- As mensagens e a participação dos demais usuários são preservadas.
end;
$nexus$;

create or replace function public.social_leave_clan(target_clan uuid)
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
  select role into my_role
  from public.social_clan_members
  where clan_id=target_clan and user_id=auth.uid()
  for update;
  if not found then raise exception 'Você não participa deste clã.'; end if;

  if my_role='leader' then
    select user_id into next_leader
    from public.social_clan_members
    where clan_id=target_clan and user_id<>auth.uid()
    order by joined_at nulls last,user_id
    limit 1;
  end if;

  delete from public.social_clan_members
  where clan_id=target_clan and user_id=auth.uid();
  get diagnostics removed = row_count;
  if removed=0 then raise exception 'Não foi possível sair do clã.'; end if;

  if my_role='leader' then
    if next_leader is null then
      delete from public.social_clans where id=target_clan;
    else
      update public.social_clan_members set role='leader'
      where clan_id=target_clan and user_id=next_leader;
    end if;
  end if;
end;
$nexus$;

revoke all on function public.social_leave_room(uuid) from public;
revoke all on function public.social_hide_conversation(uuid) from public;
revoke all on function public.social_leave_clan(uuid) from public;
grant execute on function public.social_leave_room(uuid) to authenticated;
grant execute on function public.social_hide_conversation(uuid) to authenticated;
grant execute on function public.social_leave_clan(uuid) to authenticated;
