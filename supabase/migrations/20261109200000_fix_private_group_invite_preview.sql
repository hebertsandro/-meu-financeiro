create or replace function public.social_get_my_pending_room_invites()
returns table(id uuid, name text, description text)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Faça login para consultar seus convites.';
  end if;

  return query
  select r.id, r.name, r.description
  from public.social_room_invites i
  join public.social_rooms r on r.id = i.room_id
  where i.invited_user_id = auth.uid()
    and i.status = 'pending'
  order by i.created_at desc;
end;
$function$;

revoke all on function public.social_get_my_pending_room_invites() from public;
grant execute on function public.social_get_my_pending_room_invites() to authenticated;
