import { toast } from "sonner";

/**
 * Mandarin text-to-speech on top of window.speechSynthesis (the web stand-in for expo-speech).
 * Always speaks with lang "zh-CN"; picks a Chinese voice when the OS has one, and warns once
 * per session when it doesn't.
 */

const LANG = "zh-CN";
const VOICES_TIMEOUT_MS = 2000;
const NO_VOICE_MESSAGE = "No Chinese voice found — install a Chinese voice in your OS for audio";

export interface SpeakCallbacks {
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

/** Best Mandarin voice: zh-CN first, then other Mandarin locales. Cantonese (zh-HK, yue) is skipped. */
function pickChineseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const ranked: Array<(lang: string) => boolean> = [
    (l) => l === "zh-cn",
    (l) => l.startsWith("cmn"),
    (l) => l === "zh-sg" || l === "zh-hans" || l.startsWith("zh-hans-"),
    (l) => l === "zh-tw" || l === "zh-hant" || l.startsWith("zh-hant-tw"),
    (l) => l === "zh",
  ];
  for (const matches of ranked) {
    const voice = voices.find((v) => matches(normalizeLang(v.lang)));
    if (voice) return voice;
  }
  return undefined;
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
    const voice = pickChineseVoice(voices);
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
