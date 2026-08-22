"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Video } from "../../lib/types";
import VcrCounter from "../../components/VcrCounter";
import LikeButton from "../../components/LikeButton";
import SubscribeButton from "../../components/SubscribeButton";
import ShareButton from "../../components/ShareButton";
import CommentSection from "../../components/CommentSection";
import Link from "next/link";

export default function WatchPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideo() {
      if (!id) return;

      const { data, error } = await supabase
        .from("videos")
        .select("*, channel:channels(*)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching video:", error);
      } else {
        setVideo(data);
        
        // Increment view count
        await supabase
          .from("videos")
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq("id", id);
      }
      setLoading(false);
    }

    fetchVideo();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-amber-500 animate-pulse font-mono">LOADING VIDEO...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-red-500 font-mono">VIDEO NOT FOUND</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Video Player */}
      <div className="relative aspect-video w-full bg-black border-2 border-amber-900/50 rounded-lg overflow-hidden shadow-2xl mb-4">
        <video
          src={video.video_url}
          controls
          autoPlay
          className="w-full h-full object-contain"
        />
      </div>

      {/* Header Info Block */}
      <div className="flex flex-col gap-3">
        {/* Title & Share Button Header */}
        <div className="flex items-center justify-between w-full">
          <h1 className="text-2xl font-bold text-amber-500 tracking-wider">
            {video.title}
          </h1>
          <ShareButton videoId={video.id} title={video.title} />
        </div>

        {/* Channel Info & Video Stats Row */}
        <div className="flex items-center justify-between border-t border-amber-900/40 pt-3">
          <div className="flex items-center gap-4">
            <Link href={`/channel/${video.channel?.handle}`}>
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full border border-amber-500/50 overflow-hidden bg-zinc-900">
                  {video.channel?.avatar_url ? (
                    <img
                      src={video.channel.avatar_url}
                      alt={video.channel.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-500 font-bold">
                      {video.channel?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-amber-400 group-hover:underline">
                    {video.channel?.name}
                  </h3>
                  <p className="text-xs text-amber-500/70">
                    {video.channel?.subscriber_count || 0} subscribers
                  </p>
                </div>
              </div>
            </Link>
            <SubscribeButton channelId={video.channel_id} />
          </div>

          {/* Views & Likes */}
          <div className="flex items-center gap-4">
            <VcrCounter count={video.views_count} label="views" />
            <LikeButton videoId={video.id} initialLikes={video.likes_count} />
          </div>
        </div>

        {/* Description */}
        {video.description && (
          <div className="mt-2 p-4 bg-zinc-900/80 border border-amber-900/30 rounded-md text-amber-200/80 text-sm whitespace-pre-wrap">
            {video.description}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="mt-8 border-t border-amber-900/40 pt-6">
        <CommentSection videoId={video.id} />
      </div>
    </div>
  );
}