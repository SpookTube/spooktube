"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useUser } from "../../../lib/useUser";
import { useIsAdmin } from "../../../lib/useIsAdmin";
import { getAnonViewerId } from "../../../lib/viewerId";
import type { Video, Channel } from "../../../lib/types";
import ContentWarningBadge from "../../../components/ContentWarningBadge";
import VcrCounter from "../../../components/VcrCounter";
import LikeButton from "../../../components/LikeButton";
import SubscribeButton from "../../../components/SubscribeButton";
import CommentSection from "../../../components/CommentSection";
import ShareButton from "../../../components/ShareButton";

export default function WatchPage({ params }: { params: { id: string } }) {
  const videoId = params.id;
  const { user, loading: userLoading } = useUser();
  const { isAdmin } = useIsAdmin(user);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: v } = await supabase
        .from("videos")
        .select("*, channels(*)")
        .eq("id", videoId)
        .single();

      if (!v || cancelled) {
        setLoading(false);
        return;
      }

      setVideo(v);
      setChannel(v.channels);

      const [{ data: stats }, { data: chStats }] = await Promise.all([
        supabase.from("video_stats").select("*").eq("video_id", videoId).maybeSingle(),
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
  }, [videoId]);

  useEffect(() => {
    if (userLoading) return;
    const viewerId = user?.id ?? getAnonViewerId();

    supabase
      .from("video_views")
      .insert({ video_id: videoId, viewer_id: viewerId })
      .then(({ error }) => {
        if (!error) setViewCount((c) => c + 1);
      });
  }, [videoId, user, userLoading]);

  const isOwner = !!user && !!channel && user.id === channel.owner_id;
  const canDelete = isOwner || isAdmin;

  async function handleDelete() {
    if (!video || !channel) return;
    if (!window.confirm("Delete this clip for good? This can't be undone.")) return;

    setDeleting(true);
    setDeleteError(null);

    const { error } = await supabase.from("videos").delete().eq("id", video.id);

    if (error) {
      setDeleting(false);
      setDeleteError(error.message);
      return;
    }

    router.push(`/channel/${channel.handle}`);
  }

  if (loading) return <div className="page empty">loading tape...</div>;
  if (!video || !channel) return <div className="page empty">this clip doesn't exist (or got taped over).</div>;

  return (
    <div className="watch-layout">
      <div>
        <div className="player-shell">
          <video
            ref={videoRef}
            src={video.video_url}
            controls
            autoPlay
          />
        </div>

        <div className="watch-header-row">
          <h1 className="watch-title">{video.title}</h1>
          <ShareButton />
        </div>

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

        <div className="warning-row">
          <ContentWarningBadge text={video.content_warning} />
          {canDelete && (
            <button
              className="btn btn-delete"
              type="button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "deleting..." : isOwner ? "delete this clip" : "delete this clip (admin)"}
            </button>
          )}
        </div>
        {deleteError && <p className="error-text">{deleteError}</p>}

        {video.description && <div className="desc-box">{video.description}</div>}

        <CommentSection videoId={video.id} user={user} />
      </div>
    </div>
  );
}