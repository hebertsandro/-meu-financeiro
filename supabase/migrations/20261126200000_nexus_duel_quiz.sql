-- Quiz entra nos duelos: mesmas 5 perguntas para os dois (sorteadas pelo id da sala), pontuação até 750.
do $$ declare c text; begin
 select conname into c from pg_constraint where conrelid='public.duel_rooms'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%game_key%';
 if c is not null then execute 'alter table public.duel_rooms drop constraint '||quote_ident(c); end if;
 alter table public.duel_rooms add constraint duel_rooms_game_key_check check (game_key in ('space-nexus','piggy-run','extra-gems','extra-defense','quiz'));
end $$;

create or replace function public.duel_create(game_key_input text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_code text; v_id uuid;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 if game_key_input not in ('space-nexus','piggy-run','extra-gems','extra-defense','quiz') then raise exception 'Jogo indisponível para duelo.'; end if;
 if (select count(*) from public.duel_rooms r where r.host_id=v_uid and r.guest_id is null and r.created_at>now()-interval '1 day')>=5 then raise exception 'Você já tem salas abertas demais. Use ou espere uma delas.'; end if;
 loop
  v_code:=upper(substr(md5(random()::text||clock_timestamp()::text),1,6));
  exit when not exists(select 1 from public.duel_rooms where code=v_code);
 end loop;
 insert into public.duel_rooms(code,game_key,host_id) values(v_code,game_key_input,v_uid) returning id into v_id;
 return jsonb_build_object('id',v_id,'code',v_code);
end; $$;

create or replace function public.duel_invite(game_key_input text, friend_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_code text; v_id uuid; v_name text; v_game text;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 if game_key_input not in ('space-nexus','piggy-run','extra-gems','extra-defense','quiz') then raise exception 'Jogo indisponível para duelo.'; end if;
 if friend_input is null or friend_input=v_uid then raise exception 'Escolha um amigo válido.'; end if;
 if not exists(select 1 from public.social_friendships f where f.user_a=least(v_uid,friend_input) and f.user_b=greatest(v_uid,friend_input)) then raise exception 'Só dá para convidar amigos.'; end if;
 if (select count(*) from public.duel_rooms r where r.host_id=v_uid and r.guest_id is null and r.created_at>now()-interval '1 day')>=8 then raise exception 'Você já tem convites abertos demais.'; end if;
 loop
  v_code:=upper(substr(md5(random()::text||clock_timestamp()::text),1,6));
  exit when not exists(select 1 from public.duel_rooms where code=v_code);
 end loop;
 insert into public.duel_rooms(code,game_key,host_id,invited_id) values(v_code,game_key_input,v_uid,friend_input) returning id into v_id;
 select coalesce(display_name,username) into v_name from public.social_profiles where user_id=v_uid;
 v_game:=case game_key_input when 'space-nexus' then 'Space Nexus' when 'piggy-run' then 'Asas da Fortuna' when 'extra-gems' then 'Gem Match' when 'quiz' then 'Quiz Financeiro' else 'Defesa do Cofrinho' end;
 insert into public.notifications(user_id,title,message,category) values(friend_input,'⚔️ Convite de duelo',coalesce(v_name,'Um amigo')||' te desafiou para um duelo de '||v_game||'. Abra Jogos > Duelos para aceitar.','jogos');
 return jsonb_build_object('id',v_id,'code',v_code);
end; $$;

create or replace function public.duel_submit(room_input uuid, score_input integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); r public.duel_rooms;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select * into r from public.duel_rooms where id=room_input;
 if not found or (r.host_id<>v_uid and r.guest_id is distinct from v_uid) then raise exception 'Você não faz parte dessa sala.'; end if;
 if r.guest_id is null then raise exception 'Espere o adversário entrar na sala.'; end if;
 if exists(select 1 from public.duel_scores s where s.room_id=r.id and s.round=r.round and s.user_id=v_uid) then raise exception 'Você já jogou esta rodada.'; end if;
 if r.game_key='quiz' then
  if score_input<0 or score_input>750 or r.round_started_at is null or r.round_started_at>now() then raise exception 'Pontuação do quiz inválida.'; end if;
 elsif not exists(select 1 from public.competition_match_history h where h.user_id=v_uid and h.game_key=r.game_key and h.score=score_input and h.played_at>=r.round_started_at and h.played_at>now()-interval '30 minutes') then
  raise exception 'Partida não encontrada no histórico. Jogue a rodada depois de entrar na sala.';
 end if;
 insert into public.duel_scores(room_id,round,user_id,score) values(r.id,r.round,v_uid,score_input);
 return jsonb_build_object('ok',true);
end; $$;
