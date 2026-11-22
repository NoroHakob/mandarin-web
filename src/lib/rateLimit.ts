import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Per-user limits, counted in Postgres (public.consume_rate_limit) so they hold across all
 * serverless instances. Windows are fixed and epoch-aligned (the daily one resets at UTC midnight).
 */
const LIMITS = {
  "transcribe-audio": { windowSeconds: 60 * 60, limit: 60 },
  "chat-completion": { windowSeconds: 60 * 60, limit: 120 },
  "scenario-generate": { windowSeconds: 24 * 60 * 60, limit: 10 },
} as const;

export type RateLimitBucket = keyof typeof LIMITS;

/**
 * Counts this request against the user's bucket. Returns true if it is allowed.
 * Fails open: if the check itself errors, the request is allowed (availability over strictness).
 */
export async function checkRateLimit(userId: string, bucket: RateLimitBucket): Promise<boolean> {
  const { windowSeconds, limit } = LIMITS[bucket];
  try {
    const { data, error } = await getSupabaseAdmin().rpc("consume_rate_limit", {
      p_user: userId,
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_limit: limit,
    });
    if (error || typeof data !== "boolean") throw new Error();
    return data;
  } catch {
    console.error("rate-limit: check failed");
    return true;
  }
}
