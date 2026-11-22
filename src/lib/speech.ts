import { toast } from "sonner";

/**
 * Mandarin text-to-speech on top of window.speechSynthesis (the web stand-in for expo-speech).
 * Always speaks with lang "zh-CN". Voice choice: the user's saved preference (App Settings → Voice)
 * when this device has it, otherwise the best Mandarin voice, favouring natural/female ones. Warns
 * once per session when the OS has no Chinese voice at all.
 */

/** Per-user localStorage key holding the preferred voice's voiceURI (absent = automatic). */
export const TTS_VOICE_KEY = "tts_voice";

const LANG = "zh-CN";
const VOICES_TIMEOUT_MS = 2000;
const NO_VOICE_MESSAGE = "No Chinese voice found — install a Chinese voice in your OS for audio";

export interface SpeakCallbacks {
  /** Voice to use, by voiceURI. `null` = automatic; omitted = the user's saved preference. */
  voiceURI?: string | null;
  onStart?: () => void;
  /** The utterance played to the end. */
  onEnd?: () => void;
  /** Cancelled: by the handle, stopSpeech(), or another speak() call. */
  onStop?: () => void;
  /** The browser couldn't speak at all (unsupported, synthesis failed, no audio output...). */
  onError?: () => void;
}

export interface SpeakHandle {
  /** Cancels this utterance only; does nothing if another one has started since. */
  cancel: () => void;
}

interface ActiveUtterance {
  utterance: SpeechSynthesisUtterance;
  interrupted: boolean;
}

// Strong reference to the speaking utterance: Chrome can garbage-collect it mid-speech,
// which silently drops its end event.
let active: ActiveUtterance | null = null;
let pendingVoices: Promise<SpeechSynthesisVoice[]> | null = null;
let warnedNoChineseVoice = false;
// Signed-in user's saved voiceURI, pushed in by VoicePreferenceSync. null = automatic.
let preferredVoiceURI: string | null = null;

/** Sets the voice used by speak() when the caller doesn't pass one. null = automatic. */
export function setPreferredVoice(voiceURI: string | null): void {
  preferredVoiceURI = voiceURI || null;
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (typeof window.SpeechSynthesisUtterance === "undefined") return null;
  return window.speechSynthesis;
}

export function isSpeechSupported(): boolean {
  return getSynth() !== null;
}

/** Voices load asynchronously in most browsers; resolves on "voiceschanged" or after a timeout. */
function loadVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const voices = synth.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);

  pendingVoices ??= new Promise((resolve) => {
    const finish = () => {
      synth.removeEventListener("voiceschanged", onChange);
      clearTimeout(timer);
      pendingVoices = null; // An empty result is retried on the next call.
      resolve(synth.getVoices());
    };
    const onChange = () => {
      if (synth.getVoices().length > 0) finish();
    };
    synth.addEventListener("voiceschanged", onChange);
    const timer = setTimeout(finish, VOICES_TIMEOUT_MS);
  });
  return pendingVoices;
}

function normalizeLang(lang: string) {
  return lang.replace(/_/g, "-").toLowerCase();
}

/** Mandarin locales, best first. Cantonese (zh-HK, yue) matches none of them. */
const MANDARIN_LANG_RANK: Array<(lang: string) => boolean> = [
  (l) => l === "zh-cn",
  (l) => l.startsWith("cmn"),
  (l) => l === "zh-sg" || l === "zh-hans" || l.startsWith("zh-hans-"),
  (l) => l === "zh-tw" || l === "zh-hant" || l.startsWith("zh-hant-tw"),
  (l) => l === "zh",
];

function mandarinRank(voice: SpeechSynthesisVoice): number {
  const lang = normalizeLang(voice.lang);
  return MANDARIN_LANG_RANK.findIndex((matches) => matches(lang));
}

/**
 * Names of voices that are usually female or natural-sounding (Apple, Microsoft, Google). Phones
 * otherwise often default to a robotic or male voice.
 */
const PREFERRED_VOICE_NAME =
  /tingting|ting-ting|xiaoxiao|xiaoyi|meijia|mei-jia|lili|huihui|yaoyao|google\s*普通话|\bfemale\b/i;

/** Voices with the same name + locale are the same voice to the user (Android lists some twice). */
function voiceKey(voice: SpeechSynthesisVoice): string {
  return `${voice.name}|${normalizeLang(voice.lang)}`;
}

function rankedMandarinVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .map((voice) => ({ voice, rank: mandarinRank(voice) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => a.rank - b.rank) // Stable: keeps the browser's order within a locale.
    .map(({ voice }) => voice);
}

/**
 * The device's Mandarin voices, best locale first (zh-CN, then other Mandarin locales; Cantonese is
 * left out), one per name + locale: an offline (localService) copy wins, else the first one.
 * Voices load asynchronously, so this can be empty at first: see loadChineseVoices().
 */
export function listChineseVoices(
  voices: SpeechSynthesisVoice[] = getSynth()?.getVoices() ?? [],
): SpeechSynthesisVoice[] {
  const kept = new Map<string, SpeechSynthesisVoice>(); // Insertion order = ranking order.
  for (const voice of rankedMandarinVoices(voices)) {
    const key = voiceKey(voice);
    const current = kept.get(key);
    if (!current || (!current.localService && voice.localService)) kept.set(key, voice);
  }
  return [...kept.values()];
}

/**
 * The listed (de-duplicated) Mandarin voice for a saved voiceURI. A URI that belongs to a dropped
 * duplicate resolves to the kept voice with the same name + locale, so older choices keep working.
 */
export function findChineseVoice(
  voiceURI: string,
  voices: SpeechSynthesisVoice[] = getSynth()?.getVoices() ?? [],
): SpeechSynthesisVoice | undefined {
  const listed = listChineseVoices(voices);
  const exact = listed.find((v) => v.voiceURI === voiceURI);
  if (exact) return exact;
  const original = voices.find((v) => v.voiceURI === voiceURI);
  if (!original) return undefined;
  const key = voiceKey(original);
  return listed.find((v) => voiceKey(v) === key);
}

/** listChineseVoices() once the browser has loaded its voices (or given up after a timeout). */
export async function loadChineseVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = getSynth();
  return synth ? listChineseVoices(await loadVoices(synth)) : [];
}

/** Calls `callback` when the browser's voice list changes; returns the unsubscribe function. */
export function subscribeVoices(callback: () => void): () => void {
  const synth = getSynth();
  if (!synth) return () => {};
  synth.addEventListener("voiceschanged", callback);
  return () => synth.removeEventListener("voiceschanged", callback);
}

/** Chosen voice if this device has it; else a likely female/natural Mandarin voice; else the best locale. */
function pickChineseVoice(
  voices: SpeechSynthesisVoice[],
  voiceURI: string | null,
): SpeechSynthesisVoice | undefined {
  const mandarin = listChineseVoices(voices);
  return (
    (voiceURI ? findChineseVoice(voiceURI, voices) : undefined) ??
    mandarin.find((v) => PREFERRED_VOICE_NAME.test(v.name)) ??
    mandarin[0]
  );
}

function warnNoChineseVoice() {
  if (warnedNoChineseVoice) return;
  warnedNoChineseVoice = true;
  toast(NO_VOICE_MESSAGE);
}

/** Speaks `text` in Mandarin, cancelling anything already speaking. */
export function speak(text: string, callbacks: SpeakCallbacks = {}): SpeakHandle {
  const synth = getSynth();
  if (!synth || !text) {
    queueMicrotask(() => callbacks.onError?.());
    return { cancel: () => {} };
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG;
  const self: ActiveUtterance = { utterance, interrupted: false };
  let settled = false;

  const settle = (outcome: "end" | "stop" | "error") => {
    if (settled) return;
    settled = true;
    if (active === self) active = null;
    if (outcome === "end") callbacks.onEnd?.();
    else if (outcome === "stop") callbacks.onStop?.();
    else callbacks.onError?.();
  };

  utterance.onstart = () => callbacks.onStart?.();
  // Safari fires "end" (not an error) when cancelled, so the interrupted flag decides.
  utterance.onend = () => settle(self.interrupted ? "stop" : "end");
  utterance.onerror = (event) => {
    const cancelled =
      self.interrupted || event.error === "interrupted" || event.error === "canceled";
    settle(cancelled ? "stop" : "error");
  };

  const start = (voices: SpeechSynthesisVoice[]) => {
    if (self.interrupted) {
      settle("stop");
      return;
    }
    const voiceURI = callbacks.voiceURI === undefined ? preferredVoiceURI : callbacks.voiceURI;
    const voice = pickChineseVoice(voices, voiceURI);
    if (voice) utterance.voice = voice;
    else warnNoChineseVoice(); // Still try: lang alone may reach a usable voice.

    if (active) active.interrupted = true;
    synth.cancel();
    active = self;
    synth.speak(utterance);
  };

  // Speak synchronously when voices are ready: iOS Safari only allows speech inside the tap handler.
  const voices = synth.getVoices();
  if (voices.length > 0) start(voices);
  else void loadVoices(synth).then(start);

  return {
    cancel: () => {
      if (settled) return;
      self.interrupted = true;
      if (active === self) synth.cancel();
      // Not started yet (waiting on voices): start() sees the flag and settles as stopped.
    },
  };
}

/** Stops whatever is speaking. */
export function stopSpeech(): void {
  const synth = getSynth();
  if (!synth) return;
  if (active) active.interrupted = true;
  synth.cancel();
}
