-- NEXUS SOCIAL FEED — publicações, curtidas, comentários, respostas e denúncias
create extension if not exists pgcrypto;

create table if not exists public.social_posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null default '' check (char_length(body)<=2000),
 image_path text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint social_posts_content_required check (char_length(trim(body))>0 or image_path is not null)
);
create index if not exists social_posts_created_idx on public.social_posts(created_at desc);
create index if not exists social_posts_author_idx on public.social_posts(author_id,created_at desc);

create table if not exists public.social_post_likes (
 post_id uuid not null references public.social_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
create index if not exists social_post_likes_user_idx on public.social_post_likes(user_id,post_id);

create table if not exists public.social_post_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.social_posts(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 parent_comment_id uuid references public.social_post_comments(id) on delete cascade,
 body text not null check (char_length(trim(body)) between 1 and 1000),
 created_at timestamptz not null default now(),
 deleted_at timestamptz
);
create index if not exists social_post_comments_post_idx on public.social_post_comments(post_id,created_at asc);

create or replace function public.social_validate_comment_parent()
returns trigger language plpgsql security definer set search_path=public as $
declare parent_post uuid;
begin
 if new.parent_comment_id is not null then
  select post_id into parent_post from public.social_post_comments where id=new.parent_comment_id and deleted_at is null;
  if parent_post is null or parent_post<>new.post_id then
   raise exception 'A resposta precisa pertencer à mesma publicação do comentário.';
  end if;
 end if;
 return new;
end;
$;
drop trigger if exists social_validate_comment_parent_trigger on public.social_post_comments;
create trigger social_validate_comment_parent_trigger before insert or update of post_id,parent_comment_id
on public.social_post_comments for each row execute function public.social_validate_comment_parent();

create table if not exists public.social_post_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid references public.social_posts(id) on delete cascade,
 comment_id uuid references public.social_post_comments(id) on delete cascade,
 details text not null default '' check(char_length(details)<=1000),
 status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
 created_at timestamptz not null default now(),
 constraint social_post_report_target check ((post_id is not null)::int+(comment_id is not null)::int=1)
);

alter table public.social_posts enable row level security;
alter table public.social_post_likes enable row level security;
alter table public.social_post_comments enable row level security;
alter table public.social_post_reports enable row level security;

create or replace function public.social_feed_can_view_author(target_author uuid)
returns boolean language sql stable security definer set search_path=public as $nexus$
 select (
  target_author=auth.uid()
  or exists(
   select 1 from public.social_friendships f
   where f.user_a=least(auth.uid(),target_author)
     and f.user_b=greatest(auth.uid(),target_author)
  )
 ) and not exists(
  select 1 from public.social_blocks b
  where (b.blocker_id=auth.uid() and b.blocked_id=target_author)
     or (b.blocker_id=target_author and b.blocked_id=auth.uid())
 );
$nexus$;
revoke all on function public.social_feed_can_view_author(uuid) from public;
grant execute on function public.social_feed_can_view_author(uuid) to authenticated;

drop policy if exists "Feed members read posts" on public.social_posts;
create policy "Feed members read posts" on public.social_posts for select to authenticated
 using (public.social_feed_can_view_author(author_id));
drop policy if exists "Users create own posts" on public.social_posts;
create policy "Users create own posts" on public.social_posts for insert to authenticated
 with check (author_id=auth.uid());
drop policy if exists "Authors update own posts" on public.social_posts;
create policy "Authors update own posts" on public.social_posts for update to authenticated
 using (author_id=auth.uid()) with check (author_id=auth.uid());
drop policy if exists "Authors delete own posts" on public.social_posts;
create policy "Authors delete own posts" on public.social_posts for delete to authenticated
 using (author_id=auth.uid());

drop policy if exists "Feed members read likes" on public.social_post_likes;
create policy "Feed members read likes" on public.social_post_likes for select to authenticated using (exists(select 1 from public.social_posts p where p.id=post_id and public.social_feed_can_view_author(p.author_id)));
drop policy if exists "Users like as themselves" on public.social_post_likes;
create policy "Users like as themselves" on public.social_post_likes for insert to authenticated
 with check (user_id=auth.uid() and exists(select 1 from public.social_posts p where p.id=post_id and public.social_feed_can_view_author(p.author_id)));
drop policy if exists "Users remove own likes" on public.social_post_likes;
create policy "Users remove own likes" on public.social_post_likes for delete to authenticated using (user_id=auth.uid());

drop policy if exists "Feed members read comments" on public.social_post_comments;
create policy "Feed members read comments" on public.social_post_comments for select to authenticated
 using (exists(select 1 from public.social_posts p where p.id=post_id and public.social_feed_can_view_author(p.author_id)));
drop policy if exists "Users create own comments" on public.social_post_comments;
create policy "Users create own comments" on public.social_post_comments for insert to authenticated
 with check (author_id=auth.uid() and exists(select 1 from public.social_posts p where p.id=post_id and public.social_feed_can_view_author(p.author_id)));
drop policy if exists "Authors remove own comments" on public.social_post_comments;
create policy "Authors remove own comments" on public.social_post_comments for update to authenticated
 using (author_id=auth.uid()) with check (author_id=auth.uid());

drop policy if exists "Users submit post reports" on public.social_post_reports;
create policy "Users submit post reports" on public.social_post_reports for insert to authenticated
 with check (reporter_id=auth.uid() and ((post_id is not null and exists(select 1 from public.social_posts p where p.id=post_id and p.author_id<>auth.uid() and public.social_feed_can_view_author(p.author_id))) or (comment_id is not null and exists(select 1 from public.social_post_comments c where c.id=comment_id and c.author_id<>auth.uid()))));
drop policy if exists "Users read own post reports" on public.social_post_reports;
create policy "Users read own post reports" on public.social_post_reports for select to authenticated using (reporter_id=auth.uid());

grant select,insert,update,delete on public.social_posts to authenticated;
grant select,insert,delete on public.social_post_likes to authenticated;
grant select,insert,update on public.social_post_comments to authenticated;
grant select,insert on public.social_post_reports to authenticated;

-- Bucket privado: as imagens só podem ser lidas por usuários autenticados.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('nexus-posts','nexus-posts',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Authenticated read feed images" on storage.objects;
create policy "Authenticated read feed images" on storage.objects for select to authenticated using(bucket_id='nexus-posts');
drop policy if exists "Users upload own feed images" on storage.objects;
create policy "Users upload own feed images" on storage.objects for insert to authenticated
 with check(bucket_id='nexus-posts' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users delete own feed images" on storage.objects;
create policy "Users delete own feed images" on storage.objects for delete to authenticated
 using(bucket_id='nexus-posts' and (storage.foldername(name))[1]=auth.uid()::text);

-- Atualizações em tempo real para o feed.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_posts') then alter publication supabase_realtime add table public.social_posts; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_post_likes') then alter publication supabase_realtime add table public.social_post_likes; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='social_post_comments') then alter publication supabase_realtime add table public.social_post_comments; end if;
 end if;
end $$;
