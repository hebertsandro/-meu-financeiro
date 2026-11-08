-- NEXUS SOCIAL — execute no Supabase SQL Editor antes de liberar o módulo.
create extension if not exists pgcrypto;

create table if not exists public.social_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
 display_name text not null default '' check (char_length(display_name) between 1 and 40),
 bio text not null default '' check (char_length(bio)<=160),
 avatar text not null default '👾',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.social_friend_requests (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 receiver_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled')),
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 check(sender_id<>receiver_id),
 unique(sender_id,receiver_id)
);
create table if not exists public.social_friendships (
 id uuid primary key default gen_random_uuid(),
 user_a uuid not null references auth.users(id) on delete cascade,
 user_b uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 check(user_a<user_b),
 unique(user_a,user_b)
);
create index if not exists social_profiles_username_idx on public.social_profiles(username);
create index if not exists social_friend_requests_receiver_idx on public.social_friend_requests(receiver_id,status);
create index if not exists social_friend_requests_sender_idx on public.social_friend_requests(sender_id,status);

alter table public.social_profiles enable row level security;
alter table public.social_friend_requests enable row level security;
alter table public.social_friendships enable row level security;

drop policy if exists "Authenticated users can discover social profiles" on public.social_profiles;
create policy "Authenticated users can discover social profiles" on public.social_profiles for select to authenticated using(true);
drop policy if exists "Users manage their own social profile" on public.social_profiles;
create policy "Users manage their own social profile" on public.social_profiles for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Users update their own social profile" on public.social_profiles;
create policy "Users update their own social profile" on public.social_profiles for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

drop policy if exists "Participants read friend requests" on public.social_friend_requests;
create policy "Participants read friend requests" on public.social_friend_requests for select to authenticated using(auth.uid()=sender_id or auth.uid()=receiver_id);
drop policy if exists "Send friend requests as self" on public.social_friend_requests;
create policy "Send friend requests as self" on public.social_friend_requests for insert to authenticated with check(auth.uid()=sender_id and status='pending');
drop policy if exists "Receiver responds to friend requests" on public.social_friend_requests;
create policy "Receiver responds to friend requests" on public.social_friend_requests for update to authenticated using(auth.uid()=receiver_id and status='pending') with check(auth.uid()=receiver_id and status in ('accepted','rejected'));

drop policy if exists "Friends can read their friendship" on public.social_friendships;
create policy "Friends can read their friendship" on public.social_friendships for select to authenticated using(auth.uid()=user_a or auth.uid()=user_b);

create or replace function public.social_respond_friend_request(request_id uuid, accept_request boolean)
returns void language plpgsql security definer set search_path=public as $$
declare req public.social_friend_requests%rowtype;
begin
 select * into req from public.social_friend_requests where id=request_id for update;
 if not found or req.receiver_id<>auth.uid() or req.status<>'pending' then
  raise exception 'Solicitação não encontrada ou sem permissão.';
 end if;
 update public.social_friend_requests set status=case when accept_request then 'accepted' else 'rejected' end,responded_at=now() where id=request_id;
 if accept_request then
  insert into public.social_friendships(user_a,user_b)
  values(least(req.sender_id,req.receiver_id),greatest(req.sender_id,req.receiver_id))
  on conflict(user_a,user_b) do nothing;
 end if;
end; $$;
revoke all on function public.social_respond_friend_request(uuid,boolean) from public;
grant execute on function public.social_respond_friend_request(uuid,boolean) to authenticated;

grant select,insert,update on public.social_profiles to authenticated;
grant select,insert,update on public.social_friend_requests to authenticated;
grant select on public.social_friendships to authenticated;


-- Moderação administrativa do NEXUS SOCIAL (migração segura e reexecutável).
alter table public.social_profiles
 add column if not exists is_suspended boolean not null default false,
 add column if not exists moderation_note text,
 add column if not exists moderated_at timestamptz,
 add column if not exists moderated_by uuid references auth.users(id) on delete set null;

drop policy if exists "Authenticated users can discover social profiles" on public.social_profiles;
create policy "Authenticated users can discover social profiles"
 on public.social_profiles for select to authenticated
 using (auth.uid() = user_id or is_suspended = false);


-- Usuários só podem escrever os campos do próprio perfil; campos de moderação
-- ficam reservados ao service role usado pela Edge Function administrativa.
revoke insert, update on public.social_profiles from authenticated;
grant insert (user_id, username, display_name, bio, avatar) on public.social_profiles to authenticated;
grant update (username, display_name, bio, avatar, updated_at) on public.social_profiles to authenticated;
