"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/data/supabase";

export type AuthState =
  { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; session: Session };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    void sb.auth.getSession().then(({ data }) => {
      if (alive)
        setState(data.session ? { status: "signed-in", session: data.session } : { status: "signed-out" });
    });
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      setState(session ? { status: "signed-in", session } : { status: "signed-out" });
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return state;
}
