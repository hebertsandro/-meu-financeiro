create table if not exists public.nexus_bets(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null,
  stake int not null check (stake between 10 and 100),
  tier text not null check (tier in ('safe','bold','wild')),
  multiplier numeric(4,2) not null,
  target int not null check (target > 0),
  status text not null default 'open' check (status in ('open','won','lost','cancelled')),
  score int,
  payout int not null default 0,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists nexus_bets_one_open on public.nexus_bets(user_id) where status='open';
create index if not exists nexus_bets_user_idx on public.nexus_bets(user_id,created_at desc);
alter table public.nexus_bets enable row level security;
drop policy if exists "bets read own" on public.nexus_bets;
create policy "bets read own" on public.nexus_bets for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.nexus_bet_status(game_key_input text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_best int; v_coins int; v_open jsonb; v_hist jsonb;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select coalesce(max(score),0) into v_best from public.competition_match_history where user_id=v_uid and game_key=game_key_input;
 select coalesce(coins,0) into v_coins from public.nexus_loot_wallets where user_id=v_uid;
 select to_jsonb(b) into v_open from (select id,game_key,stake,tier,multiplier,target,created_at from public.nexus_bets where user_id=v_uid and status='open') b;
 select coalesce(jsonb_agg(to_jsonb(h)),'[]'::jsonb) into v_hist from (select game_key,stake,multiplier,target,status,score,payout,resolved_at from public.nexus_bets where user_id=v_uid and status in ('won','lost') order by resolved_at desc limit 5) h;
 return jsonb_build_object('best',v_best,'coins',coalesce(v_coins,0),'open',v_open,'history',v_hist);
end; $$;

create or replace function public.nexus_place_bet(game_key_input text, stake_input int, tier_input text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_best int; v_base int; v_mult numeric; v_target int; v_coins int;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 if stake_input is null or stake_input<10 or stake_input>100 then raise exception 'A aposta deve ser de 10 a 100 moedas.'; end if;
 if game_key_input is null or length(game_key_input)>40 then raise exception 'Jogo inválido.'; end if;
 select coalesce(max(score),0) into v_best from public.competition_match_history where user_id=v_uid and game_key=game_key_input;
 v_base:=greatest(v_best,5);
 if tier_input='safe' then v_mult:=1.5; v_target:=greatest(1,ceil(v_base*0.8));
 elsif tier_input='bold' then v_mult:=2.5; v_target:=greatest(2,ceil(v_base*1.0));
 elsif tier_input='wild' then v_mult:=4; v_target:=greatest(3,ceil(v_base*1.3));
 else raise exception 'Nível de aposta inválido.'; end if;
 if exists(select 1 from public.nexus_bets where user_id=v_uid and status='open') then raise exception 'Você já tem uma aposta aberta. Jogue ou cancele antes.'; end if;
 select coins into v_coins from public.nexus_loot_wallets where user_id=v_uid for update;
 if coalesce(v_coins,0)<stake_input then raise exception 'Moedas insuficientes.'; end if;
 update public.nexus_loot_wallets set coins=coins-stake_input,updated_at=now() where user_id=v_uid;
 insert into public.nexus_bets(user_id,game_key,stake,tier,multiplier,target) values(v_uid,game_key_input,stake_input,tier_input,v_mult,v_target);
 return jsonb_build_object('ok',true,'target',v_target,'multiplier',v_mult);
end; $$;

create or replace function public.nexus_resolve_bet()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); b public.nexus_bets%rowtype; m record; v_pay int:=0; v_status text;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select * into b from public.nexus_bets where user_id=v_uid and status='open' for update;
 if not found then return jsonb_build_object('resolved',false); end if;
 select score into m from public.competition_match_history where user_id=v_uid and game_key=b.game_key and played_at>=b.created_at order by played_at asc limit 1;
 if not found then return jsonb_build_object('resolved',false); end if;
 if m.score>=b.target then v_status:='won'; v_pay:=floor(b.stake*b.multiplier); else v_status:='lost'; end if;
 update public.nexus_bets set status=v_status,score=m.score,payout=v_pay,resolved_at=now() where id=b.id;
 if v_pay>0 then update public.nexus_loot_wallets set coins=coins+v_pay,updated_at=now() where user_id=v_uid; end if;
 return jsonb_build_object('resolved',true,'status',v_status,'score',m.score,'target',b.target,'payout',v_pay,'stake',b.stake);
end; $$;

create or replace function public.nexus_cancel_bet()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); b public.nexus_bets%rowtype;
begin
 if v_uid is null then raise exception 'Faça login.'; end if;
 select * into b from public.nexus_bets where user_id=v_uid and status='open' for update;
 if not found then return jsonb_build_object('ok',false); end if;
 update public.nexus_bets set status='cancelled',resolved_at=now() where id=b.id;
 update public.nexus_loot_wallets set coins=coins+b.stake,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'refund',b.stake);
end; $$;
revoke all on function public.nexus_bet_status(text),public.nexus_place_bet(text,int,text),public.nexus_resolve_bet(),public.nexus_cancel_bet() from public, anon;
grant execute on function public.nexus_bet_status(text),public.nexus_place_bet(text,int,text),public.nexus_resolve_bet(),public.nexus_cancel_bet() to authenticated;
