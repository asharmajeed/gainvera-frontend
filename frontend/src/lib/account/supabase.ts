import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AccountConfig } from "./config";
let browserClient: SupabaseClient | undefined;

/** Browser-only singleton. SDK owns persistence and refresh; no manually stored tokens. */
export function browserAuth(config: AccountConfig) {
  if (typeof window === "undefined") throw new Error("Authentication requires a browser.");
  browserClient ??= createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return browserClient.auth;
}
