-- NEXUS SOCIAL FEED: index foreign keys and tune RLS policies.
create index if not exists social_post_comments_author_idx on public.social_post_comments(author_id);
create index if not exists social_post_comments_parent_idx on public.social_post_comments(parent_comment_id);
create index if not exists social_post_reports_post_idx on public.social_post_reports(post_id);
create index if not exists social_post_reports_comment_idx on public.social_post_reports(comment_id);
create index if not exists social_post_reports_reporter_idx on public.social_post_reports(reporter_id);

drop policy if exists "Users create own posts" on public.social_posts;
create policy "Users create own posts" on public.social_posts for insert to authenticated with check(author_id=(select auth.uid()));
drop policy if exists "Authors update own posts" on public.social_posts;
create policy "Authors update own posts" on public.social_posts for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
drop policy if exists "Authors delete own posts" on public.social_posts;
create policy "Authors delete own posts" on public.social_posts for delete to authenticated using(author_id=(select auth.uid()));
drop policy if exists "Users like as themselves" on public.social_post_likes;
create policy "Users like as themselves" on public.social_post_likes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and private.social_feed_can_view_author(p.author_id)));
drop policy if exists "Users remove own likes" on public.social_post_likes;
create policy "Users remove own likes" on public.social_post_likes for delete to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users create own comments" on public.social_post_comments;
create policy "Users create own comments" on public.social_post_comments for insert to authenticated with check(author_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and private.social_feed_can_view_author(p.author_id)));
drop policy if exists "Authors remove own comments" on public.social_post_comments;
create policy "Authors remove own comments" on public.social_post_comments for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
drop policy if exists "Users submit post reports" on public.social_post_reports;
create policy "Users submit post reports" on public.social_post_reports for insert to authenticated with check(reporter_id=(select auth.uid()) and ((post_id is not null and exists(select 1 from public.social_posts p where p.id=post_id and p.author_id<>(select auth.uid()) and private.social_feed_can_view_author(p.author_id))) or (comment_id is not null and exists(select 1 from public.social_post_comments c join public.social_posts p on p.id=c.post_id where c.id=comment_id and c.author_id<>(select auth.uid()) and private.social_feed_can_view_author(p.author_id)))));
drop policy if exists "Users read own post reports" on public.social_post_reports;
create policy "Users read own post reports" on public.social_post_reports for select to authenticated using(reporter_id=(select auth.uid()));


-- Curtidas individuais nos comentários do NEXUS Feed.
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
