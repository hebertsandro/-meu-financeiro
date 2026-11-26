-- Duelos: salas de 2 jogadores por jogo de pontuação, placar validado contra o histórico, revanche e vitórias acumuladas.
create table if not exists public.duel_rooms(
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 game_key text not null check (game_key in ('space-nexus','piggy-run','extra-gems','extra-defense')),
 host_id uuid not null references auth.users(id) on delete cascade,
 guest_id uuid references auth.users(id) on delete cascade,
 round int not null default 1,
 round_started_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create table if not exists public.duel_scores(
 room_id uuid not null references public.duel_rooms(id) on delete cascade,
 round int not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 score int not null check (score>=0),
 submitted_at timestamptz not null default now(),
 primary key(room_id,round,user_id)
);
create index if not exists duel_rooms_host_idx on public.duel_rooms(host_id);
create index if not exists duel_rooms_guest_idx on public.duel_rooms(guest_id);
alter table public.duel_rooms enable row level security;
alter table public.duel_scores enable row level security;
drop policy if exists "duel rooms members read" on public.duel_rooms;
create policy "duel rooms members read" on public.duel_rooms for select to authenticated using (host_id=(select auth.uid()) or guest_id=(select auth.uid()));
drop policy if exists "duel scores members read" on public.duel_scores;
create policy "duel scores members read" on public.duel_scores for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.duel_create(game_key_input text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_code text; v_id uuid;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 if game_key_input not in ('space-nexus','piggy-run','extra-gems','extra-defense') then raise exception 'Jogo indisponível para duelo.'; end if;
 if (select count(*) from public.duel_rooms r where r.host_id=v_uid and r.guest_id is null and r.created_at>now()-interval '1 day')>=5 then raise exception 'Você já tem salas abertas demais. Use ou espere uma delas.'; end if;
 loop
  v_code:=upper(substr(md5(random()::text||clock_timestamp()::text),1,6));
  exit when not exists(select 1 from public.duel_rooms where code=v_code);
 end loop;
 insert into public.duel_rooms(code,game_key,host_id) values(v_code,game_key_input,v_uid) returning id into v_id;
 return jsonb_build_object('id',v_id,'code',v_code);
end; $$;

create or replace function public.duel_join(code_input text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); r public.duel_rooms;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select * into r from public.duel_rooms where code=upper(trim(code_input));
 if not found then raise exception 'Sala não encontrada. Confira o código.'; end if;
 if r.host_id=v_uid or r.guest_id=v_uid then return jsonb_build_object('id',r.id,'code',r.code); end if;
 if r.guest_id is not null then raise exception 'Essa sala já está completa.'; end if;
 update public.duel_rooms set guest_id=v_uid,round_started_at=now() where id=r.id;
 return jsonb_build_object('id',r.id,'code',r.code);
end; $$;

create or replace function public.duel_submit(room_input uuid, score_input int)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); r public.duel_rooms;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select * into r from public.duel_rooms where id=room_input;
 if not found or (r.host_id<>v_uid and r.guest_id is distinct from v_uid) then raise exception 'Você não faz parte dessa sala.'; end if;
 if r.guest_id is null then raise exception 'Espere o adversário entrar na sala.'; end if;
 if exists(select 1 from public.duel_scores s where s.room_id=r.id and s.round=r.round and s.user_id=v_uid) then raise exception 'Você já jogou esta rodada.'; end if;
 if not exists(select 1 from public.competition_match_history h where h.user_id=v_uid and h.game_key=r.game_key and h.score=score_input and h.played_at>=r.round_started_at and h.played_at>now()-interval '30 minutes') then
  raise exception 'Partida não encontrada no histórico. Jogue a rodada depois de entrar na sala.';
 end if;
 insert into public.duel_scores(room_id,round,user_id,score) values(r.id,r.round,v_uid,score_input);
 return jsonb_build_object('ok',true);
end; $$;

create or replace function public.duel_rematch(room_input uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); r public.duel_rooms;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select * into r from public.duel_rooms where id=room_input for update;
 if not found or (r.host_id<>v_uid and r.guest_id is distinct from v_uid) then raise exception 'Você não faz parte dessa sala.'; end if;
 if (select count(*) from public.duel_scores s where s.room_id=r.id and s.round=r.round)<2 then raise exception 'A rodada ainda não terminou.'; end if;
 update public.duel_rooms set round=round+1,round_started_at=now() where id=r.id;
 return jsonb_build_object('ok',true,'round',r.round+1);
end; $$;

create or replace function public.duel_status(room_input uuid)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare v_uid uuid:=auth.uid(); r public.duel_rooms; v jsonb;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select * into r from public.duel_rooms where id=room_input;
 if not found or (r.host_id<>v_uid and r.guest_id is distinct from v_uid) then raise exception 'Você não faz parte dessa sala.'; end if;
 select jsonb_build_object(
  'room',jsonb_build_object('id',r.id,'code',r.code,'game_key',r.game_key,'round',r.round,'host_id',r.host_id,'guest_id',r.guest_id,'round_started_at',r.round_started_at),
  'players',(select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',coalesce(p.display_name,p.username),'username',p.username,'avatar',p.avatar,'frame',p.avatar_frame)),'[]'::jsonb) from public.social_profiles p where p.user_id in (r.host_id,r.guest_id)),
  'scores',(select coalesce(jsonb_agg(jsonb_build_object('round',s.round,'user_id',s.user_id,'score',s.score) order by s.round),'[]'::jsonb) from public.duel_scores s where s.room_id=r.id),
  'wins',(select coalesce(jsonb_object_agg(w.uid,w.n),'{}'::jsonb) from (
    select w1.user_id uid,count(*) n from (
      select s.round,s.user_id,s.score,max(s.score) over (partition by s.round) mx,count(*) over (partition by s.round) cnt,count(*) filter (where true) over (partition by s.round,s.score) same
      from public.duel_scores s where s.room_id=r.id) w1
    where w1.cnt=2 and w1.score=w1.mx and w1.same=1 group by w1.user_id) w)
 ) into v;
 return v;
end; $$;

create or replace function public.duel_list()
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 return coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
  select jsonb_build_object('id',r.id,'code',r.code,'game_key',r.game_key,'round',r.round,'created_at',r.created_at,'waiting',r.guest_id is null,
   'opponent',(select coalesce(p.display_name,p.username) from public.social_profiles p where p.user_id=case when r.host_id=v_uid then r.guest_id else r.host_id end),
   'my_done',exists(select 1 from public.duel_scores s where s.room_id=r.id and s.round=r.round and s.user_id=v_uid),
   'their_done',exists(select 1 from public.duel_scores s where s.room_id=r.id and s.round=r.round and s.user_id<>v_uid)) x
  from public.duel_rooms r where (r.host_id=v_uid or r.guest_id=v_uid) and r.created_at>now()-interval '30 days' order by r.created_at desc limit 30) t),'[]'::jsonb);
end; $$;

revoke all on function public.duel_create(text),public.duel_join(text),public.duel_submit(uuid,int),public.duel_rematch(uuid),public.duel_status(uuid),public.duel_list() from public,anon;
grant execute on function public.duel_create(text),public.duel_join(text),public.duel_submit(uuid,int),public.duel_rematch(uuid),public.duel_status(uuid),public.duel_list() to authenticated;
create index if not exists duel_scores_user_idx on public.duel_scores(user_id);
