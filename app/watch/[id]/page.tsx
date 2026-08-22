"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

function WatchContent({ videoId }: { videoId: string }) {
  const { user, loading: userLoading } = useUser();
  const { isAdmin } = useIsAdmin(user);
  const router = useRouter();
  const searchParams = useSearchParams();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [includeTime, setIncludeTime] = useState(false);

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

  useEffect(() => {
    const t = searchParams.get("t");
    if (t && videoRef.current) {
      videoRef.current.currentTime = parseFloat(t);
    }
  }, [searchParams, loading]);

  const jumpToTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

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
    <div className="watch-layout" style={{ maxWidth: 1100, margin: "0 auto", padding: "16px" }}>
      <div>
        <div className="player-shell" style={{ position: "relative", width: "100%", aspectRatio: "16/9", backgroundColor: "#000", borderRadius: 8, overflow: "hidden" }}>
          <video
            ref={videoRef}
            src={video.video_url}
            controls
            autoPlay
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <h1 className="watch-title" style={{ margin: 0, fontSize: 22 }}>{video.title}</h1>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 13, color: "#888", cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={includeTime}
                onChange={(e) => setIncludeTime(e.target.checked)}
              />
              at current time
            </label>
            <ShareButton
              title={video.title}
              getVideoTime={includeTime ? () => videoRef.current?.currentTime || 0 : undefined}
            />
          </div>
        </div>

        <div className="watch-row" style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #222", paddingBottom: 16 }}>
          <Link href={`/channel/${channel.handle}`} className="channel-chip" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div className="channel-avatar" style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#333", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {channel.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={channel.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                channel.name[0]?.toUpperCase()
              )}
            </div>
            <div>
              <p className="channel-name" style={{ margin: 0, color: "#fff", fontWeight: 600 }}>{channel.name}</p>
              <p className="channel-subs" style={{ margin: 0, fontSize: 12, color: "#888" }}>{subCount.toLocaleString()} subscribers</p>
            </div>
          </Link>

          <div className="action-cluster" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <VcrCounter value={viewCount} label="views" />
            <LikeButton videoId={video.id} user={user} initialCount={likeCount} />
            <SubscribeButton channelId={channel.id} ownerId={channel.owner_id} user={user} />
          </div>
        </div>

        <div style={{ margin: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <ContentWarningBadge text={video.content_warning} />
          {canDelete && (
            <button
              className="btn"
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ marginLeft: "auto", color: "#c0392b" }}
            >
              {deleting ? "deleting..." : isOwner ? "delete this clip" : "delete this clip (admin)"}
            </button>
          )}
        </div>
        {deleteError && <p className="error-text">{deleteError}</p>}

        {video.description && (
          <div className="desc-box" style={{ background: "#111", padding: 14, borderRadius: 6, fontSize: 14, color: "#ccc", margin: "12px 0" }}>
            {video.description}
          </div>
        )}

        <CommentSection videoId={video.id} user={user} onJumpToTime={jumpToTime} />
      </div>
    </div>
  );
}

export default function WatchPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="page empty">loading tape...</div>}>
      <WatchContent videoId={params.id} />
    </Suspense>
  );
}