"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { useUser } from "../../../lib/useUser";
import { getAnonViewerId } from "../../../lib/viewerId";
import type { Video, Channel } from "../../../lib/types";
import ContentWarningBadge from "../../../components/ContentWarningBadge";
import VcrCounter from "../../../components/VcrCounter";
import LikeButton from "../../../components/LikeButton";
import SubscribeButton from "../../../components/SubscribeButton";
import CommentSection from "../../../components/CommentSection";

export default function WatchPage({ params }: { params: { id: string } }) {
  const { user, loading: userLoading } = useUser();
  const [video, setVideo] = useState<Video | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: v } = await supabase
        .from("videos")
        .select("*, channels(*)")
        .eq("id", params.id)
        .single();

      if (!v || cancelled) {
        setLoading(false);
        return;
      }

      setVideo(v);
      setChannel(v.channels);

      const [{ data: stats }, { data: chStats }] = await Promise.all([
        supabase.from("video_stats").select("*").eq("video_id", params.id).maybeSingle(),
        supabase.from("channel_stats").select("*").eq("channel_id", v.channel_id).maybeSingle(),
      ]);

      if (!cancelled) {
        setViewCount(stats?.view_count ?? 0);
        setLikeCount(stats?.like_count ?? 0);
        setSubCount(chStats?.subscriber_count ?? 0);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Record a view once per viewer (logged-in id, or a stable anon id). The
  // video_views table's primary key silently rejects duplicates, so re-visits
  // don't inflate the count.
  useEffect(() => {
    if (userLoading) return;
    const viewerId = user?.id ?? getAnonViewerId();

    supabase
      .from("video_views")
      .insert({ video_id: params.id, viewer_id: viewerId })
      .then(({ error }) => {
        if (!error) setViewCount((c) => c + 1);
      });
  }, [params.id, user, userLoading]);

  if (loading) return <div className="page empty">loading tape...</div>;
  if (!video || !channel) return <div className="page empty">this clip doesn't exist (or got taped over).</div>;

  return (
    <div className="watch-layout">
      <div>
        <div className="player-shell">
          <video src={video.video_url} controls autoPlay />
        </div>

        <h1 className="watch-title">{video.title}</h1>

        <div className="watch-row">
          <Link href={`/channel/${channel.handle}`} className="channel-chip">
            <div className="channel-avatar">
              {channel.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={channel.avatar_url} alt="" />
              ) : (
                channel.name[0]?.toUpperCase()
              )}
            </div>
            <div>
              <p className="channel-name">{channel.name}</p>
              <p className="channel-subs">{subCount.toLocaleString()} subscribers</p>
            </div>
          </Link>

          <div className="action-cluster">
            <VcrCounter value={viewCount} label="views" />
            <LikeButton videoId={video.id} user={user} initialCount={likeCount} />
            <SubscribeButton channelId={channel.id} ownerId={channel.owner_id} user={user} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <ContentWarningBadge text={video.content_warning} />
        </div>

        {video.description && <div className="desc-box">{video.description}</div>}

        <CommentSection videoId={video.id} user={user} />
      </div>
    </div>
  );
}
