-- NEXUS SOCIAL: feed comunitário para todos os usuários ativos do Social.
-- Mantém privacidade de bloqueios e contas suspensas.
create or replace function private.social_feed_can_view_author(target_author uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private
as $nexus$
  select auth.uid() is not null
    and exists (
      select 1
      from public.social_profiles p
      where p.user_id = target_author
        and p.is_suspended = false
    )
    and not exists (
      select 1
      from public.social_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = target_author)
         or (b.blocker_id = target_author and b.blocked_id = auth.uid())
    );
$nexus$;

revoke all on function private.social_feed_can_view_author(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.social_feed_can_view_author(uuid) to authenticated;
