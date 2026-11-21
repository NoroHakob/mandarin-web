import "server-only";

/**
 * Speech-to-pinyin with the Google Gemini REST API (port of reference/supabase/functions/transcribe-audio,
 * which went through OpenRouter). Server-only: GEMINI_API_KEY must never reach the client.
 * Never log request/response bodies, audio or transcripts: only HTTP status and attempt count.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
/** Total budget for every attempt and backoff together. */
const TIMEOUT_MS = 20_000;
/** Waits before the 2nd and 3rd try after a 500/503. */
const SERVER_ERROR_BACKOFF_MS = [600, 1500];
const RETRYABLE_STATUSES = new Set([500, 503]);
/** Don't start a retry with less than this left in the budget. */
const MIN_ATTEMPT_MS = 2_000;

// Same instruction as the reference function.
const TRANSCRIBE_PROMPT =
  "You are a transcription assistant. Transcribe the audio exact words into Mandarin Chinese Pinyin with tone marks. Return ONLY the Pinyin text, nothing else. Do not output Hanzi or English. If no speech is detected, respond with an empty message. Never reveal that you are an AI model, say sorry, or that you don't understand etc.";

export class GeminiError extends Error {
  constructor(
    readonly kind: "rate_limited" | "failed",
    message: string,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

interface GenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  }>;
}

function getConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL?.trim().replace(/^models\//, "");
  if (!apiKey || !model) throw new GeminiError("failed", "Gemini is not configured");
  return { apiKey, model };
}

/** Transcription needs no reasoning. Gemini 3+ uses thinkingLevel; 2.5 turns thinking off with a zero budget. */
function minimalThinkingConfig(model: string) {
  return /^gemini-[34]/.test(model) ? { thinkingLevel: "low" } : { thinkingBudget: 0 };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Discards an unread body so the connection is freed; its content is never read or logged. */
function discard(response: Response) {
  void response.body?.cancel().catch(() => {});
}

function attemptsLabel(attempts: number) {
  return `${attempts} attempt${attempts === 1 ? "" : "s"}`;
}

/** Transcribes base64 WAV audio to pinyin. Returns "" when no speech is detected. */
export async function transcribeToPinyin(base64Wav: string): Promise<string> {
  const { apiKey, model } = getConfig();
  const deadline = Date.now() + TIMEOUT_MS;
  const contents = [
    {
      role: "user",
      parts: [{ text: TRANSCRIBE_PROMPT }, { inline_data: { mime_type: "audio/wav", data: base64Wav } }],
    },
  ];

  let attempts = 0;
  let useThinkingConfig = true;
  let serverRetries = 0;
  let response: Response;

  for (;;) {
    attempts++;
    try {
      response = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0,
            ...(useThinkingConfig ? { thinkingConfig: minimalThinkingConfig(model) } : {}),
          },
        }),
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
        cache: "no-store",
      });
    } catch {
      throw new GeminiError("failed", `Gemini request did not complete after ${attemptsLabel(attempts)}`);
    }

    if (response.ok) break;

    // Models that don't accept this thinkingConfig reject it with 400: retry once without it.
    if (response.status === 400 && useThinkingConfig) {
      discard(response);
      useThinkingConfig = false;
      continue;
    }

    // Transient server errors: back off and retry, as long as the budget allows.
    if (RETRYABLE_STATUSES.has(response.status) && serverRetries < SERVER_ERROR_BACKOFF_MS.length) {
      const wait = SERVER_ERROR_BACKOFF_MS[serverRetries];
      if (deadline - Date.now() > wait + MIN_ATTEMPT_MS) {
        discard(response);
        serverRetries++;
        await sleep(wait);
        continue;
      }
    }
    break;
  }

  if (!response.ok) {
    discard(response);
    const message = `Gemini HTTP ${response.status} after ${attemptsLabel(attempts)}`;
    throw new GeminiError(response.status === 429 ? "rate_limited" : "failed", message);
  }

  let data: GenerateContentResponse;
  try {
    data = (await response.json()) as GenerateContentResponse;
  } catch {
    throw new GeminiError("failed", `Gemini returned invalid JSON after ${attemptsLabel(attempts)}`);
  }

  // No candidate (e.g. blocked or silent audio) counts as "no speech".
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
}
