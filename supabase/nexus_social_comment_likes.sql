-- NEXUS SOCIAL: curtidas nos comentários
-- Execute este script no SQL Editor do Supabase.

create table if not exists public.social_post_comment_likes (
 comment_id uuid not null references public.social_post_comments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(comment_id,user_id)
);

create index if not exists social_post_comment_likes_user_idx
 on public.social_post_comment_likes(user_id,comment_id);

alter table public.social_post_comment_likes enable row level security;

drop policy if exists "Feed members read comment likes" on public.social_post_comment_likes;
create policy "Feed members read comment likes"
 on public.social_post_comment_likes for select to authenticated
 using(exists(
  select 1 from public.social_post_comments c
  join public.social_posts p on p.id=c.post_id
  where c.id=comment_id and c.deleted_at is null
    and private.social_feed_can_view_author(p.author_id)
 ));

drop policy if exists "Users like comments as themselves" on public.social_post_comment_likes;
create policy "Users like comments as themselves"
 on public.social_post_comment_likes for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(
  select 1 from public.social_post_comments c
  join public.social_posts p on p.id=c.post_id
  where c.id=comment_id and c.deleted_at is null
    and private.social_feed_can_view_author(p.author_id)
 ));

drop policy if exists "Users remove own comment likes" on public.social_post_comment_likes;
create policy "Users remove own comment likes"
 on public.social_post_comment_likes for delete to authenticated
 using(user_id=(select auth.uid()));

grant select,insert,delete on public.social_post_comment_likes to authenticated;
