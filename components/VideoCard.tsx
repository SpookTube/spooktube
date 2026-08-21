import Link from "next/link";
import type { Video } from "../lib/types";
import ContentWarningBadge from "./ContentWarningBadge";

export default function VideoCard({ video }: { video: Video }) {
  return (
    <Link href={`/watch/${video.id}`} className="tape-card">
      <div className="tape-thumb">
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail_url} alt="" />
        ) : (
          <video src={video.video_url} muted preload="metadata" />
        )}
        <ContentWarningBadge text={video.content_warning} />
      </div>
      <div className="tape-meta">
        <p className="tape-title">{video.title}</p>
        <p className="tape-channel">{video.channels?.name ?? "unknown channel"}</p>
        <p className="tape-stats">
          {(video.view_count ?? 0).toLocaleString()} views · {(video.like_count ?? 0).toLocaleString()} likes
        </p>
      </div>
    </Link>
  );
}
