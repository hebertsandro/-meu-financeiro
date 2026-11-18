alter table public.competition_match_history drop constraint if exists competition_match_history_game_key_check;
alter table public.competition_match_history add constraint competition_match_history_game_key_check check (game_key = any(array['space-nexus','piggy-run','quiz','extra-dungeon','extra-gems','extra-race','extra-defense']::text[]));
alter table public.competition_game_medals drop constraint if exists competition_game_medals_game_key_check;
alter table public.competition_game_medals add constraint competition_game_medals_game_key_check check (game_key = any(array['space-nexus','piggy-run','quiz','extra-dungeon','extra-gems','extra-race','extra-defense']::text[]));
alter table public.competition_challenges drop constraint if exists competition_challenges_game_key_check;
alter table public.competition_challenges add constraint competition_challenges_game_key_check check (game_key = any(array['space-nexus','piggy-run','quiz','extra-dungeon','extra-gems','extra-race','extra-defense']::text[]));
CREATE OR REPLACE FUNCTION public.competition_create_friend_challenge(target_friend uuid, challenge_title text, selected_game text, target_score integer, finish_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare new_id uuid; clean_title text;
begin
 if auth.uid() is null then raise exception 'Faça login para desafiar um amigo.'; end if;
 if target_friend is null or target_friend=auth.uid() then raise exception 'Escolha um amigo válido.'; end if;
 if selected_game not in ('space-nexus','piggy-run','quiz','extra-dungeon','extra-gems','extra-race','extra-defense') then raise exception 'Jogo inválido.'; end if;
 if target_score is null or target_score<1 or target_score>1000000 then raise exception 'Pontuação-alvo inválida.'; end if;
 clean_title:=trim(challenge_title);
 if char_length(clean_title)<3 or char_length(clean_title)>60 then raise exception 'O título deve ter de 3 a 60 caracteres.'; end if;
 if not exists(select 1 from public.social_friendships f where f.user_a=least(auth.uid(),target_friend) and f.user_b=greatest(auth.uid(),target_friend)) then
  raise exception 'Só é possível desafiar alguém que já seja seu amigo.';
 end if;
 if finish_at is null or finish_at<=now() or finish_at>now()+interval '14 days' then raise exception 'O prazo deve estar entre agora e os próximos 14 dias.'; end if;
 insert into public.competition_challenges(creator_id,opponent_id,title,game_key,target_score,ends_at)
 values(auth.uid(),target_friend,clean_title,selected_game,target_score,finish_at) returning id into new_id;
 insert into public.competition_challenge_members(challenge_id,user_id) values(new_id,auth.uid()),(new_id,target_friend);
 return new_id;
end; $function$
;
grant select on public.nexus_player_progress to authenticated;