"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

interface CommentSectionProps {
  videoId: string;
  user: any;
  onJumpToTime?: (seconds: number) => void;
}

// Converts "0:15" or "1:23" into clickable timestamp buttons
function renderCommentWithTimestamps(
  text: string,
  onJumpToTime?: (seconds: number) => void
) {
  if (!onJumpToTime) return text;

  const timeRegex = /\b(\d{1,2}):(\d{2})\b/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = timeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const totalSeconds = mins * 60 + secs;

    parts.push(
      <button
        key={match.index}
        type="button"
        onClick={() => onJumpToTime(totalSeconds)}
        style={{
          color: "#ff4444",
          background: "none",
          border: "none",
          padding: 0,
          font: "inherit",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        {match[0]}
      </button>
    );

    lastIndex = timeRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export default function CommentSection({
  videoId,
  user,
  onJumpToTime,
}: CommentSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComments() {
      const { data } = await supabase
        .from("comments")
        .select("*, channels(name, avatar_url)")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false });

      setComments(data || []);
      setLoading(false);
    }

    fetchComments();
  }, [videoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;

    // Fetch user's channel ID to associate comment
    const { data: channel } = await supabase
      .from("channels")
      .select("id, name, avatar_url")
      .eq("owner_id", user.id)
      .single();

    if (!channel) return;

    const { data, error } = await supabase
      .from("comments")
      .insert({
        video_id: videoId,
        channel_id: channel.id,
        content: text.trim(),
      })
      .select("*, channels(name, avatar_url)")
      .single();

    if (!error && data) {
      setComments([data, ...comments]);
      setText("");
    }
  }

  return (
    <div style={{ marginTop: 24, borderTop: "1px solid #222", paddingTop: 16 }}>
      <h3 style={{ fontSize: 16, marginBottom: 12 }}>Comments</h3>

      {user ? (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            className="input"
            placeholder="Add a comment... (use timestamps like 0:15)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn">
            Comment
          </button>
        </form>
      ) : (
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>Log in to comment.</p>
      )}

      {loading ? (
        <p style={{ color: "#666" }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={{ color: "#666" }}>No comments yet. Be the first to post!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "#333",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: "bold",
                  overflow: "hidden",
                }}
              >
                {c.channels?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.channels.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  c.channels?.name?.[0]?.toUpperCase() ?? "?"
                )}
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>{c.channels?.name ?? "User"}</p>
                <p style={{ fontSize: 14, color: "#fff", margin: "2px 0 0 0" }}>
                  {renderCommentWithTimestamps(c.content, onJumpToTime)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}