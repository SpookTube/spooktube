"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "../lib/useUser";
import { supabase } from "../lib/supabaseClient";
import SettingsModal from "./SettingsModal";

export default function Navbar() {
  const { user } = useUser();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
        </div>

        <div className="nav-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                style={{ padding: "6px 10px" }}
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