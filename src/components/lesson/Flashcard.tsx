"use client";

import { useState } from "react";
import type { Word } from "@/lib/course";

export type FlashcardDirection = "zh-en" | "en-zh";

/**
 * Tap (or Space/Enter, via the native button) to flip. The parent remounts it with a new `key`
 * for each card, which resets the flip.
 */
export default function Flashcard({
  word,
  direction,
}: {
  word: Word;
  direction: FlashcardDirection;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  const front = direction === "zh-en" ? <MandarinSide word={word} /> : <EnglishSide word={word} />;
  const back =
    direction === "zh-en" ? <EnglishSide word={word} back /> : <MandarinSide word={word} back />;

  return (
    <button
      type="button"
      onClick={() => setIsFlipped((f) => !f)}
      aria-pressed={isFlipped}
      aria-label={isFlipped ? "Show front of card" : "Flip card"}
      className="flip-scene h-full max-h-[440px] w-full max-w-[340px] cursor-pointer rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <span data-flipped={isFlipped} className="flip-card block h-full w-full">
        <span
          aria-hidden={isFlipped}
          className="flip-face flex items-center justify-center rounded-[28px] border border-[#e5e7eb] bg-white px-8 py-12 text-text shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
        >
          {front}
        </span>
        <span
          aria-hidden={!isFlipped}
          className="flip-face flip-face-back flex items-center justify-center rounded-[28px] bg-[#1a1a2e] px-8 py-12 text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
        >
          {back}
        </span>
      </span>
    </button>
  );
}

function MandarinSide({ word, back = false }: { word: Word; back?: boolean }) {
  return (
    <span className={`flex w-full flex-col items-center gap-2 ${back ? "text-white" : ""}`}>
      <span lang="zh-Latn-pinyin" className="max-w-[90%] text-[40px] leading-[48px] font-semibold break-words">
        {word.pinyin}
      </span>
      <span lang="zh-Hans" className="max-w-[90%] text-[30px] leading-9 break-words">
        {word.hanzi}
      </span>
    </span>
  );
}

function EnglishSide({ word, back = false }: { word: Word; back?: boolean }) {
  return (
    <span
      className={`max-w-[90%] text-[40px] leading-[48px] break-words ${
        back ? "text-white italic" : "font-semibold"
      }`}
    >
      {word.english}
    </span>
  );
}
