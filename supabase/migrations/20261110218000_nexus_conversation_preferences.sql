create table if not exists public.social_conversation_preferences(
 conversation_id uuid not null references public.social_conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 is_favorite boolean not null default false,
 is_archived boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(conversation_id,user_id)
);
alter table public.social_conversation_preferences enable row level security;
drop policy if exists "Users read own conversation preferences" on public.social_conversation_preferences;
create policy "Users read own conversation preferences" on public.social_conversation_preferences for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users create own conversation preferences" on public.social_conversation_preferences;
create policy "Users create own conversation preferences" on public.social_conversation_preferences for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.social_conversation_members m where m.conversation_id=conversation_id and m.user_id=(select auth.uid())));
drop policy if exists "Users update own conversation preferences" on public.social_conversation_preferences;
create policy "Users update own conversation preferences" on public.social_conversation_preferences for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
