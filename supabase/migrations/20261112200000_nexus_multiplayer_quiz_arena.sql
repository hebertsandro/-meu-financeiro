create table if not exists public.competition_mp_rooms (
 id uuid primary key default gen_random_uuid(),
 room_code text not null unique,
 host_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'waiting' check (status in ('waiting','playing','completed','cancelled')),
 current_question integer not null default 0,
 questions jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 started_at timestamptz,
 ends_at timestamptz
);
create table if not exists public.competition_mp_members (
 room_id uuid not null references public.competition_mp_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 score integer not null default 0,
 joined_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
create table if not exists public.competition_mp_answers (
 room_id uuid not null,
 user_id uuid not null,
 question_index integer not null,
 selected_index integer not null,
 is_correct boolean not null,
 answered_at timestamptz not null default now(),
 primary key(room_id,user_id,question_index),
 foreign key(room_id,user_id) references public.competition_mp_members(room_id,user_id) on delete cascade
);
alter table public.competition_mp_rooms enable row level security;
alter table public.competition_mp_members enable row level security;
alter table public.competition_mp_answers enable row level security;
drop policy if exists "mp members read rooms" on public.competition_mp_rooms;
create policy "mp members read rooms" on public.competition_mp_rooms for select to authenticated using (exists(select 1 from public.competition_mp_members m where m.room_id=id and m.user_id=auth.uid()));
drop policy if exists "mp members read roster" on public.competition_mp_members;
create policy "mp members read roster" on public.competition_mp_members for select to authenticated using (exists(select 1 from public.competition_mp_members m where m.room_id=room_id and m.user_id=auth.uid()));
drop policy if exists "mp members read answers" on public.competition_mp_answers;
create policy "mp members read answers" on public.competition_mp_answers for select to authenticated using (exists(select 1 from public.competition_mp_members m where m.room_id=room_id and m.user_id=auth.uid()));
create or replace function public.competition_mp_create_room() returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare rid uuid; code text;
begin
 if auth.uid() is null then raise exception 'Faça login para criar uma sala.'; end if;
 code:=upper(substr(encode(gen_random_bytes(6),'hex'),1,6));
 insert into public.competition_mp_rooms(room_code,host_id) values(code,auth.uid()) returning id into rid;
 insert into public.competition_mp_members(room_id,user_id) values(rid,auth.uid());
 return jsonb_build_object('id',rid,'code',code);
end $$;
create or replace function public.competition_mp_join_room(room_code_input text) returns uuid
language plpgsql security definer set search_path=public,auth as $$
declare r public.competition_mp_rooms%rowtype; n integer;
begin
 if auth.uid() is null then raise exception 'Faça login para entrar na sala.'; end if;
 select * into r from public.competition_mp_rooms where room_code=upper(trim(room_code_input)) for update;
 if not found then raise exception 'Código de sala não encontrado.'; end if;
 if r.status<>'waiting' then raise exception 'Esta partida já começou ou terminou.'; end if;
 select count(*) into n from public.competition_mp_members where room_id=r.id;
 if n>=4 then raise exception 'A sala já está cheia (máximo 4 jogadores).'; end if;
 insert into public.competition_mp_members(room_id,user_id) values(r.id,auth.uid()) on conflict do nothing;
 return r.id;
end $$;
create or replace function public.competition_mp_start_room(room_id_input uuid) returns void
language plpgsql security definer set search_path=public,auth as $$
declare r public.competition_mp_rooms%rowtype; n integer; q jsonb;
begin
 select * into r from public.competition_mp_rooms where id=room_id_input for update;
 if not found or r.host_id<>auth.uid() then raise exception 'Somente o criador pode iniciar.'; end if;
 if r.status<>'waiting' then raise exception 'A sala não está aguardando jogadores.'; end if;
 select count(*) into n from public.competition_mp_members where room_id=r.id;
 if n<2 then raise exception 'A partida precisa de pelo menos 2 jogadores.'; end if;
 q:='[
 {"question":"Qual atitude ajuda a manter a saúde financeira?","options":["Gastar todo o salário","Planejar os gastos","Ignorar as contas","Pegar crédito sem comparar"],"correct":1},
 {"question":"O que é uma reserva de emergência?","options":["Dinheiro para imprevistos","Limite do cartão","Uma compra parcelada","Um investimento de alto risco"],"correct":0},
 {"question":"Ao usar cartão de crédito, o ideal é…","options":["Pagar só o mínimo","Ignorar a fatura","Acompanhar gastos e pagar a fatura integral","Usar todo o limite"],"correct":2},
 {"question":"Juros compostos são…","options":["Juros calculados só uma vez","Juros sobre o valor e juros acumulados","Desconto fixo","Taxa sem efeito no tempo"],"correct":1},
 {"question":"Antes de comprar algo, é melhor…","options":["Comprar por impulso","Comparar preço e necessidade","Parcelar sempre","Usar crédito rotativo"],"correct":1}
 ]'::jsonb;
 update public.competition_mp_rooms set status='playing',questions=q,current_question=0,started_at=now(),ends_at=now()+interval '5 minutes' where id=r.id;
end $$;
create or replace function public.competition_mp_answer(room_id_input uuid,selected_index_input integer) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare r public.competition_mp_rooms%rowtype; q jsonb; correct boolean; total integer; answered integer;
begin
 select * into r from public.competition_mp_rooms where id=room_id_input for update;
 if not found or r.status<>'playing' then raise exception 'Esta partida não está em andamento.'; end if;
 if not exists(select 1 from public.competition_mp_members where room_id=r.id and user_id=auth.uid()) then raise exception 'Você não participa desta sala.'; end if;
 if selected_index_input<0 or selected_index_input>3 then raise exception 'Resposta inválida.'; end if;
 if exists(select 1 from public.competition_mp_answers where room_id=r.id and user_id=auth.uid() and question_index=r.current_question) then raise exception 'Você já respondeu esta pergunta.'; end if;
 q:=r.questions->r.current_question;
 correct:=((q->>'correct')::integer=selected_index_input);
 insert into public.competition_mp_answers(room_id,user_id,question_index,selected_index,is_correct) values(r.id,auth.uid(),r.current_question,selected_index_input,correct);
 if correct then update public.competition_mp_members set score=score+100 where room_id=r.id and user_id=auth.uid(); end if;
 select count(*) into total from public.competition_mp_members where room_id=r.id;
 select count(*) into answered from public.competition_mp_answers where room_id=r.id and question_index=r.current_question;
 if answered>=total then
  if r.current_question>=jsonb_array_length(r.questions)-1 then
   update public.competition_mp_rooms set status='completed',ends_at=now() where id=r.id;
  else
   update public.competition_mp_rooms set current_question=current_question+1 where id=r.id;
  end if;
 end if;
 return jsonb_build_object('correct',correct,'advanced',answered>=total);
end $$;
grant execute on function public.competition_mp_create_room() to authenticated;
grant execute on function public.competition_mp_join_room(text) to authenticated;
grant execute on function public.competition_mp_start_room(uuid) to authenticated;
grant execute on function public.competition_mp_answer(uuid,integer) to authenticated;
do $$ begin
 alter publication supabase_realtime add table public.competition_mp_rooms;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
 alter publication supabase_realtime add table public.competition_mp_members;
exception when duplicate_object then null; when undefined_object then null; end $$;
