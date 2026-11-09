-- Create the NEXUS Social profile in the same transaction as auth signup.
-- A duplicate @ rejects signup instead of leaving an account without its social identity.
create or replace function public.handle_new_user_social_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $nexus$
declare
  social_username text;
  social_bio text;
  social_display_name text;
begin
  social_username := lower(trim(coalesce(new.raw_user_meta_data->>'social_username', '')));
  if social_username = '' then
    return new;
  end if;

  if social_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'NEXUS username must contain 3 to 20 lowercase letters, numbers or underscores';
  end if;

  social_bio := left(trim(coalesce(new.raw_user_meta_data->>'social_bio', '')), 160);
  social_display_name := left(trim(coalesce(new.raw_user_meta_data->>'display_name', 'Meu jogador')), 40);
  if social_display_name = '' then social_display_name := 'Meu jogador'; end if;

  insert into public.social_profiles (user_id, username, display_name, bio, avatar)
  values (new.id, social_username, social_display_name, social_bio, '👾');

  return new;
end;
$nexus$;

revoke all on function public.handle_new_user_social_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_social_profile on auth.users;
create trigger on_auth_user_created_social_profile
after insert on auth.users
for each row execute function public.handle_new_user_social_profile();
