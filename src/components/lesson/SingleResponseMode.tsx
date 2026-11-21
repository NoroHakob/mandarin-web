"use client";

import { useState } from "react";
import type { SpeakingOption } from "@/lib/course";

/** One given response to say; tapping reveals its pinyin and hanzi. */
export default function SingleResponseMode({ option }: { option: SpeakingOption }) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="flex flex-col">
      <p className="mb-5 text-center text-lg font-semibold text-accent motion-safe:animate-fade-in">
        Record this response in Mandarin
      </p>
      <div className="flex flex-col items-center rounded-xl border-2 border-accent bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
        <p className="text-center text-lg font-semibold text-text">{option.english}</p>
        <button
          type="button"
          aria-expanded={showAnswer}
          onClick={() => setShowAnswer((v) => !v)}
          className="mt-4 mb-2 cursor-pointer px-5 py-2.5 text-center active:opacity-60"
        >
          {showAnswer ? (
            <span className="mt-3 flex flex-col items-center motion-safe:animate-fade-in">
              <span className="text-lg font-bold text-text">{option.mandarin.pinyin}</span>
              <span className="mb-1 text-base text-subdued">{option.mandarin.hanzi}</span>
            </span>
          ) : (
            <span className="text-base text-subdued">Tap here to reveal how to say it</span>
          )}
        </button>
      </div>
    </div>
  );
}
