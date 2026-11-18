-- Seasonal free pass: claim milestones against the active 30-day season, not lifetime XP.
create table if not exists public.nexus_player_pass_claims (
 user_id uuid not null references auth.users(id) on delete cascade,
 season_id uuid not null references public.competition_seasons(id) on delete cascade,
 reward_key text not null,
 claimed_at timestamptz not null default now(),
 primary key(user_id,season_id,reward_key)
);
alter table public.nexus_player_pass_claims enable row level security;
drop policy if exists "Players can read own NEXUS pass claims" on public.nexus_player_pass_claims;
create policy "Players can read own NEXUS pass claims" on public.nexus_player_pass_claims for select to authenticated using(auth.uid()=user_id);
grant select on public.nexus_player_pass_claims to authenticated;
revoke insert,update,delete on public.nexus_player_pass_claims from anon,authenticated;

drop function if exists public.nexus_progression_claim_pass_reward(text);
create or replace function public.nexus_progression_claim_pass_reward(reward_key_input text, season_id_input uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_threshold integer; v_xp integer; v_owned text[]; v_season uuid;
begin
 if v_uid is null then raise exception 'Faça login para resgatar.'; end if;
 v_threshold:=case reward_key_input when 'pass-title-recruit' then 250 when 'pass-trail-blue' then 500 when 'pass-title-explorer' then 1000 when 'pass-frame-prism' then 1500 when 'pass-title-veteran' then 2000 else null end;
 if v_threshold is null then raise exception 'Recompensa inválida.'; end if;
 select id into v_season from public.competition_seasons where id=season_id_input and status='active' and starts_at<=now() and ends_at>now() for update;
 if v_season is null then raise exception 'Esta temporada já terminou. Aguarde a próxima.'; end if;
 select coalesce(xp_points,0) into v_xp from public.competition_season_scores where season_id=v_season and user_id=v_uid;
 if coalesce(v_xp,0)<v_threshold then raise exception 'Continue jogando nesta temporada para liberar a recompensa.'; end if;
 insert into public.nexus_player_progress(user_id) values(v_uid) on conflict(user_id) do nothing;
 insert into public.nexus_player_pass_claims(user_id,season_id,reward_key) values(v_uid,v_season,reward_key_input) on conflict do nothing;
 if not found then return jsonb_build_object('ok',true,'already_claimed',true); end if;
 select owned_cosmetics into v_owned from public.nexus_player_progress where user_id=v_uid for update;
 if not (reward_key_input=any(coalesce(v_owned,'{}'::text[]))) then
  update public.nexus_player_progress set owned_cosmetics=array_append(owned_cosmetics,reward_key_input),updated_at=now() where user_id=v_uid;
 end if;
 return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.nexus_progression_claim_pass_reward(text,uuid) from public,anon;
grant execute on function public.nexus_progression_claim_pass_reward(text,uuid) to authenticated;
