"use client";

import { useState } from "react";

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: `Watch ${title} on SpookTube!`,
      text: `Check out this clip on SpookTube: ${title}`,
      url: window.location.href,
    };

    // Use Web Share API if supported (mobile devices / modern browsers)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed silently
      }
    } else {
      // Fallback: Copy link to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-mono text-sm rounded flex items-center gap-2 transition-all active:scale-95"
    >
      <span>🔗</span>
      <span>{copied ? "COPIED LINK!" : "SHARE"}</span>
    </button>
  );
}