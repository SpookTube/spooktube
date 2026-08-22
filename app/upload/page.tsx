"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "../../lib/useUser";
import { supabase } from "../../lib/supabaseClient";
import type { Channel } from "../../lib/types";
import ContentWarningBadge from "../../components/ContentWarningBadge";

const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_THUMB_BYTES = 3 * 1024 * 1024; // 3MB

const WARNING_PRESETS = [
  "jump scares",
  "gore",
  "flashing lights",
  "body horror",
  "loud noises",
  "insects",
  "needles",
  "blood",
];

export default function UploadPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedWarnings, setSelectedWarnings] = useState<string[]>([]);
  const [customWarning, setCustomWarning] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const contentWarning = useMemo(() => {
    const custom = customWarning
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);
    return [...selectedWarnings, ...custom].join(", ");
  }, [selectedWarnings, customWarning]);

  function toggleWarning(w: string) {
    setSelectedWarnings((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
  }

  const selectedChannel = channels.find((c) => c.id === channelId);

  useEffect(() => {
    if (!userLoading && !user) router.push("/login");
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("channels")
      .select("*")
      .eq("owner_id", user.id)
      .then(({ data }) => setChannels(data ?? []));
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) return;
    if (!file) {
      setError("Pick a video file first.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("That file is over the 10MB limit.");
      return;
    }
    if (!channelId) {
      setError("Choose which channel this is going on.");
      return;
    }

    setSubmitting(true);
    setStatus("uploading video file...");

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(path, file);

    if (uploadError) {
      setSubmitting(false);
      setStatus(null);
      setError(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);

    let thumbnailUrl: string | null = null;
    if (thumbFile) {
      setStatus("uploading thumbnail...");
      const thumbExt = thumbFile.name.split(".").pop();
      const thumbPath = `${user.id}/${crypto.randomUUID()}-thumb.${thumbExt}`;

      const { error: thumbError } = await supabase.storage
        .from("videos")
        .upload(thumbPath, thumbFile);

      if (thumbError) {
        setSubmitting(false);
        setStatus(null);
        setError(thumbError.message);
        return;
      }

      thumbnailUrl = supabase.storage.from("videos").getPublicUrl(thumbPath).data.publicUrl;
    }

    setStatus("saving details...");

    const { data: video, error: insertError } = await supabase
      .from("videos")
      .insert({
        channel_id: channelId,
        title,
        description,
        content_warning: contentWarning.trim(),
        video_url: urlData.publicUrl,
        thumbnail_url: thumbnailUrl,
      })
      .select()
      .single();

    setSubmitting(false);
    setStatus(null);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/watch/${video.id}`);
  }

  if (userLoading) return <div className="page empty">loading...</div>;

  if (channels.length === 0) {
    return (
      <div className="page">
        <div className="panel" style={{ maxWidth: 460 }}>
          <p>You need a channel before you can upload.</p>
          <Link href="/my-channels" className="btn btn-primary">
            Create a channel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>Upload a clip</h1>
      <div className="upload-layout">
        <div className="panel">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Channel</label>
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)} required>
                <option value="">choose a channel</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Video file</label>
              <input
                type="file"
                accept="video/*"
                required
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > MAX_VIDEO_BYTES) {
                    setError(`That file is ${(f.size / (1024 * 1024)).toFixed(1)}MB — 10MB max.`);
                    setFile(null);
                    e.target.value = "";
                    return;
                  }
                  setError(null);
                  setFile(f);
                  setFilePreview(f ? URL.createObjectURL(f) : null);
                }}
              />
              <p className="hint">10MB max per clip.</p>
            </div>
            <div className="field">
              <label>Thumbnail (optional)</label>
              <label className="thumb-picker">
                {thumbPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbPreview} alt="" />
                ) : (
                  <span className="thumb-picker-label">click to choose an image</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && f.size > MAX_THUMB_BYTES) {
                      setError(`That image is ${(f.size / (1024 * 1024)).toFixed(1)}MB — 3MB max.`);
                      e.target.value = "";
                      return;
                    }
                    setError(null);
                    setThumbFile(f);
                    setThumbPreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </label>
              <p className="hint">Leave blank to use a frame from the video instead.</p>
            </div>
            <div className="field">
              <label>Title</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Content warning (optional)</label>
              <div className="cw-chips">
                {WARNING_PRESETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`cw-chip${selectedWarnings.includes(w) ? " active" : ""}`}
                    onClick={() => toggleWarning(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <input
                placeholder="other, comma-separated"
                value={customWarning}
                onChange={(e) => setCustomWarning(e.target.value)}
              />
              <p className="hint">Leave everything blank if the clip doesn't need one — shown as a badge on the thumbnail otherwise.</p>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {status ?? (submitting ? "working..." : "Publish")}
            </button>
          </form>
        </div>

        <div className="upload-preview">
          <p className="section-label">preview</p>
          <div className="tape-card" style={{ pointerEvents: "none" }}>
            <div className="tape-thumb">
              {thumbPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbPreview} alt="" />
              ) : filePreview ? (
                <video src={filePreview} muted preload="metadata" />
              ) : (
                <span className="thumb-picker-label">thumbnail preview</span>
              )}
              <ContentWarningBadge text={contentWarning} />
            </div>
            <div className="tape-meta">
              <p className="tape-title">{title || "untitled clip"}</p>
              <p className="tape-channel">{selectedChannel?.name ?? "choose a channel"}</p>
              <p className="tape-stats">0 views · 0 likes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
