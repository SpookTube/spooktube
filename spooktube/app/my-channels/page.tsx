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
      setError(error.message.includes("duplicate") ? "That handle is taken." : error.message);
      return;
    }

    setChannels((prev) => [data, ...prev]);
    setName("");
    setHandle("");
    setDescription("");
  }

  if (userLoading || loading) return <div className="page empty">loading...</div>;

  return (
    <div className="page">
      <h1 style={{ fontSize: 20 }}>My Channels</h1>

      {channels.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", marginBottom: 30 }}>
          {channels.map((c) => (
            <Link key={c.id} href={`/channel/${c.handle}`} className="panel" style={{ display: "block" }}>
              <p className="tape-title" style={{ margin: 0 }}>{c.name}</p>
              <p className="hint" style={{ margin: "4px 0 0" }}>@{c.handle}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="panel" style={{ maxWidth: 460 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Start a new channel</h2>
        <form onSubmit={handleCreate}>
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
    </div>
  );
}
