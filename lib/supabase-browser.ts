"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** Browser Supabase client for Realtime (anon key + RLS). */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  browserClient = createClient(url, key);
  return browserClient;
}
