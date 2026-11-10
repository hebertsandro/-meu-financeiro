create table if not exists public.social_follows(
 follower_id uuid not null references auth.users(id) on delete cascade,
 following_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,following_id),
 check(follower_id<>following_id)
);
create index if not exists social_follows_following_idx on public.social_follows(following_id,created_at desc);
alter table public.social_follows enable row level security;
drop policy if exists "Authenticated users read follows" on public.social_follows;
create policy "Authenticated users read follows" on public.social_follows for select to authenticated using(true);
drop policy if exists "Users follow from own account" on public.social_follows;
create policy "Users follow from own account" on public.social_follows for insert to authenticated with check(follower_id=(select auth.uid()) and follower_id<>following_id);
drop policy if exists "Users unfollow from own account" on public.social_follows;
create policy "Users unfollow from own account" on public.social_follows for delete to authenticated using(follower_id=(select auth.uid()));
create or replace function private.social_notify_new_follower()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare actor_name text;
begin
 select coalesce(p.display_name,p.username,'Um jogador') into actor_name from public.social_profiles p where p.user_id=new.follower_id;
 insert into public.notifications(user_id,title,message,category)
 values(new.following_id,'Novo seguidor',actor_name||' começou a seguir você.','social');
 return new;
end;$function$;
drop trigger if exists social_notify_new_follower on public.social_follows;
create trigger social_notify_new_follower after insert on public.social_follows for each row execute function private.social_notify_new_follower();
revoke all on function private.social_notify_new_follower() from public,anon,authenticated;
