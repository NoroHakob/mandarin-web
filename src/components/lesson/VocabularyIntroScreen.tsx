"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Question, Word } from "@/lib/course";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Flashcard, { type FlashcardDirection } from "./Flashcard";
import ProgressHeader from "./ProgressHeader";

interface StudyCard {
  key: string;
  word: Word;
  direction: FlashcardDirection;
}

type StudyPhase = "recognition" | "recall";

interface StudyState {
  phase: StudyPhase;
  queue: string[];
  recallKeys: string[];
  cards: Record<string, StudyCard>;
  total: number;
  completed: number;
  /** Increments on every grade so the flashcard remounts (and unflips) even when the same card repeats. */
  step: number;
}

type Grade = "again" | "good";

/** Unique words by hanzi: listening questions use the prompt's words, others every option's words. */
function getUniqueWords(questions: Question[]): Word[] {
  const allWords = new Map<string, Word>();
  for (const question of questions) {
    const wordSource =
      question.type === "listening_mc"
        ? question.mandarin.words
        : question.options.flatMap((opt) => opt.mandarin.words);

    for (const word of wordSource) {
      if (word?.hanzi && !allWords.has(word.hanzi)) allWords.set(word.hanzi, word);
    }
  }
  return Array.from(allWords.values());
}

function initializeStudyState(words: Word[]): StudyState {
  const recognition: StudyCard[] = words.map((word) => ({
    key: `${word.hanzi}-recognition`,
    word,
    direction: "zh-en",
  }));
  const recall: StudyCard[] = words.map((word) => ({
    key: `${word.hanzi}-recall`,
    word,
    direction: "en-zh",
  }));

  const cards: Record<string, StudyCard> = {};
  for (const card of [...recognition, ...recall]) cards[card.key] = card;

  return {
    phase: "recognition",
    queue: recognition.map((c) => c.key),
    recallKeys: recall.map((c) => c.key),
    cards,
    total: recognition.length + recall.length,
    completed: 0,
    step: 0,
  };
}

/** "Again" re-inserts the card two places back; "Got it" counts it done. Recall starts when recognition empties. */
function gradeCard(prev: StudyState, grade: Grade): StudyState {
  if (!prev.queue.length) return prev;

  const [activeKey, ...rest] = prev.queue;
  let queue = rest;
  let { completed, phase, recallKeys } = prev;

  if (!prev.cards[activeKey]) {
    // Unknown key: drop it.
  } else if (grade === "again") {
    queue.splice(Math.min(2, queue.length), 0, activeKey);
  } else {
    completed = Math.min(prev.total, completed + 1);
  }

  if (queue.length === 0 && phase === "recognition" && recallKeys.length > 0) {
    queue = [...recallKeys];
    recallKeys = [];
    phase = "recall";
  }

  return { ...prev, queue, completed, phase, recallKeys, step: prev.step + 1 };
}

function isFinished(state: StudyState) {
  return state.queue.length === 0 && state.recallKeys.length === 0 && state.completed >= state.total;
}

export default function VocabularyIntroScreen({
  questions,
  onStartLesson,
}: {
  questions: Question[];
  onStartLesson: () => void;
}) {
  const router = useRouter();
  // Lazy init: the parent keys this component by lesson, so questions are fixed for its lifetime.
  const [state, setState] = useState(() => initializeStudyState(getUniqueWords(questions)));
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);

  // Nothing to study: go straight to the lesson.
  const isEmpty = state.total === 0;
  useEffect(() => {
    if (isEmpty) onStartLesson();
  }, [isEmpty, onStartLesson]);

  const handleGrade = (grade: Grade) => {
    const next = gradeCard(state, grade);
    setState(next);
    if (isFinished(next)) onStartLesson();
  };

  // Stable so the dialog's Escape listener isn't re-attached on every render.
  const closeExitConfirm = useCallback(() => setExitConfirmVisible(false), []);

  if (isEmpty) return null;

  const progressPercent = (state.completed / state.total) * 100;
  const currentKey = state.queue[0];
  const currentCard = currentKey ? state.cards[currentKey] : undefined;
  const headerCount = currentCard ? Math.min(state.completed + 1, state.total) : state.completed;

  return (
    <div className="flex h-full flex-col">
      <ConfirmDialog
        visible={exitConfirmVisible}
        title="Exit practise"
        description="Are you sure you want to exit? Your progress will be lost."
        cancelLabel="Cancel"
        confirmLabel="Exit"
        destructive
        onCancel={closeExitConfirm}
        onConfirm={() => {
          setExitConfirmVisible(false);
          router.replace("/lessons");
        }}
      />
      <ProgressHeader
        progress={progressPercent}
        currentCount={headerCount}
        totalCount={state.total}
        onClose={() => setExitConfirmVisible(true)}
      />

      <main className="flex min-h-0 flex-1 flex-col px-5 pt-[30px]">
        <div className="mb-6 shrink-0 px-2 text-center">
          <h1 className="mb-1.5 text-2xl font-bold text-text">Lesson Vocabulary</h1>
          <p className="text-[15px] leading-[22px] text-subdued">
            Tap to flip. Retry cards you still need to review.
          </p>
        </div>

        <div className="mb-3 flex min-h-0 w-full flex-1 items-center justify-center">
          {currentCard ? (
            <Flashcard
              key={`${currentCard.key}-${state.step}`}
              word={currentCard.word}
              direction={currentCard.direction}
            />
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-4 pt-4 pb-[env(safe-area-inset-bottom)]">
          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={() => handleGrade("again")}
              disabled={!currentCard}
              className="flex-1 cursor-pointer rounded-[14px] border-2 border-[#d1d5db] bg-[#f3f4f6] py-4 text-[17px] font-semibold text-[#374151] transition active:scale-[0.98] active:opacity-70 disabled:cursor-default disabled:opacity-40 disabled:active:scale-100"
            >
              Again
            </button>
            <button
              type="button"
              onClick={() => handleGrade("good")}
              disabled={!currentCard}
              className="flex-1 cursor-pointer rounded-[14px] border-2 border-accent bg-accent py-4 text-[17px] font-semibold text-white transition active:scale-[0.98] active:opacity-70 disabled:cursor-default disabled:opacity-40 disabled:active:scale-100"
            >
              Got it
            </button>
          </div>

          <button
            type="button"
            onClick={onStartLesson}
            className="w-full cursor-pointer py-4 text-base font-medium text-subdued active:opacity-60"
          >
            Skip to Lesson
          </button>
        </div>
      </main>
    </div>
  );
}
