"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  IoAlertCircleOutline,
  IoBookOutline,
  IoCheckmarkCircleOutline,
  IoChevronBack,
  IoLockClosedOutline,
  IoVolumeHighOutline,
  IoWarningOutline,
} from "react-icons/io5";
import { toast } from "sonner";
import Ionicon from "@/components/Ionicon";
import type { ConversationScenario, PhrasebookEntry } from "@/lib/course";
import { speak, stopSpeech, type SpeakHandle } from "@/lib/speech";
import DifficultyBadge from "./DifficultyBadge";

const GUIDELINES = [
  { icon: IoWarningOutline, text: "No inappropriate conversations" },
  { icon: IoAlertCircleOutline, text: "Not intended for advice" },
  { icon: IoLockClosedOutline, text: "Don't share sensitive information" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-lg font-semibold text-text">{title}</h3>
      {children}
    </section>
  );
}

function PhrasebookRow({
  entry,
  playing,
  onToggle,
}: {
  entry: PhrasebookEntry;
  playing: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border p-4">
      <div className="min-w-0 flex-1">
        <p lang="zh-CN" className="mb-1 text-xl font-semibold text-text">
          {entry.hanzi}
        </p>
        <p className="text-subdued">{entry.pinyin}</p>
        <p className="text-subdued">{entry.english}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? `Stop playing ${entry.hanzi}` : `Play ${entry.hanzi}`}
        aria-pressed={playing}
        className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${
          playing ? "bg-accent text-white" : "bg-accent/10 text-accent hover:bg-accent/20"
        }`}
      >
        <IoVolumeHighOutline size={20} aria-hidden />
      </button>
    </li>
  );
}

/**
 * Port of the reference's scenario detail modal: scenario, guidelines, goal, tasks and a
 * phrasebook view, with Start at the bottom. Same fixed full-height pattern as CreateScenarioSheet.
 */
export default function ScenarioDetailSheet({
  scenario,
  onClose,
  onStart,
}: {
  scenario: ConversationScenario;
  onClose: () => void;
  onStart: () => void;
}) {
  const [isPhrasebookOpen, setIsPhrasebookOpen] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const speechRef = useRef<SpeakHandle | null>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const phrasebook = scenario.phrasebook ?? [];

  // Focus the sheet on open and give focus back to the card that opened it on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      stopSpeech();
      previouslyFocused?.focus();
    };
  }, []);

  // Switching views unmounts the focused button, so keep focus inside the sheet.
  useEffect(() => {
    backButtonRef.current?.focus();
  }, [isPhrasebookOpen]);

  const stopPlaying = () => {
    speechRef.current?.cancel();
    speechRef.current = null;
    setPlayingIndex(null);
  };

  const handleBack = () => {
    if (isPhrasebookOpen) {
      stopPlaying();
      setIsPhrasebookOpen(false);
      return;
    }
    onClose();
  };

  // Escape behaves like the back button (latest handler via ref, listener registered once).
  const handleBackRef = useRef(handleBack);
  useEffect(() => {
    handleBackRef.current = handleBack;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleBackRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const togglePlay = (index: number) => {
    if (playingIndex === index) {
      stopPlaying();
      return;
    }
    const clear = () => {
      setPlayingIndex((current) => (current === index ? null : current));
    };
    setPlayingIndex(index);
    speechRef.current = speak(phrasebook[index].hanzi, {
      onEnd: clear,
      onStop: clear,
      onError: () => {
        clear();
        toast.error("Couldn't play audio");
      },
    });
  };

  const openPhrasebook = () => {
    if (!phrasebook.length) {
      toast.error("No phrasebook available", {
        description: "This scenario doesn't have phrasebook entries yet.",
      });
      return;
    }
    setIsPhrasebookOpen(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-40 flex flex-col bg-white motion-safe:animate-sheet-up"
    >
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          ref={backButtonRef}
          type="button"
          onClick={handleBack}
          aria-label={isPhrasebookOpen ? "Back to scenario" : "Close"}
          className="-ml-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-text hover:bg-black/5"
        >
          <IoChevronBack size={24} aria-hidden />
        </button>
        <span className="text-base font-semibold text-text">
          {isPhrasebookOpen ? "Phrasebook" : ""}
        </span>
        <span className="w-10" aria-hidden />
      </header>

      {isPhrasebookOpen ? (
        <div key="phrasebook" className="min-h-0 flex-1 overflow-y-auto p-6">
          <h2 id={titleId} className="sr-only">
            {scenario.title} phrasebook
          </h2>
          <ul className="flex flex-col gap-3">
            {phrasebook.map((entry, idx) => (
              <PhrasebookRow
                key={`${entry.hanzi}-${idx}`}
                entry={entry}
                playing={playingIndex === idx}
                onToggle={() => togglePlay(idx)}
              />
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div key="scenario" className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mb-6 flex justify-center">
              <Ionicon name={scenario.icon} size={64} className="text-accent" />
            </div>
            <h2
              id={titleId}
              className="mb-3 text-center text-[32px] leading-tight font-bold text-text"
            >
              {scenario.title}
            </h2>
            <div className="mb-8 flex justify-center">
              <DifficultyBadge difficulty={scenario.difficulty} className="text-xs" />
            </div>

            <Section title="Scenario">
              <p className="text-subdued">{scenario.description}</p>
            </Section>

            <div className="mb-6 rounded-xl bg-[#FFFBEB] p-4">
              <h3 className="mb-2 font-semibold text-text">Free Talk Guidelines</h3>
              <ul>
                {GUIDELINES.map(({ icon: Icon, text }) => (
                  <li key={text} className="mt-2 flex items-center gap-2">
                    <Icon size={16} color="#F59E0B" className="shrink-0" aria-hidden />
                    <span className="flex-1 text-[13px] text-[#92400E]">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Section title="Goal">
              <p className="rounded-xl border border-border p-4 font-semibold text-text">
                {scenario.goal}
              </p>
            </Section>

            <Section title="Tasks">
              <ul className="flex flex-col gap-2">
                {scenario.tasks.map((task, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 rounded-xl border border-border p-4 text-text"
                  >
                    <IoCheckmarkCircleOutline size={20} className="shrink-0 text-subdued" aria-hidden />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <button
              type="button"
              onClick={openPhrasebook}
              className="mb-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-text/[0.06] p-4 font-semibold text-accent hover:bg-text/[0.1]"
            >
              <IoBookOutline size={20} aria-hidden />
              View Phrasebook
            </button>
          </div>

          <footer className="shrink-0 border-t border-border p-5">
            <button
              type="button"
              onClick={onStart}
              className="w-full cursor-pointer rounded-xl bg-accent p-4 text-lg font-bold text-white transition-transform active:scale-[0.99]"
            >
              Start conversation
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
