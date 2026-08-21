"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { Comment } from "../lib/types";
import type { User } from "@supabase/supabase-js";

export default function CommentSection({ videoId, user }: { videoId: string; user: User | null }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setComments(data ?? []));
  }, [videoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!body.trim()) return;

    setPosting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ video_id: videoId, user_id: user.id, body: body.trim() })
      .select()
      .single();
    setPosting(false);

    if (!error && data) {
      setComments((prev) => [data, ...prev]);
      setBody("");
    }
  }

  return (
    <div className="comments">
      <h3>{comments.length} comments</h3>
      <form className="comment-form" onSubmit={handleSubmit}>
        <input
          placeholder={user ? "add a comment..." : "sign in to comment"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn btn-teal" type="submit" disabled={posting}>
          Post
        </button>
      </form>

      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <div className="comment-avatar" />
          <div>
            <p className="comment-body-text">{c.body}</p>
            <p className="comment-meta">{new Date(c.created_at).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
