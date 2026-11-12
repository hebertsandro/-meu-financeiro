drop policy if exists "mp members read roster" on public.competition_mp_members;
create policy "mp members read roster" on public.competition_mp_members for select to authenticated
using (exists(select 1 from public.competition_mp_members m where m.room_id=competition_mp_members.room_id and m.user_id=auth.uid()));
drop policy if exists "mp members read answers" on public.competition_mp_answers;
create policy "mp members read answers" on public.competition_mp_answers for select to authenticated
using (exists(select 1 from public.competition_mp_members m where m.room_id=competition_mp_answers.room_id and m.user_id=auth.uid()));
create table if not exists public.competition_mp_answer_keys (
 room_id uuid not null references public.competition_mp_rooms(id) on delete cascade,
 question_index integer not null,
 correct_index integer not null,
 primary key(room_id,question_index)
);
revoke all on public.competition_mp_answer_keys from anon,authenticated;
create or replace function public.competition_mp_start_room(room_id_input uuid) returns void
language plpgsql security definer set search_path=public,auth as $$
declare r public.competition_mp_rooms%rowtype; n integer; q jsonb; keys jsonb;
begin
 select * into r from public.competition_mp_rooms where id=room_id_input for update;
 if not found or r.host_id<>auth.uid() then raise exception 'Somente o criador pode iniciar.'; end if;
 if r.status<>'waiting' then raise exception 'A sala não está aguardando jogadores.'; end if;
 select count(*) into n from public.competition_mp_members where room_id=r.id;
 if n<2 then raise exception 'A partida precisa de pelo menos 2 jogadores.'; end if;
 q:='[
 {"question":"Qual atitude ajuda a manter a saúde financeira?","options":["Gastar todo o salário","Planejar os gastos","Ignorar as contas","Pegar crédito sem comparar"]},
 {"question":"O que é uma reserva de emergência?","options":["Dinheiro para imprevistos","Limite do cartão","Uma compra parcelada","Um investimento de alto risco"]},
 {"question":"Ao usar cartão de crédito, o ideal é…","options":["Pagar só o mínimo","Ignorar a fatura","Acompanhar gastos e pagar a fatura integral","Usar todo o limite"]},
 {"question":"Juros compostos são…","options":["Juros calculados só uma vez","Juros sobre o valor e juros acumulados","Desconto fixo","Taxa sem efeito no tempo"]},
 {"question":"Antes de comprar algo, é melhor…","options":["Comprar por impulso","Comparar preço e necessidade","Parcelar sempre","Usar crédito rotativo"]}
 ]'::jsonb;
 keys:='[1,0,2,1,1]'::jsonb;
 delete from public.competition_mp_answer_keys where room_id=r.id;
 insert into public.competition_mp_answer_keys(room_id,question_index,correct_index)
 select r.id,(v.ordinality-1)::integer,(v.value#>>'{}')::integer from jsonb_array_elements(keys) with ordinality v(value,ordinality);
 update public.competition_mp_rooms set status='playing',questions=q,current_question=0,started_at=now(),ends_at=now()+interval '5 minutes' where id=r.id;
end $$;
create or replace function public.competition_mp_answer(room_id_input uuid,selected_index_input integer) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare r public.competition_mp_rooms%rowtype; correct_idx integer; correct boolean; total integer; answered integer;
begin
 select * into r from public.competition_mp_rooms where id=room_id_input for update;
 if not found or r.status<>'playing' then raise exception 'Esta partida não está em andamento.'; end if;
 if not exists(select 1 from public.competition_mp_members where room_id=r.id and user_id=auth.uid()) then raise exception 'Você não participa desta sala.'; end if;
 if selected_index_input<0 or selected_index_input>3 then raise exception 'Resposta inválida.'; end if;
 if exists(select 1 from public.competition_mp_answers where room_id=r.id and user_id=auth.uid() and question_index=r.current_question) then raise exception 'Você já respondeu esta pergunta.'; end if;
 select k.correct_index into correct_idx from public.competition_mp_answer_keys k where k.room_id=r.id and k.question_index=r.current_question;
 if correct_idx is null then raise exception 'Gabarito indisponível.'; end if;
 correct:=(correct_idx=selected_index_input);
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
grant execute on function public.competition_mp_start_room(uuid) to authenticated;
grant execute on function public.competition_mp_answer(uuid,integer) to authenticated;