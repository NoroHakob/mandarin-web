import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const serverAuthOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

/** Verifies a Supabase access token with the publishable key. Returns null if invalid. */
export async function getUserFromAccessToken(token: string): Promise<User | null> {
  const client = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serverAuthOptions,
  );
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

let admin: SupabaseClient | null = null;

/** Admin client using SUPABASE_SECRET_KEY — bypasses RLS. Server-only. */
export function getSupabaseAdmin(): SupabaseClient {
  admin ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireEnv("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
    serverAuthOptions,
  );
  return admin;
}
