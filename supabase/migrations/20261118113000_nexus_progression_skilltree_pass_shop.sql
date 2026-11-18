-- NEXUS progression: skill tree, free season pass and cosmetic shop.
create table if not exists public.nexus_player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unlocked_skills text[] not null default '{}',
  owned_cosmetics text[] not null default '{}',
  equipped_title text,
  equipped_cosmetic text,
  updated_at timestamptz not null default now()
);
alter table public.nexus_player_progress enable row level security;
drop policy if exists "Players can read own NEXUS progression" on public.nexus_player_progress;
create policy "Players can read own NEXUS progression"
  on public.nexus_player_progress for select to authenticated
  using (auth.uid() = user_id);
revoke insert, update, delete on public.nexus_player_progress from anon, authenticated;

create or replace function public.nexus_progression_unlock_skill(skill_key_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_cost integer; v_skills text[]; v_wallet bigint;
begin
 if v_uid is null then raise exception 'Faça login para evoluir.'; end if;
 v_cost:=case skill_key_input when 'extra-heart' then 100 when 'coin-boost' then 140 else null end;
 if v_cost is null then raise exception 'Habilidade inválida.'; end if;
 insert into public.nexus_player_progress(user_id) values(v_uid) on conflict(user_id) do nothing;
 select unlocked_skills into v_skills from public.nexus_player_progress where user_id=v_uid for update;
 if skill_key_input=any(v_skills) then return jsonb_build_object('ok',true,'already_unlocked',true); end if;
 select coins into v_wallet from public.nexus_loot_wallets where user_id=v_uid for update;
 if coalesce(v_wallet,0)<v_cost then raise exception 'Moedas insuficientes. Jogue para ganhar mais.'; end if;
 update public.nexus_loot_wallets set coins=coins-v_cost,updated_at=now() where user_id=v_uid;
 update public.nexus_player_progress set unlocked_skills=array_append(unlocked_skills,skill_key_input),updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'cost',v_cost);
end; $$;

create or replace function public.nexus_progression_purchase_cosmetic(cosmetic_key_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_cost integer; v_owned text[]; v_wallet bigint;
begin
 if v_uid is null then raise exception 'Faça login para comprar.'; end if;
 v_cost:=case cosmetic_key_input when 'cosmetic-neon-trail' then 90 when 'cosmetic-prism-frame' then 160 when 'title-star-pilot' then 120 when 'title-guardian' then 180 else null end;
 if v_cost is null then raise exception 'Item não encontrado na loja.'; end if;
 insert into public.nexus_player_progress(user_id) values(v_uid) on conflict(user_id) do nothing;
 select owned_cosmetics into v_owned from public.nexus_player_progress where user_id=v_uid for update;
 if cosmetic_key_input=any(v_owned) then return jsonb_build_object('ok',true,'already_owned',true); end if;
 select coins into v_wallet from public.nexus_loot_wallets where user_id=v_uid for update;
 if coalesce(v_wallet,0)<v_cost then raise exception 'Moedas insuficientes.'; end if;
 update public.nexus_loot_wallets set coins=coins-v_cost,updated_at=now() where user_id=v_uid;
 update public.nexus_player_progress set owned_cosmetics=array_append(owned_cosmetics,cosmetic_key_input),updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'cost',v_cost);
end; $$;

create or replace function public.nexus_progression_claim_pass_reward(reward_key_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_threshold integer; v_xp integer; v_owned text[];
begin
 if v_uid is null then raise exception 'Faça login para resgatar.'; end if;
 v_threshold:=case reward_key_input when 'pass-title-recruit' then 250 when 'pass-trail-blue' then 500 when 'pass-title-explorer' then 1000 when 'pass-frame-prism' then 1500 when 'pass-title-veteran' then 2000 else null end;
 if v_threshold is null then raise exception 'Recompensa inválida.'; end if;
 select coalesce(game_xp,0) into v_xp from public.social_profiles where user_id=v_uid;
 if coalesce(v_xp,0)<v_threshold then raise exception 'Continue jogando para liberar esta recompensa.'; end if;
 insert into public.nexus_player_progress(user_id) values(v_uid) on conflict(user_id) do nothing;
 select owned_cosmetics into v_owned from public.nexus_player_progress where user_id=v_uid for update;
 if reward_key_input=any(v_owned) then return jsonb_build_object('ok',true,'already_claimed',true); end if;
 update public.nexus_player_progress set owned_cosmetics=array_append(owned_cosmetics,reward_key_input),updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true);
end; $$;

create or replace function public.nexus_progression_equip(item_key_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); v_owned text[];
begin
 if v_uid is null then raise exception 'Faça login para equipar.'; end if;
 select owned_cosmetics into v_owned from public.nexus_player_progress where user_id=v_uid for update;
 if not (item_key_input=any(coalesce(v_owned,'{}'::text[]))) then raise exception 'Você ainda não possui este item.'; end if;
 if item_key_input like 'title-%' or item_key_input like 'pass-title-%' then
   update public.nexus_player_progress set equipped_title=item_key_input,updated_at=now() where user_id=v_uid;
 else
   update public.nexus_player_progress set equipped_cosmetic=item_key_input,updated_at=now() where user_id=v_uid;
 end if;
 return jsonb_build_object('ok',true);
end; $$;

revoke all on function public.nexus_progression_unlock_skill(text) from public, anon;
revoke all on function public.nexus_progression_purchase_cosmetic(text) from public, anon;
revoke all on function public.nexus_progression_claim_pass_reward(text) from public, anon;
revoke all on function public.nexus_progression_equip(text) from public, anon;
grant execute on function public.nexus_progression_unlock_skill(text) to authenticated;
grant execute on function public.nexus_progression_purchase_cosmetic(text) to authenticated;
grant execute on function public.nexus_progression_claim_pass_reward(text) to authenticated;
grant execute on function public.nexus_progression_equip(text) to authenticated;
