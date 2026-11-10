-- NEXUS Social: stories, saved posts, reactions and richer message controls.
create table if not exists public.social_stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 240),
  image_path text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists social_stories_active_idx on public.social_stories(expires_at desc, created_at desc);
alter table public.social_stories enable row level security;
drop policy if exists "Active stories visible to social users" on public.social_stories;
create policy "Active stories visible to social users" on public.social_stories for select to authenticated
using (expires_at > now() and private.social_feed_can_view_author(author_id));
drop policy if exists "Users create own stories" on public.social_stories;
create policy "Users create own stories" on public.social_stories for insert to authenticated
with check (author_id = (select auth.uid()) and expires_at <= now() + interval '25 hours' and expires_at > now());
drop policy if exists "Users delete own stories" on public.social_stories;
create policy "Users delete own stories" on public.social_stories for delete to authenticated
using (author_id = (select auth.uid()));

create table if not exists public.social_post_bookmarks (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
alter table public.social_post_bookmarks enable row level security;
drop policy if exists "Users read own post bookmarks" on public.social_post_bookmarks;
create policy "Users read own post bookmarks" on public.social_post_bookmarks for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users save visible posts" on public.social_post_bookmarks;
create policy "Users save visible posts" on public.social_post_bookmarks for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and private.social_feed_can_view_author(p.author_id)));
drop policy if exists "Users unsave own posts" on public.social_post_bookmarks;
create policy "Users unsave own posts" on public.social_post_bookmarks for delete to authenticated using(user_id=(select auth.uid()));

create table if not exists public.social_post_reactions (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check(reaction in ('❤️','🔥','👏','💡','😂')),
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
alter table public.social_post_reactions enable row level security;
drop policy if exists "Visible post reactions" on public.social_post_reactions;
create policy "Visible post reactions" on public.social_post_reactions for select to authenticated
using(exists(select 1 from public.social_posts p where p.id=post_id and private.social_feed_can_view_author(p.author_id)));
drop policy if exists "Users react to visible posts" on public.social_post_reactions;
create policy "Users react to visible posts" on public.social_post_reactions for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and private.social_feed_can_view_author(p.author_id)));
drop policy if exists "Users change own reactions" on public.social_post_reactions;
create policy "Users change own reactions" on public.social_post_reactions for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Users remove own reactions" on public.social_post_reactions;
create policy "Users remove own reactions" on public.social_post_reactions for delete to authenticated using(user_id=(select auth.uid()));

alter table public.social_messages add column if not exists edited_at timestamptz;
alter table public.social_messages add column if not exists deleted_at timestamptz;
alter table public.social_messages add column if not exists is_pinned boolean not null default false;
alter table public.social_room_messages add column if not exists edited_at timestamptz;
alter table public.social_room_messages add column if not exists deleted_at timestamptz;
alter table public.social_room_messages add column if not exists is_pinned boolean not null default false;
alter table public.social_clan_messages add column if not exists edited_at timestamptz;
alter table public.social_clan_messages add column if not exists deleted_at timestamptz;
alter table public.social_clan_messages add column if not exists is_pinned boolean not null default false;

create table if not exists public.social_message_reactions (
  message_id uuid not null references public.social_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check(reaction in ('❤️','🔥','👏','😂','👍')),
  created_at timestamptz not null default now(),
  primary key(message_id,user_id)
);
alter table public.social_message_reactions enable row level security;
drop policy if exists "Conversation members read reactions" on public.social_message_reactions;
create policy "Conversation members read reactions" on public.social_message_reactions for select to authenticated
using(exists(select 1 from public.social_messages m join public.social_conversation_members cm on cm.conversation_id=m.conversation_id where m.id=message_id and cm.user_id=(select auth.uid())));
drop policy if exists "Conversation members react" on public.social_message_reactions;
create policy "Conversation members react" on public.social_message_reactions for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.social_messages m join public.social_conversation_members cm on cm.conversation_id=m.conversation_id where m.id=message_id and cm.user_id=(select auth.uid())));
drop policy if exists "Users change own message reactions" on public.social_message_reactions;
create policy "Users change own message reactions" on public.social_message_reactions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Users remove own message reactions" on public.social_message_reactions;
create policy "Users remove own message reactions" on public.social_message_reactions for delete to authenticated using(user_id=(select auth.uid()));

alter table public.social_room_members add column if not exists role text not null default 'member' check(role in ('admin','member'));
update public.social_room_members rm set role='admin'
from public.social_rooms r where r.id=rm.room_id and r.created_by=rm.user_id;
drop policy if exists "Room admins manage member roles" on public.social_room_members;
drop policy if exists "Room creators manage member roles" on public.social_room_members;
create policy "Room creators manage member roles" on public.social_room_members for update to authenticated
using (exists(select 1 from public.social_rooms r where r.id=room_id and r.created_by=(select auth.uid())))
with check (role in ('admin','member') and exists(select 1 from public.social_rooms r where r.id=room_id and r.created_by=(select auth.uid())));

drop policy if exists "Friends read active story images" on storage.objects;
create policy "Friends read active story images" on storage.objects for select to authenticated
using (bucket_id='nexus-posts' and exists(select 1 from public.social_stories s where s.image_path=name and s.expires_at>now() and private.social_feed_can_view_author(s.author_id)));
