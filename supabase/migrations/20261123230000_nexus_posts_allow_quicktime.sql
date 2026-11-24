update storage.buckets set allowed_mime_types = array(select distinct unnest(allowed_mime_types || array['video/quicktime'])) where id='nexus-posts';
