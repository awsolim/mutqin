"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseEnv } from "./config";

export function createClient() {
  const { url, anonKey } = assertSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
