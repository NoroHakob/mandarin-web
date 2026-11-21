/**
 * Pronunciation check for a recorded answer. Step 8b plugs in real speech recognition;
 * until then it always reports "unavailable" and the learner self-assesses.
 */

export type PronunciationResult =
  | { status: "unavailable" }
  | {
      status: "checked";
      isCorrect: boolean;
      /** What the recogniser heard, shown next to the expected pinyin. */
      transcript: string;
    };

export async function checkPronunciation(
  audio: Blob,
  expectedPinyin: string,
): Promise<PronunciationResult> {
  // Not used yet; the audio never leaves the browser in this step.
  void audio;
  void expectedPinyin;
  return { status: "unavailable" };
}
