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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/?q=${encodeURIComponent(query)}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="logo">
          SPOOKTUBE
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
      </div>
    </div>
  );
}
