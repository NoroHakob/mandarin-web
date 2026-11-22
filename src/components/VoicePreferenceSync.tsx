"use client";

import { useEffect } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import { useAuth } from "@/lib/auth";
import { setPreferredVoice, TTS_VOICE_KEY } from "@/lib/speech";

/**
 * Keeps speak()'s default voice in step with the signed-in user's saved choice. Signed out (or
 * nothing saved) → automatic. Renders nothing.
 */
export default function VoicePreferenceSync() {
  const userId = useAuth().user?.id;
  const saved = useStoredValue(TTS_VOICE_KEY, userId);

  useEffect(() => {
    setPreferredVoice(saved ?? null);
  }, [saved]);

  return null;
}
