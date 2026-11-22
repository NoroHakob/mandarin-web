"use client";

import { useEffect, useRef, useState } from "react";
import { IoStopCircleOutline, IoVolumeHighOutline } from "react-icons/io5";
import { useStoredValue } from "@/hooks/useStoredValue";
import { useAuth } from "@/lib/auth";
import {
  isSpeechSupported,
  loadChineseVoices,
  speak,
  stopSpeech,
  subscribeVoices,
  TTS_VOICE_KEY,
  type SpeakHandle,
} from "@/lib/speech";
import { removeUserItem, writeUserItem } from "@/lib/storage";

const TEST_PHRASE = "你好，欢迎来到 Convo";
const AUTOMATIC = "";

/** The device's Mandarin voices; null until the browser has loaded its voice list. */
function useChineseVoices(): SpeechSynthesisVoice[] | null {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void loadChineseVoices().then((list) => {
        if (alive) setVoices(list);
      });
    };
    refresh();
    // Voices arrive asynchronously and can change (e.g. a voice finishes downloading).
    const unsubscribe = subscribeVoices(refresh);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return voices;
}

function InstallVoiceHelp() {
  return (
    <ul>
      <li>
        <strong>iPhone:</strong> Settings → Accessibility → Spoken Content → Voices → Chinese
        (China mainland), then download a voice. Reopen Safari afterwards.
      </li>
      <li>
        <strong>Android:</strong> Settings → search &ldquo;Text-to-speech&rdquo; → preferred engine
        settings (e.g. Speech Services by Google) → Install voice data → Chinese (Mandarin). Then
        restart the browser.
      </li>
    </ul>
  );
}

function RadioOption({
  value,
  checked,
  onSelect,
  label,
  detail,
}: {
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  label: string;
  detail: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 has-focus-visible:bg-[#f2f2f7]">
      <input
        type="radio"
        name="tts-voice"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="h-5 w-5 shrink-0 accent-accent"
      />
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold break-words">{label}</span>
        <span className="text-sm text-subdued">{detail}</span>
      </span>
    </label>
  );
}

export default function VoiceSettings() {
  const userId = useAuth().user?.id;
  const saved = useStoredValue(TTS_VOICE_KEY, userId) ?? null;
  const voices = useChineseVoices();
  const [isPlaying, setIsPlaying] = useState(false);
  const speechRef = useRef<SpeakHandle | null>(null);

  useEffect(() => () => speechRef.current?.cancel(), []);

  // The preference is per account but voices are per device: a voice saved on another device
  // falls back to automatic here (and is kept for when the user is back on that device).
  const savedAvailable = !!saved && !!voices?.some((v) => v.voiceURI === saved);
  const selected = savedAvailable ? saved : AUTOMATIC;

  const select = (value: string) => {
    stopSpeech();
    if (value === AUTOMATIC) removeUserItem(TTS_VOICE_KEY, userId);
    else writeUserItem(TTS_VOICE_KEY, userId, value);
  };

  const test = () => {
    if (isPlaying) {
      speechRef.current?.cancel();
      return;
    }
    const done = () => setIsPlaying(false);
    setIsPlaying(true);
    speechRef.current = speak(TEST_PHRASE, {
      voiceURI: selected || null,
      onEnd: done,
      onStop: done,
      onError: done,
    });
  };

  // `voices` is null until mounted, so the server render and first client render match.
  let body;
  if (voices === null) {
    body = <p className="text-subdued">Loading voices…</p>;
  } else if (!isSpeechSupported()) {
    body = (
      <p>
        This browser can&apos;t read text aloud. Try the latest Chrome or Safari to hear Chinese
        audio.
      </p>
    );
  } else if (voices.length === 0) {
    body = (
      <>
        <p>
          This device has no Chinese voice, so lessons can&apos;t be read aloud. To install one:
        </p>
        <InstallVoiceHelp />
      </>
    );
  } else {
    body = (
      <>
        <fieldset>
          <legend className="mb-3">
            Choose how Chinese is read aloud on this device. Automatic picks the most natural
            Mandarin voice available.
          </legend>
          <div className="overflow-hidden rounded-2xl border-2 border-border">
            <RadioOption
              value={AUTOMATIC}
              checked={selected === AUTOMATIC}
              onSelect={select}
              label="Automatic (recommended)"
              detail="Best available Mandarin voice"
            />
            {voices.map((voice) => (
              <RadioOption
                key={voice.voiceURI}
                value={voice.voiceURI}
                checked={selected === voice.voiceURI}
                onSelect={select}
                label={voice.name}
                detail={voice.lang}
              />
            ))}
          </div>
        </fieldset>

        {saved && !savedAvailable && (
          <p className="mt-3 text-sm text-subdued">
            The voice you chose on another device isn&apos;t available here, so Automatic is used.
          </p>
        )}

        {voices.length === 1 && (
          <p className="mt-3 text-sm text-subdued">
            This device has only one Chinese voice. To get more, install extra voices in your
            device settings.
          </p>
        )}

        <button
          type="button"
          onClick={test}
          className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-3xl border-2 border-border px-5 py-2.5 text-base font-semibold"
        >
          {isPlaying ? (
            <IoStopCircleOutline size={20} aria-hidden />
          ) : (
            <IoVolumeHighOutline size={20} aria-hidden />
          )}
          {isPlaying ? "Stop" : "Test"}
        </button>
        <p className="mt-2 text-center text-sm text-subdued" lang="zh-CN">
          {TEST_PHRASE}
        </p>
      </>
    );
  }

  return (
    <section>
      <h2>Voice</h2>
      {body}
    </section>
  );
}
