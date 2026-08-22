"use client";

import { useEffect, useState, useRef } from "react";
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
import SettingsModal from "../../../components/SettingsModal";

export default function WatchPage({ params }: { params: { id: string } }) {
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

  // Feature States
  const [isLooping, setIsLooping] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theaterEnabled, setTheaterEnabled] = useState(false);

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

  // Auto-jump to time parameter if passed in URL (?t=15)
  useEffect(() => {
    const t = searchParams.get("t");
    if (t && videoRef.current) {
      videoRef.current.currentTime = parseFloat(t);
    }
  }, [searchParams, loading]);

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
    <div
      className="watch-layout"
      style={{
        backgroundColor: theaterEnabled ? "#000" : undefined,
        transition: "background-color 0.3s ease",
      }}
    >
      <div>
        <div
          className="player-shell"
          style={{
            position: "relative",
            overflow: "hidden",
            boxShadow: theaterEnabled ? "0 0 50px rgba(0,0,0,0.9)" : undefined,
          }}
        >
          <video
            ref={videoRef}
            src={video.video_url}
            controls
            autoPlay
            loop={isLooping}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <h1 className="watch-title" style={{ margin: 0 }}>{video.title}</h1>
          <button
            className="btn"
            onClick={() => setIsSettingsOpen(true)}
          >
            ⚙️ Settings
          </button>
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
            
            <button
              type="button"
              className="btn"
              onClick={() => setIsLooping(!isLooping)}
              style={{
                borderColor: isLooping ? "#ff4444" : undefined,
                color: isLooping ? "#ff4444" : undefined,
              }}
            >
              🔁 {isLooping ? "looping" : "loop"}
            </button>

            <LikeButton videoId={video.id} user={user} initialCount={likeCount} />
            
            <ShareButton
              title={video.title}
              getVideoTime={() => videoRef.current?.currentTime || 0}
            />

            <SubscribeButton channelId={channel.id} ownerId={channel.owner_id} user={user} />
          </div>
        </div>

        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
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

        {video.description && <div className="desc-box">{video.description}</div>}

        <CommentSection videoId={video.id} user={user} />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theaterEnabled={theaterEnabled}
        setTheaterEnabled={setTheaterEnabled}
      />
    </div>
  );
}