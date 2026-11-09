-- CORREÇÃO DE PERMISSÕES DO NEXUS SOCIAL
-- Execute no Supabase SQL Editor. Seguro para executar mais de uma vez.
-- Mantém RLS: cada usuário só cria/altera o próprio perfil.

grant usage on schema public to authenticated;

alter table public.social_profiles enable row level security;
alter table public.social_friend_requests enable row level security;
alter table public.social_friendships enable row level security;

drop policy if exists "Authenticated users can discover social profiles" on public.social_profiles;
create policy "Authenticated users can discover social profiles"
  on public.social_profiles for select to authenticated
  using (auth.uid() = user_id or is_suspended = false);

drop policy if exists "Users manage their own social profile" on public.social_profiles;
create policy "Users manage their own social profile"
  on public.social_profiles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own social profile" on public.social_profiles;
create policy "Users update their own social profile"
  on public.social_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Participants read friend requests" on public.social_friend_requests;
create policy "Participants read friend requests"
  on public.social_friend_requests for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Send friend requests as self" on public.social_friend_requests;
create policy "Send friend requests as self"
  on public.social_friend_requests for insert to authenticated
  with check (auth.uid() = sender_id and status = 'pending');

drop policy if exists "Receiver responds to friend requests" on public.social_friend_requests;
create policy "Receiver responds to friend requests"
  on public.social_friend_requests for update to authenticated
  using (auth.uid() = receiver_id and status = 'pending')
  with check (auth.uid() = receiver_id and status in ('accepted','rejected'));

drop policy if exists "Friends can read their friendship" on public.social_friendships;
create policy "Friends can read their friendship"
  on public.social_friendships for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Privilégios SQL da tabela (RLS continua filtrando as linhas).
grant select on public.social_profiles to authenticated;
revoke insert, update on public.social_profiles from authenticated;
grant insert (user_id, username, display_name, bio, avatar, avatar_frame, card_frame, equipped_gems, game_xp, game_correct, updated_at)
  on public.social_profiles to authenticated;
grant update (username, display_name, bio, avatar, avatar_frame, card_frame, equipped_gems, game_xp, game_correct, updated_at)
  on public.social_profiles to authenticated;

grant select, insert, update on public.social_friend_requests to authenticated;
grant select on public.social_friendships to authenticated;

revoke all on function public.social_respond_friend_request(uuid, boolean) from public;
grant execute on function public.social_respond_friend_request(uuid, boolean) to authenticated;
