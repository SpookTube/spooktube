"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useUser } from "../../../lib/useUser";
import type { Channel, Video } from "../../../lib/types";
import VideoCard from "../../../components/VideoCard";
import SubscribeButton from "../../../components/SubscribeButton";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3MB

export default function ChannelPage({ params }: { params: { handle: string } }) {
  const { user } = useUser();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: c } = await supabase
        .from("channels")
        .select("*")
        .eq("handle", params.handle)
        .single();

      if (!c || cancelled) {
        setLoading(false);
        return;
      }
      setChannel(c);

      const [{ data: vids }, { data: chStats }] = await Promise.all([
        supabase
          .from("videos")
          .select("*, channels(*)")
          .eq("channel_id", c.id)
          .order("created_at", { ascending: false }),
        supabase.from("channel_stats").select("*").eq("channel_id", c.id).maybeSingle(),
      ]);

      if (cancelled) return;

      const { data: stats } = await supabase.from("video_stats").select("*");
      const statsMap = new Map((stats ?? []).map((s) => [s.video_id, s]));

      const merged = (vids ?? []).map((v: any) => ({
        ...v,
        view_count: statsMap.get(v.id)?.view_count ?? 0,
        like_count: statsMap.get(v.id)?.like_count ?? 0,
      }));

      setVideos(merged);
      setSubCount(chStats?.subscriber_count ?? 0);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.handle]);

  const isOwner = !!user && !!channel && user.id === channel.owner_id;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user || !channel) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Pick an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("That image is over the 3MB limit.");
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);

    // Fixed filename per user so re-uploads overwrite instead of piling up.
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new image shows immediately even though the path is the same.
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("channels")
      .update({ avatar_url: avatarUrl })
      .eq("id", channel.id);

    setAvatarUploading(false);

    if (updateError) {
      setAvatarError(updateError.message);
      return;
    }

    setChannel({ ...channel, avatar_url: avatarUrl });
  }

  if (loading) return <div className="page empty">loading channel...</div>;
  if (!channel) return <div className="page empty">no channel at that handle.</div>;

  return (
    <div>
      <div className="channel-hero">
        <div className="channel-avatar" style={{ position: "relative" }}>
          {channel.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channel.avatar_url} alt="" />
          ) : (
            channel.name[0]?.toUpperCase()
          )}
          {isOwner && (
            <label
              className="hint"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                cursor: "pointer",
                borderRadius: "50%",
                fontSize: 11,
                textAlign: "center",
              }}
            >
              {avatarUploading ? "uploading..." : "change pic"}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h1>{channel.name}</h1>
          <p className="channel-subs" style={{ marginBottom: 4 }}>
            @{channel.handle} · {subCount.toLocaleString()} subscribers
          </p>
          {channel.description && <p>{channel.description}</p>}
          {avatarError && <p className="error-text">{avatarError}</p>}
        </div>
        <SubscribeButton channelId={channel.id} ownerId={channel.owner_id} user={user} />
      </div>

      <div className="page">
        {videos.length === 0 ? (
          <div className="empty">no clips on this channel yet.</div>
        ) : (
          <div className="grid">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
