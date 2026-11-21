/**
 * Microphone recording with MediaRecorder + getUserMedia. Audio stays in memory as a Blob;
 * nothing here uploads or logs it.
 */

export type RecorderErrorKind = "permission-denied" | "no-microphone" | "unsupported" | "unknown";

export class RecorderError extends Error {
  constructor(
    readonly kind: RecorderErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "RecorderError";
  }
}

export interface ActiveRecording {
  /** Live input levels for a waveform; null if Web Audio isn't available. */
  analyser: AnalyserNode | null;
  /** Stops recording, releases the mic and resolves with the recorded audio. */
  stop: () => Promise<Blob>;
  /** Stops recording and releases the mic, discarding the audio. Safe to call more than once. */
  cancel: () => void;
}

// First supported wins. Safari only records audio/mp4.
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function toRecorderError(err: unknown): RecorderError {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return new RecorderError(
        "permission-denied",
        "Microphone access is blocked. Allow it in your browser's site settings, then tap the mic again.",
      );
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return new RecorderError("no-microphone", "No microphone was found. Connect one and try again.");
    case "NotReadableError":
    case "TrackStartError":
      return new RecorderError(
        "unknown",
        "Your microphone is busy in another app. Close it there and try again.",
      );
    default:
      return new RecorderError("unknown", "Could not start recording. Please try again.");
  }
}

function createAnalyser(stream: MediaStream): { analyser: AnalyserNode; close: () => void } | null {
  try {
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.6;
    // Not connected to the destination, so the user doesn't hear themselves.
    context.createMediaStreamSource(stream).connect(analyser);
    return { analyser, close: () => void context.close().catch(() => {}) };
  } catch {
    return null;
  }
}

/** Asks for the mic (prompting if needed) and starts recording. Throws RecorderError. */
export async function startRecording(): Promise<ActiveRecording> {
  if (!isRecordingSupported()) {
    throw new RecorderError("unsupported", "This browser can't record audio. Try a recent Chrome, Edge, Firefox or Safari.");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (err) {
    throw toRecorderError(err);
  }

  let recorder: MediaRecorder;
  try {
    const mimeType = pickMimeType();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch (err) {
    stream.getTracks().forEach((track) => track.stop());
    throw toRecorderError(err);
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const meter = createAnalyser(stream);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    stream.getTracks().forEach((track) => track.stop());
    meter?.close();
  };

  const toBlob = () => new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || "audio/webm" });

  recorder.start();

  return {
    analyser: meter?.analyser ?? null,
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        if (recorder.state === "inactive") {
          release();
          resolve(toBlob());
          return;
        }
        recorder.onstop = () => {
          release();
          resolve(toBlob());
        };
        recorder.onerror = () => {
          release();
          reject(new RecorderError("unknown", "Recording failed. Please try again."));
        };
        recorder.stop();
      }),
    cancel: () => {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
      chunks.length = 0;
      release();
    },
  };
}
