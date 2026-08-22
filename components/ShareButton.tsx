"use client";

import { useState } from "react";

interface ShareButtonProps {
  title: string;
  getVideoTime?: () => number;
}

export default function ShareButton({ title, getVideoTime }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [includeTime, setIncludeTime] = useState(false);

  const handleShare = async () => {
    let url = window.location.href.split("?")[0];
    if (includeTime && getVideoTime) {
      const time = Math.floor(getVideoTime());
      if (time > 0) url += `?t=${time}`;
    }

    const shareData = {
      title: `Watch ${title} on SpookTube!`,
      text: `Check out this clip on SpookTube: ${title}`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Share cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button type="button" className="btn" onClick={handleShare}>
        {copied ? "copied!" : "share"}
      </button>

      {getVideoTime && (
        <label style={{ fontSize: 12, color: "#888", cursor: "pointer", display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={includeTime}
            onChange={(e) => setIncludeTime(e.target.checked)}
          />
          at current time
        </label>
      )}
    </div>
  );
}