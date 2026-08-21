"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function SubscribeButton({
  channelId,
  ownerId,
  user,
}: {
  channelId: string;
  ownerId: string;
  user: User | null;
}) {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      setSubscribed(false);
      return;
    }
    supabase
      .from("subscriptions")
      .select("channel_id")
      .eq("channel_id", channelId)
      .eq("subscriber_id", user.id)
      .maybeSingle()
      .then(({ data }) => setSubscribed(!!data));
  }, [channelId, user]);

  if (user && user.id === ownerId) return null;

  async function toggle() {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(true);

    if (subscribed) {
      await supabase
        .from("subscriptions")
        .delete()
        .eq("channel_id", channelId)
        .eq("subscriber_id", user.id);
      setSubscribed(false);
    } else {
      await supabase
        .from("subscriptions")
        .insert({ channel_id: channelId, subscriber_id: user.id });
      setSubscribed(true);
    }
    setBusy(false);
  }

  return (
    <button className={`btn ${subscribed ? "btn-active" : "btn-teal"}`} onClick={toggle} disabled={busy}>
      {subscribed ? "Subscribed" : "Subscribe"}
    </button>
  );
}
