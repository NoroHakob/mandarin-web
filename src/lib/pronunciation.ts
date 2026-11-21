import { toast } from "sonner";
import { prepareSpeechWav } from "./audio";
import { supabase } from "./supabase";

// Moved to ./audio; re-exported so this module's API is unchanged.
export { containsSpeech, normalizeGain } from "./audio";

/**
 * Pronunciation check for a recorded answer: the recording is converted to WAV in the browser,
 * transcribed to pinyin by /api/transcribe-audio, then compared with the expected pinyin the same
 * way the reference app does. Any failure reports "unavailable" so the learner can self-assess.
 */

export type PronunciationResult =
  | { status: "unavailable" }
  /** Nothing was said (silent recording or empty transcript): not an attempt, just record again. */
  | { status: "no_speech" }
  | {
      status: "checked";
      isCorrect: boolean;
      /** What the recogniser heard, shown next to the expected pinyin. */
      transcript: string;
    };

const SIMILARITY_THRESHOLD = 0.8;
const UNAVAILABLE_MESSAGE = "Pronunciation check is unavailable right now";

let warnedUnavailable = false;

function unavailable(): PronunciationResult {
  if (!warnedUnavailable) {
    warnedUnavailable = true;
    toast(UNAVAILABLE_MESSAGE);
  }
  return { status: "unavailable" };
}

// --- Comparison (reference: LessonContent.processSpeechResult) -------------------------------------

// The reference's punctuation set, plus apostrophes (syllable separators like xī'ān) and
// full-width punctuation, which are separators rather than pronunciation.
const PUNCTUATION_RE = /[.,/#!$%^&*;:{}=\-_`~()?'’"“”。，、？！：；（）]/g;

export function normalizePinyin(text: string): string {
  return text.toLowerCase().replace(PUNCTUATION_RE, "").replace(/\s+/g, "").trim();
}

function bigrams(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const pair = text.substring(i, i + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

/**
 * Dice coefficient over character bigrams, 0–1. Same algorithm as string-similarity's
 * compareTwoStrings (whitespace removed; strings under two characters only match if identical).
 */
export function compareTwoStrings(first: string, second: string): number {
  const a = first.replace(/\s+/g, "");
  const b = second.replace(/\s+/g, "");
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const firstBigrams = bigrams(a);
  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const pair = b.substring(i, i + 2);
    const count = firstBigrams.get(pair) ?? 0;
    if (count > 0) {
      firstBigrams.set(pair, count - 1);
      intersection++;
    }
  }
  return (2 * intersection) / (a.length + b.length - 2);
}

/**
 * Pinyin with tones removed: tone marks and tone numbers dropped, ü written as "v"
 * (ü, u: and v all become "v"), plus the usual normalization.
 */
export function tonelessPinyin(text: string): string {
  return (
    normalizePinyin(text.toLowerCase().replace(/u:/g, "v"))
      .normalize("NFD")
      // ü decomposes to u + U+0308 (and ǖǘǚǜ add a tone mark after it): map it before dropping marks.
      .replace(/u\u0308/g, "v")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[1-5]/g, "")
  );
}

export function isPronunciationMatch(transcript: string, expectedPinyin: string): boolean {
  const said = normalizePinyin(transcript);
  const expected = normalizePinyin(expectedPinyin);
  if (!said || !expected) return false;
  if (compareTwoStrings(expected, said) >= SIMILARITY_THRESHOLD) return true;
  // Tone sandhi (nǐ hǎo is spoken ní hǎo) and neutral tones make transcribed tones differ from the
  // dictionary ones, so the same syllables with different tones still count as correct.
  return tonelessPinyin(said) === tonelessPinyin(expected);
}

// --- Check --------------------------------------------------------------------------------------

export async function checkPronunciation(audio: Blob, expectedPinyin: string): Promise<PronunciationResult> {
  try {
    // Silent recordings make the model invent words, so they're judged locally and never sent.
    const prepared = await prepareSpeechWav(audio);
    if (prepared.status === "no_speech") return { status: "no_speech" };

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return unavailable();

    const response = await fetch("/api/transcribe-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      // Only the learner's audio goes to the server, never the expected answer.
      body: JSON.stringify({ audio: prepared.base64, format: "wav" }),
    });
    // 429, 401, 413, 5xx: fall back to self-check.
    if (!response.ok) return unavailable();

    const body = (await response.json()) as { transcript?: unknown };
    if (typeof body.transcript !== "string") return unavailable();
    if (!normalizePinyin(body.transcript)) return { status: "no_speech" };

    return {
      status: "checked",
      isCorrect: isPronunciationMatch(body.transcript, expectedPinyin),
      transcript: body.transcript,
    };
  } catch {
    // Decode failure or network error. Deliberately not logged: it may concern the user's audio.
    return unavailable();
  }
}
