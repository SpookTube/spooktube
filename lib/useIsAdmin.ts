"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

// Relies entirely on RLS: the app_admins table only lets a user read
// their OWN row, and only you can insert rows into it (via SQL editor,
// not through the app). So this hook can't be tricked into reporting
// true for someone who isn't actually in that table.
export function useIsAdmin(user: User | null) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setIsAdmin(!!data);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, loading };
}
