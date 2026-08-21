"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { Video } from "../lib/types";
import VideoCard from "../components/VideoCard";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="page empty">loading tapes...</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      let query = supabase
        .from("videos")
        .select("*, channels(*)")
        .order("created_at", { ascending: false });

      if (q) {
        query = query.ilike("title", `%${q}%`);
      }

      const { data: videoRows, error } = await query;
      if (error || !videoRows) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: stats } = await supabase
        .from("video_stats")
        .select("video_id, view_count, like_count");

      const statsMap = new Map((stats ?? []).map((s) => [s.video_id, s]));

      const merged = videoRows.map((v: any) => ({
        ...v,
        view_count: statsMap.get(v.id)?.view_count ?? 0,
        like_count: statsMap.get(v.id)?.like_count ?? 0,
      }));

      if (!cancelled) {
        setVideos(merged);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="page">
      {loading ? (
        <div className="empty">loading tapes...</div>
      ) : videos.length === 0 ? (
        <div className="empty">
          {q ? `no clips found for "${q}"` : "no clips uploaded yet. be the first."}
        </div>
      ) : (
        <div className="grid">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
