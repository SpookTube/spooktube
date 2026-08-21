"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import type { Channel, Video } from "../lib/types";
import VideoCard from "../components/VideoCard";

type TopChannel = Channel & { subscriber_count: number };

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
  const [topChannels, setTopChannels] = useState<TopChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTopChannels() {
      const [{ data: channels }, { data: stats }] = await Promise.all([
        supabase.from("channels").select("*"),
        supabase.from("channel_stats").select("channel_id, subscriber_count"),
      ]);

      if (cancelled || !channels) return;

      const statsMap = new Map((stats ?? []).map((s) => [s.channel_id, s.subscriber_count]));
      const merged = channels
        .map((c: Channel) => ({ ...c, subscriber_count: statsMap.get(c.id) ?? 0 }))
        .sort((a, b) => b.subscriber_count - a.subscriber_count)
        .slice(0, 12);

      setTopChannels(merged);
    }

    loadTopChannels();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div>
      {topChannels.length > 0 && !q && (
        <div className="shell">
          <div className="top-channels">
            {topChannels.map((c) => (
              <Link key={c.id} href={`/channel/${c.handle}`} className="top-channel-card">
                <div className="channel-avatar">
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt="" />
                  ) : (
                    c.name[0]?.toUpperCase()
                  )}
                </div>
                <p className="top-channel-name">{c.name}</p>
                <p className="top-channel-subs">{c.subscriber_count.toLocaleString()} subs</p>
              </Link>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
