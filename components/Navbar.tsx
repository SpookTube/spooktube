"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "../lib/useUser";
import { supabase } from "../lib/supabaseClient";

export default function Navbar() {
  const { user } = useUser();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/?q=${encodeURIComponent(query)}`);
    setMenuOpen(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="logo">
          <span className="logo-word">SPÖÖK</span>
          <span className="logo-pill">TUBE</span>
        </Link>

        <form className="nav-search" onSubmit={handleSearch}>
          <input
            placeholder="search clips..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="nav-actions">
          {user ? (
            <>
              <Link href="/upload" className="btn btn-primary">
                Upload
              </Link>
              <Link href="/my-channels" className="btn">
                My Channels
              </Link>
              <button className="btn btn-ghost" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn">
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="navbar-hamburger"
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          <form className="nav-search" onSubmit={handleSearch}>
            <input
              placeholder="search clips..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          <div className="mobile-menu-actions">
            {user ? (
              <>
                <Link href="/upload" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
                  Upload
                </Link>
                <Link href="/my-channels" className="btn" onClick={() => setMenuOpen(false)}>
                  My Channels
                </Link>
                <button className="btn btn-ghost" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn" onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
