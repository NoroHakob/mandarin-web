import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

type ProfileRow = {
  is_premium: boolean | null;
  premium_expires_at: string | null;
};

/** Same rule as hasActivePremium in src/lib/auth.tsx: flagged AND expiry in the future. */
function hasActivePremium(profile: ProfileRow | null): boolean {
  if (!profile?.is_premium || !profile.premium_expires_at) return false;
  return new Date(profile.premium_expires_at).getTime() > Date.now();
}

/**
 * Reads the user's premium state from the DB (never trust the client). Throws if the profile
 * can't be read, so callers can answer with a 5xx instead of a misleading 403.
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("is_premium,premium_expires_at")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();
  if (error) throw new Error("Profile read failed");
  return hasActivePremium(data);
}
