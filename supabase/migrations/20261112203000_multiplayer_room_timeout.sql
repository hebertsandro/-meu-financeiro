create or replace function public.competition_mp_sync_room(room_id_input uuid) returns void
language plpgsql security definer set search_path=public,auth as $$
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 if not exists(select 1 from public.competition_mp_members where room_id=room_id_input and user_id=auth.uid()) then raise exception 'Você não participa desta sala.'; end if;
 update public.competition_mp_rooms set status='completed',ends_at=now()
 where id=room_id_input and status='playing' and ends_at<=now();
end $$;
grant execute on function public.competition_mp_sync_room(uuid) to authenticated;
