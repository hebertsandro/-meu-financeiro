alter table public.duel_rooms add column if not exists invited_id uuid references auth.users(id) on delete cascade;
create index if not exists duel_rooms_invited_idx on public.duel_rooms(invited_id);
drop policy if exists "duel rooms members read" on public.duel_rooms;
create policy "duel rooms members read" on public.duel_rooms for select to authenticated using (host_id=(select auth.uid()) or guest_id=(select auth.uid()) or invited_id=(select auth.uid()));

create or replace function public.duel_invite(game_key_input text, friend_input uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_code text; v_id uuid; v_name text; v_game text;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 if game_key_input not in ('space-nexus','piggy-run','extra-gems','extra-defense') then raise exception 'Jogo indisponível para duelo.'; end if;
 if friend_input is null or friend_input=v_uid then raise exception 'Escolha um amigo válido.'; end if;
 if not exists(select 1 from public.social_friendships f where f.user_a=least(v_uid,friend_input) and f.user_b=greatest(v_uid,friend_input)) then raise exception 'Só dá para convidar amigos.'; end if;
 if (select count(*) from public.duel_rooms r where r.host_id=v_uid and r.guest_id is null and r.created_at>now()-interval '1 day')>=8 then raise exception 'Você já tem convites abertos demais.'; end if;
 loop
  v_code:=upper(substr(md5(random()::text||clock_timestamp()::text),1,6));
  exit when not exists(select 1 from public.duel_rooms where code=v_code);
 end loop;
 insert into public.duel_rooms(code,game_key,host_id,invited_id) values(v_code,game_key_input,v_uid,friend_input) returning id into v_id;
 select coalesce(display_name,username) into v_name from public.social_profiles where user_id=v_uid;
 v_game:=case game_key_input when 'space-nexus' then 'Space Nexus' when 'piggy-run' then 'Asas da Fortuna' when 'extra-gems' then 'Gem Match' else 'Defesa do Cofrinho' end;
 insert into public.notifications(user_id,title,message,category) values(friend_input,'⚔️ Convite de duelo',coalesce(v_name,'Um amigo')||' te desafiou para um duelo de '||v_game||'. Abra Jogos > Duelos para aceitar.','jogos');
 return jsonb_build_object('id',v_id,'code',v_code);
end; $$;

create or replace function public.duel_accept(room_input uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); r public.duel_rooms;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select * into r from public.duel_rooms where id=room_input for update;
 if not found or r.invited_id is distinct from v_uid then raise exception 'Convite não encontrado.'; end if;
 if r.guest_id is null then update public.duel_rooms set guest_id=v_uid,round_started_at=now() where id=r.id; end if;
 return jsonb_build_object('id',r.id);
end; $$;

create or replace function public.duel_decline(room_input uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 delete from public.duel_rooms where id=room_input and invited_id=auth.uid() and guest_id is null;
 return jsonb_build_object('ok',true);
end; $$;

create or replace function public.duel_list()
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 return coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
  select jsonb_build_object('id',r.id,'code',r.code,'game_key',r.game_key,'round',r.round,'created_at',r.created_at,'waiting',r.guest_id is null and r.invited_id is distinct from v_uid,
   'invite_to_me',r.guest_id is null and r.invited_id=v_uid,
   'opponent',(select coalesce(p.display_name,p.username) from public.social_profiles p where p.user_id=case when r.host_id=v_uid then coalesce(r.guest_id,r.invited_id) else r.host_id end),
   'my_done',exists(select 1 from public.duel_scores s where s.room_id=r.id and s.round=r.round and s.user_id=v_uid),
   'their_done',exists(select 1 from public.duel_scores s where s.room_id=r.id and s.round=r.round and s.user_id<>v_uid)) x
  from public.duel_rooms r where (r.host_id=v_uid or r.guest_id=v_uid or (r.invited_id=v_uid and r.guest_id is null)) and r.created_at>now()-interval '30 days' order by r.created_at desc limit 30) t),'[]'::jsonb);
end; $$;

revoke all on function public.duel_invite(text,uuid),public.duel_accept(uuid),public.duel_decline(uuid) from public,anon;
grant execute on function public.duel_invite(text,uuid),public.duel_accept(uuid),public.duel_decline(uuid) to authenticated;
