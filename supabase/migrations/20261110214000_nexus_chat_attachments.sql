alter table public.social_messages add column if not exists attachment_path text;
alter table public.social_room_messages add column if not exists attachment_path text;
alter table public.social_clan_messages add column if not exists attachment_path text;
drop policy if exists "Conversation members read chat attachments" on storage.objects;
create policy "Conversation members read chat attachments" on storage.objects for select to authenticated
using(bucket_id='nexus-posts' and exists(select 1 from public.social_messages m where m.attachment_path=name and social_is_conversation_member(m.conversation_id,(select auth.uid()))));
drop policy if exists "Room members read group attachments" on storage.objects;
create policy "Room members read group attachments" on storage.objects for select to authenticated
using(bucket_id='nexus-posts' and exists(select 1 from public.social_room_messages m where m.attachment_path=name and social_is_room_member(m.room_id,(select auth.uid()))));
drop policy if exists "Clan members read clan attachments" on storage.objects;
create policy "Clan members read clan attachments" on storage.objects for select to authenticated
using(bucket_id='nexus-posts' and exists(select 1 from public.social_clan_messages m join public.social_clan_members cm on cm.clan_id=m.clan_id where m.attachment_path=name and cm.user_id=(select auth.uid())));
