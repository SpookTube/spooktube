"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

interface CommentSectionProps {
  videoId: string;
  user: any;
  channelOwnerId?: string;
  isAdmin?: boolean;
  onJumpToTime?: (seconds: number) => void;
}

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
          color: "#ff8c00",
          background: "none",
          border: "none",
          padding: 0,
          font: "inherit",
          cursor: "pointer",
          textDecoration: "underline",
          fontWeight: "bold",
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
  channelOwnerId,
  isAdmin,
  onJumpToTime,
}: CommentSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchComments() {
      const { data: rawComments, error } = await supabase
        .from("comments")
        .select("*")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false });

      if (error || !rawComments) {
        if (!cancelled) {
          setComments([]);
          setLoading(false);
        }
        return;
      }

      // Comments are tied to the commenter's user_id, not a channel — look
      // up whichever channel (if any) each commenter owns, so we can show
      // their channel name/avatar instead of a raw user id.
      const userIds = Array.from(new Set(rawComments.map((c) => c.user_id).filter(Boolean)));

      let channelByUser: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: channelsData } = await supabase
          .from("channels")
          .select("owner_id, name, avatar_url")
          .in("owner_id", userIds);

        if (channelsData) {
          for (const ch of channelsData) {
            // if a user owns more than one channel, first match wins
            if (!channelByUser[ch.owner_id]) channelByUser[ch.owner_id] = ch;
          }
        }
      }

      const formatted = rawComments.map((c) => ({
        ...c,
        author: channelByUser[c.user_id] || null,
      }));

      if (!cancelled) {
        setComments(formatted);
        setLoading(false);
      }
    }

    fetchComments();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;

    const { data, error } = await supabase
      .from("comments")
      .insert({
        video_id: videoId,
        user_id: user.id,
        body: text.trim(),
      })
      .select("*")
      .single();

    if (!error && data) {
      // Reuse author info from an earlier comment by this same user if we
      // already have it loaded, so it doesn't flash "Anonymous" briefly.
      const existingAuthor = comments.find((c) => c.user_id === user.id)?.author ?? null;
      setComments([{ ...data, author: existingAuthor }, ...comments]);
      setText("");
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm("Delete this comment?")) return;
    setDeletingId(commentId);

    const { error } = await supabase.from("comments").delete().eq("id", commentId);

    setDeletingId(null);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  function canDelete(comment: any) {
    if (!user) return false;
    if (comment.user_id === user.id) return true; // own comment
    if (channelOwnerId && user.id === channelOwnerId) return true; // video owner
    if (isAdmin) return true; // admin
    return false;
  }

  return (
    <div className="comments-section" style={{ marginTop: 32, borderTop: "1px solid #222", paddingTop: 20 }}>
      <h3 style={{ fontSize: 18, marginBottom: 16 }}>Comments</h3>

      {user ? (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <input
            type="text"
            className="input"
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ flex: 1, backgroundColor: "#0a0a0a", border: "1px solid #333", color: "#fff", padding: "10px 14px", borderRadius: 4 }}
          />
          <button type="submit" className="btn btn-primary">
            Comment
          </button>
        </form>
      ) : (
        <p style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>Log in to post a comment.</p>
      )}

      {loading ? (
        <p style={{ color: "#666" }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={{ color: "#666" }}>No comments yet. Be the first to post!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#0d0d0d", padding: 12, borderRadius: 6, border: "1px solid #1a1a1a" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "#222",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: "bold",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {c.author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.author.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  c.author?.name?.[0]?.toUpperCase() ?? "?"
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: "#888", margin: 0, fontWeight: 600 }}>
                  {c.author?.name ?? "Anonymous"}
                </p>
                <p style={{ fontSize: 14, color: "#eee", margin: "4px 0 0 0", lineHeight: 1.4 }}>
                  {renderCommentWithTimestamps(c.body, onJumpToTime)}
                </p>
              </div>
              {canDelete(c) && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c0392b",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    padding: "4px 6px",
                    flexShrink: 0,
                  }}
                >
                  {deletingId === c.id ? "..." : "delete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
