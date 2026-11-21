"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase client, or null when the project isn't configured.
 * The board works fully without it; results just stay on the board.
 * Only the public URL and public (anon / publishable) key are used here.
 * Row level security in the database decides what each signed in teacher can see.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    url && key && typeof window !== "undefined"
      ? createClient(url, key, {
          auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        })
      : null;
  return client;
}

export const supabaseConfigured = () => Boolean(url && key);
