-- Turn on row-level security so people can only edit their own data
alter table channels enable row level security;
alter table videos enable row level security;
alter table video_views enable row level security;
alter table likes enable row level security;
alter table subscriptions enable row level security;
alter table comments enable row level security;

-- Everyone can browse
create policy "public read channels" on channels for select using (true);
create policy "public read videos" on videos for select using (true);
create policy "public read likes" on likes for select using (true);
create policy "public read subscriptions" on subscriptions for select using (true);
create policy "public read comments" on comments for select using (true);

-- Only the owner can create/edit their own channel
create policy "own channel insert" on channels for insert with check (auth.uid() = owner_id);
create policy "own channel update" on channels for update using (auth.uid() = owner_id);
create policy "own channel delete" on channels for delete using (auth.uid() = owner_id);

-- Only a channel's owner can upload videos to it
create policy "own video insert" on videos for insert with check (
  exists (select 1 from channels where channels.id = channel_id and channels.owner_id = auth.uid())
);
create policy "own video delete" on videos for delete using (
  exists (select 1 from channels where channels.id = channel_id and channels.owner_id = auth.uid())
);

-- Anyone (even logged-out visitors) can register a view
create policy "anyone can view" on video_views for insert with check (true);
create policy "public read views" on video_views for select using (true);

-- Only you can like/unlike as yourself
create policy "own like insert" on likes for insert with check (auth.uid() = user_id);
create policy "own like delete" on likes for delete using (auth.uid() = user_id);

-- Only you can subscribe/unsubscribe as yourself
create policy "own sub insert" on subscriptions for insert with check (auth.uid() = subscriber_id);
create policy "own sub delete" on subscriptions for delete using (auth.uid() = subscriber_id);

-- Only you can post/delete your own comments
create policy "own comment insert" on comments for insert with check (auth.uid() = user_id);
create policy "own comment delete" on comments for delete using (auth.uid() = user_id);

-- Pre-computed counts so the site doesn't have to count rows on every page load
create view video_stats as
select v.id as video_id,
  coalesce(vv.cnt, 0) as view_count,
  coalesce(l.cnt, 0) as like_count
from videos v
left join (select video_id, count(*) cnt from video_views group by video_id) vv on vv.video_id = v.id
left join (select video_id, count(*) cnt from likes group by video_id) l on l.video_id = v.id;

create view channel_stats as
select c.id as channel_id,
  coalesce(s.cnt, 0) as subscriber_count
from channels c
left join (select channel_id, count(*) cnt from subscriptions group by channel_id) s on s.channel_id = c.id;

-- Anyone can upload a video file into their own folder in storage
create policy "own folder upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "public read video files" on storage.objects for select using (bucket_id = 'videos');

-- Channel avatars: each user can only write inside their own folder,
-- and can overwrite/remove their own files (so re-uploading a pic works)
create policy "own folder avatar upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own folder avatar update" on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own folder avatar delete" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "public read avatar files" on storage.objects for select using (bucket_id = 'avatars');
