export type Channel = {
  id: string;
  owner_id: string;
  name: string;
  handle: string;
  description: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Video = {
  id: string;
  channel_id: string;
  title: string;
  description: string | null;
  content_warning: string;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
  channels?: Channel;
  view_count?: number;
  like_count?: number;
};

export type Comment = {
  id: string;
  video_id: string;
  user_id: string;
  body: string;
  created_at: string;
};
