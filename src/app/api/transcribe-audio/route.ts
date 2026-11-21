import { GeminiError, transcribeToPinyin } from "@/lib/gemini";
import { getUserFromAccessToken } from "@/lib/supabase-admin";

// Runs on the Node.js runtime (the default). `export const runtime` is rejected under cacheComponents.
// Never log audio, transcripts or tokens here — short error messages only.

/** ~1.5 MB of JSON. 16 kHz mono 16-bit WAV is ~43 KB/s once base64'd, so this is ~30 s of speech. */
const MAX_BODY_BYTES = 1_500_000;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  if (!match) return json({ error: "Unauthorized" }, 401);

  try {
    const user = await getUserFromAccessToken(match[1]);
    if (!user) return json({ error: "Unauthorized" }, 401);
  } catch {
    console.error("transcribe-audio: auth check failed");
    return json({ error: "Transcription failed" }, 502);
  }

  // Cheap rejection from the header first, then the real size of what was sent.
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "Audio too large" }, 413);

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Audio too large" }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { audio, format } = (body ?? {}) as { audio?: unknown; format?: unknown };
  if (typeof audio !== "string" || audio.length === 0 || !BASE64_RE.test(audio) || format !== "wav") {
    return json({ error: "Expected { audio: base64 string, format: \"wav\" }" }, 400);
  }

  try {
    const transcript = await transcribeToPinyin(audio);
    return json({ transcript });
  } catch (err) {
    if (err instanceof GeminiError && err.kind === "rate_limited") {
      console.error(`transcribe-audio: ${err.message}`);
      return json({ error: "Too many requests, try again later" }, 429);
    }
    console.error(`transcribe-audio: ${err instanceof GeminiError ? err.message : "unexpected error"}`);
    return json({ error: "Transcription failed" }, 502);
  }
}
