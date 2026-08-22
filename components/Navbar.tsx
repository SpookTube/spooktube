"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "../lib/useUser";
import { supabase } from "../lib/supabaseClient";
import SettingsModal from "./SettingsModal";

export default function Navbar() {
  const { user } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <header className="navbar">
        <div className="nav-left">
          <Link href="/" className="logo-brand">
            <span className="dot">●</span> SPÖÖK <span className="tag">TUBE</span>
          </Link>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              className="input search-input"
              placeholder="search clips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="nav-right">
          {user ? (
            <>
              <Link href="/upload" className="btn btn-primary">
                Upload
              </Link>
              <Link href="/my-channels" className="btn">
                My Channels
              </Link>
              <button
                type="button"
                className="btn"
                onClick={() => setIsSettingsOpen(true)}
                title="Settings"
              >
                ⚙️
              </button>
              <button type="button" className="btn" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}