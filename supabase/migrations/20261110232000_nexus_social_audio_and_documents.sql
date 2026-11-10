update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp',
      'video/mp4','video/webm',
      'audio/mp4','audio/webm','audio/aac','audio/ogg','audio/mpeg','audio/wav',
      'application/pdf','text/plain'
    ]
where id = 'nexus-posts';