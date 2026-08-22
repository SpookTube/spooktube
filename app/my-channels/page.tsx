"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "../../lib/useUser";
import { supabase } from "../../lib/supabaseClient";
import type { Channel } from "../../lib/types";

export default function MyChannelsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) router.push("/login");
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("channels")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setChannels(data ?? []);
        setLoading(false);
        if ((data ?? []).length === 0) setShowCreate(true);
      });
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    setCreating(true);

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const { data, error } = await supabase
      .from("channels")
      .insert({
        owner_id: user.id,
        name,
        handle: cleanHandle,
        description,
      })
      .select()
      .single();

    setCreating(false);

    if (error) {
      if (error.message.includes("channels_name_unique")) {
        setError("That channel name is already taken.");
      } else if (error.message.includes("duplicate")) {
        setError("That handle is taken.");
      } else {
        setError(error.message);
      }
      return;
    }

    setChannels((prev) => [data, ...prev]);
    setName("");
    setHandle("");
    setDescription("");
    setShowCreate(false);
  }

  if (userLoading || loading) return <div className="page empty">loading...</div>;

  return (
    <div className="page">
      <h1 style={{ fontSize: 20, marginBottom: 0 }}>My Channels</h1>

      <div className="channel-grid">
        {channels.map((c) => (
          <Link key={c.id} href={`/channel/${c.handle}`} className="channel-grid-card">
            <div className="channel-avatar">
              {c.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar_url} alt="" />
              ) : (
                c.name[0]?.toUpperCase()
              )}
            </div>
            <p className="channel-grid-name">{c.name}</p>
            <p className="channel-grid-handle">@{c.handle}</p>
          </Link>
        ))}

        {!showCreate && (
          <button type="button" className="new-channel-tile" onClick={() => setShowCreate(true)}>
            <span className="plus">+</span>
            <span>new channel</span>
          </button>
        )}
      </div>

      {showCreate && (
        <div className="panel" style={{ maxWidth: 460, marginTop: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 15, margin: 0 }}>Start a new channel</h2>
            {channels.length > 0 && (
              <button
                type="button"
                className="btn"
                style={{ padding: "4px 10px", fontSize: 11 }}
                onClick={() => {
                  setShowCreate(false);
                  setError(null);
                }}
              >
                cancel
              </button>
            )}
          </div>
          <form onSubmit={handleCreate} style={{ marginTop: 16 }}>
            <div className="field">
              <label>Channel name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Handle</label>
              <input
                required
                placeholder="e.g. crawlspace-clips"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
              <p className="hint">Your channel page will live at /channel/{handle || "your-handle"}</p>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "creating..." : "Create channel"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
