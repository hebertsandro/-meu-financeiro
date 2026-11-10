alter table public.social_posts add column if not exists video_path text;
create policy "Friends read attached feed videos" on storage.objects for select to authenticated
using (bucket_id = 'nexus-posts' and exists (select 1 from public.social_posts p where p.video_path = objects.name and private.social_feed_can_view_author(p.author_id)));
update storage.buckets set file_size_limit = 20971520, allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm'] where id = 'nexus-posts';