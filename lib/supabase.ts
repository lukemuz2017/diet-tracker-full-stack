import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The browser's Supabase client. Both values are public by design (they ship
// to every visitor); what protects the data is row-level security, which
// reads the Clerk session token passed as `accessToken` on every request.
export function supabaseFor(getToken: () => Promise<string | null>): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  }
  return createClient(url, key, { accessToken: getToken });
}
