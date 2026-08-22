"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useUser } from "../../../lib/useUser";
import { useIsAdmin } from "../../../lib/useIsAdmin";
import type { Channel, Video } from "../../../lib/types";
import VideoCard from "../../../components/VideoCard";
import SubscribeButton from "../../../components/SubscribeButton";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3MB

export default function ChannelPage({ params }: { params: { handle: string } }) {
  const { user } = useUser();
  const { isAdmin } = useIsAdmin(user);
  const router = useRouter();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [deletingChannel, setDeletingChannel] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [tab, setTab] = useState<"videos" | "about">("videos");
  const [sort, setSort] = useState<"newest" | "popular">("newest");

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
  const canDelete = isOwner || isAdmin;
  const canManage = isOwner || isAdmin;

  const sortedVideos = useMemo(() => {
    if (sort === "popular") {
      return [...videos].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    }
    return videos; // already newest-first from the query
  }, [videos, sort]);

  function startEditingName() {
    if (!channel) return;
    setNameInput(channel.name);
    setNameError(null);
    setEditingName(true);
  }

  async function handleRenameSave() {
    if (!channel) return;
    const trimmed = nameInput.trim();

    if (!trimmed) {
      setNameError("Name can't be empty.");
      return;
    }
    if (trimmed === channel.name) {
      setEditingName(false);
      return;
    }

    setNameSaving(true);
    setNameError(null);

    const { data, error } = await supabase
      .from("channels")
      .update({ name: trimmed })
      .eq("id", channel.id)
      .select()
      .single();

    setNameSaving(false);

    if (error) {
      setNameError(
        error.message.includes("duplicate") ? "That name is already taken." : error.message
      );
      return;
    }

    setChannel(data);
    setEditingName(false);
  }

  async function handleDeleteChannel() {
    if (!channel) return;
    if (
      !window.confirm(
        `Delete the channel "${channel.name}" and everything on it (all videos, comments, likes)? This can't be undone.`
      )
    )
      return;

    setDeletingChannel(true);
    setDeleteError(null);

    const { error } = await supabase.from("channels").delete().eq("id", channel.id);

    if (error) {
      setDeletingChannel(false);
      setDeleteError(error.message);
      return;
    }

    router.push("/");
  }

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
          {editingName ? (
            <div style={{ marginBottom: 6 }}>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                style={{
                  background: "var(--void)",
                  border: "1px solid var(--hairline)",
                  color: "var(--bone)",
                  padding: "6px 10px",
                  borderRadius: 3,
                  fontSize: 20,
                  fontWeight: 700,
                  width: "100%",
                  maxWidth: 320,
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" type="button" onClick={handleRenameSave} disabled={nameSaving}>
                  {nameSaving ? "saving..." : "save"}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setEditingName(false);
                    setNameError(null);
                  }}
                  disabled={nameSaving}
                >
                  cancel
                </button>
              </div>
              {nameError && <p className="error-text">{nameError}</p>}
            </div>
          ) : (
            <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {channel.name}
              {canManage && (
                <button
                  className="btn"
                  type="button"
                  onClick={startEditingName}
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  {isOwner ? "rename" : "rename (admin)"}
                </button>
              )}
            </h1>
          )}
          <p className="channel-subs" style={{ marginBottom: 4 }}>
            @{channel.handle} · {subCount.toLocaleString()} subscribers
          </p>
          {avatarError && <p className="error-text">{avatarError}</p>}
        </div>
        <SubscribeButton channelId={channel.id} ownerId={channel.owner_id} user={user} />
        {canDelete && (
          <button
            className="btn"
            type="button"
            onClick={handleDeleteChannel}
            disabled={deletingChannel}
            style={{ color: "#c0392b" }}
          >
            {deletingChannel ? "deleting..." : isOwner ? "delete channel" : "delete channel (admin)"}
          </button>
        )}
      </div>
      {deleteError && (
        <div className="page" style={{ paddingTop: 0 }}>
          <p className="error-text">{deleteError}</p>
        </div>
      )}

      <div className="shell">
        <div className="tabs">
          <button
            type="button"
            className={`tab${tab === "videos" ? " active" : ""}`}
            onClick={() => setTab("videos")}
          >
            videos
          </button>
          <button
            type="button"
            className={`tab${tab === "about" ? " active" : ""}`}
            onClick={() => setTab("about")}
          >
            about
          </button>
        </div>
      </div>

      {tab === "videos" ? (
        <div className="page">
          {videos.length > 0 && (
            <div className="sort-bar" style={{ paddingTop: 0 }}>
              <p className="section-label" style={{ margin: 0 }} />
              <div className="segmented">
                <button
                  type="button"
                  className={sort === "newest" ? "active" : ""}
                  onClick={() => setSort("newest")}
                >
                  newest
                </button>
                <button
                  type="button"
                  className={sort === "popular" ? "active" : ""}
                  onClick={() => setSort("popular")}
                >
                  popular
                </button>
              </div>
            </div>
          )}
          {videos.length === 0 ? (
            <div className="empty">no clips on this channel yet.</div>
          ) : (
            <div className="grid">
              {sortedVideos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="page">
          <div className="panel" style={{ maxWidth: 560 }}>
            {channel.description ? (
              <p style={{ margin: 0, color: "var(--static)", lineHeight: 1.6 }}>{channel.description}</p>
            ) : (
              <p className="hint" style={{ margin: 0 }}>This channel hasn't added a description yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
