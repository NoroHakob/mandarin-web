import { toast } from "sonner";
import { supabase } from "./supabase";

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

const SAMPLE_RATE = 16_000;
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

// --- Silence detection --------------------------------------------------------------------------

/** Frame length for loudness measurement. */
const FRAME_MS = 20;
/** RMS (full scale = 1) above which a frame counts as speech. Room noise after browser noise suppression sits well below. */
const SPEECH_RMS = 0.02;
/** Less voiced audio than this in total is treated as silence. */
const MIN_SPEECH_MS = 150;
/** Recordings shorter than this are treated as silence. */
const MIN_RECORDING_MS = 300;

/** True if the mono PCM samples (−1…1) contain enough loud-enough audio to be speech. Pure. */
export function containsSpeech(samples: Float32Array, sampleRate: number): boolean {
  if ((samples.length / sampleRate) * 1000 < MIN_RECORDING_MS) return false;

  const frameSize = Math.max(1, Math.round((sampleRate * FRAME_MS) / 1000));
  const framesNeeded = Math.ceil(MIN_SPEECH_MS / FRAME_MS);
  let speechFrames = 0;

  for (let start = 0; start + frameSize <= samples.length; start += frameSize) {
    let sumSquares = 0;
    for (let i = start; i < start + frameSize; i++) sumSquares += samples[i] * samples[i];
    if (Math.sqrt(sumSquares / frameSize) > SPEECH_RMS && ++speechFrames >= framesNeeded) return true;
  }
  return false;
}

// --- Gain normalization -------------------------------------------------------------------------

/** Peak level quiet recordings are boosted to. */
const TARGET_PEAK = 0.9;
/** Cap on the boost, so a near-silent take (mostly noise) isn't blown up. */
const MAX_GAIN = 8;
/** Recordings already peaking at or above this are loud enough and left unscaled. */
const LOUD_ENOUGH_PEAK = 0.5;

/**
 * Removes DC offset, then boosts quiet audio so its peak is ~TARGET_PEAK (gain capped at MAX_GAIN).
 * Quiet speech is misheard far more often by the transcriber. Pure: returns a new array.
 */
export function normalizeGain(samples: Float32Array): Float32Array {
  const out = new Float32Array(samples.length);
  if (samples.length === 0) return out;

  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i];
  const mean = sum / samples.length;

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] - mean;
    peak = Math.max(peak, Math.abs(out[i]));
  }
  if (peak === 0 || peak >= LOUD_ENOUGH_PEAK) return out;

  const gain = Math.min(TARGET_PEAK / peak, MAX_GAIN);
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  return out;
}

// --- Audio conversion ---------------------------------------------------------------------------

/** Decodes any recorded format and resamples it to 16 kHz mono 16-bit PCM WAV. */
async function resampleTo16kMono(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void context.close().catch(() => {});
  }

  const length = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE));
  // A 1-channel destination down-mixes the source for us.
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000; // Stay well under the argument limit of String.fromCharCode.
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// --- Check --------------------------------------------------------------------------------------

export async function checkPronunciation(audio: Blob, expectedPinyin: string): Promise<PronunciationResult> {
  try {
    const samples = await resampleTo16kMono(audio);

    // Silent recordings make the model invent words, so they're judged locally and never sent.
    if (!containsSpeech(samples, SAMPLE_RATE)) return { status: "no_speech" };
    // Only the learner's audio goes to the server, never the expected answer.
    const wav = encodeWav(normalizeGain(samples), SAMPLE_RATE);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return unavailable();

    const response = await fetch("/api/transcribe-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ audio: toBase64(wav), format: "wav" }),
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
