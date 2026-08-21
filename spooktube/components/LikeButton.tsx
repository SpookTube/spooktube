"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import VcrCounter from "./VcrCounter";

export default function LikeButton({
  videoId,
  user,
  initialCount,
}: {
  videoId: string;
  user: User | null;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      setLiked(false);
      return;
    }
    supabase
      .from("likes")
      .select("video_id")
      .eq("video_id", videoId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [videoId, user]);

  async function toggle() {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(true);

    if (liked) {
      await supabase.from("likes").delete().eq("video_id", videoId).eq("user_id", user.id);
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("likes").insert({ video_id: videoId, user_id: user.id });
      setLiked(true);
      setCount((c) => c + 1);
    }
    setBusy(false);
  }

  return (
    <button className={`btn ${liked ? "btn-active" : ""}`} onClick={toggle} disabled={busy}>
      {liked ? "♥ Liked" : "♡ Like"} · <VcrCounter value={count} minDigits={1} />
    </button>
  );
}
