/**
 * Browser-side speech audio preparation, shared by the pronunciation check and voice chat:
 * decode + resample to 16 kHz mono, silence detection, gain normalization, WAV encoding, base64.
 * Audio never leaves the browser from here and is never logged.
 */

export const SAMPLE_RATE = 16_000;

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

/** Decodes any recorded format (webm/opus, mp4, ogg…) and resamples it to 16 kHz mono PCM samples. */
export async function resampleTo16kMono(blob: Blob): Promise<Float32Array> {
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

export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
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

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000; // Stay well under the argument limit of String.fromCharCode.
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// --- Prepare ------------------------------------------------------------------------------------

export type PreparedSpeech = { status: "no_speech" } | { status: "ok"; base64: string };

/**
 * Recording → base64 16 kHz mono WAV, ready for the API. Silent recordings return "no_speech" and
 * must not be sent (the model invents words for silence). Throws if the audio can't be decoded.
 */
export async function prepareSpeechWav(blob: Blob): Promise<PreparedSpeech> {
  const samples = await resampleTo16kMono(blob);
  if (!containsSpeech(samples, SAMPLE_RATE)) return { status: "no_speech" };
  return { status: "ok", base64: toBase64(encodeWav(normalizeGain(samples), SAMPLE_RATE)) };
}
