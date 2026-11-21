import { getSupabaseAdmin, getUserFromAccessToken } from "@/lib/supabase-admin";

// Runs on the Node.js runtime (the default). `export const runtime` is rejected under cacheComponents.

const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  if (!match) return json({ error: "Unauthorized" }, 401);

  try {
    const user = await getUserFromAccessToken(match[1]);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = getSupabaseAdmin();

    const { data: profile, error: readError } = await admin
      .from("profiles")
      .select("premium_expires_at")
      .eq("id", user.id)
      .maybeSingle<{ premium_expires_at: string | null }>();
    if (readError) {
      console.error("start-trial: profile read failed");
      return json({ error: "Could not start trial" }, 500);
    }

    // One trial per user: any previous premium period means the trial is used up.
    if (profile?.premium_expires_at) return json({ error: "Trial already used" }, 409);

    const now = Date.now();
    const premiumExpiresAt = new Date(now + TRIAL_MS).toISOString();

    const { error: writeError } = await admin.from("profiles").upsert({
      id: user.id,
      is_premium: true,
      premium_expires_at: premiumExpiresAt,
      updated_at: new Date(now).toISOString(),
    });
    if (writeError) {
      console.error("start-trial: profile update failed");
      return json({ error: "Could not start trial" }, 500);
    }

    return json({ premium_expires_at: premiumExpiresAt });
  } catch {
    console.error("start-trial: unexpected error");
    return json({ error: "Could not start trial" }, 500);
  }
}
