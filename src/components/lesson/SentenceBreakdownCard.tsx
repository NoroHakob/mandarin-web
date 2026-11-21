"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { IoHelpCircleOutline, IoPause, IoPlay } from "react-icons/io5";
import type { Word } from "@/lib/course";
import { speak, type SpeakHandle } from "@/lib/speech";

/** Height of the visible strip (handle + hint) while the sheet is closed. */
const PEEK_HEIGHT = 90;
const DRAG_THRESHOLD = 5;

type WordRow = "hanzi" | "pinyin";

interface Tooltip {
  text: string;
  /** Centre of the tapped word, relative to the scrolling content. */
  x: number;
  /** Top of the tapped word, relative to the scrolling content. */
  y: number;
}

interface DragState {
  pointerId: number;
  startY: number;
  startOffset: number;
  closedOffset: number;
  moved: boolean;
}

/**
 * Bottom sheet with the sentence's pinyin, hanzi, English and a breakdown. Peeks at the bottom
 * of its (relatively positioned) parent; tap or drag the top strip to open. Tap a word for its meaning.
 */
export default function SentenceBreakdownCard({
  sentence,
  disabled = false,
}: {
  sentence: {
    english: string;
    pinyin: string;
    hanzi: string;
    words: Word[];
    breakdown: string;
  };
  disabled?: boolean;
}) {
  const [isOpenState, setIsOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [selectedWord, setSelectedWord] = useState<{ row: WordRow; index: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const speechRef = useRef<SpeakHandle | null>(null);

  // While feedback is showing the sheet tucks away and ignores input.
  const isOpen = isOpenState && !disabled;

  useEffect(() => () => speechRef.current?.cancel(), []);

  const hideTooltip = () => {
    setTooltip(null);
    setSelectedWord(null);
  };

  const toggleOpen = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    hideTooltip();
    setIsOpen((v) => !v);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const card = cardRef.current;
    if (!card || disabled) return;
    const closedOffset = card.offsetHeight - PEEK_HEIGHT;
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startOffset: isOpen ? 0 : closedOffset,
      closedOffset,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    setDragOffset(Math.min(drag.closedOffset, Math.max(0, drag.startOffset + dy)));
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (drag.moved) {
      // The click that follows a drag shouldn't toggle the sheet again.
      suppressClickRef.current = true;
      const offset = dragOffset ?? drag.startOffset;
      setIsOpen(offset < drag.closedOffset / 2);
      hideTooltip();
    }
    setDragOffset(null);
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    setDragOffset(null);
  };

  const playAudio = () => {
    if (isPlaying) {
      speechRef.current?.cancel();
      setIsPlaying(false);
      return;
    }
    const text = sentence.hanzi || sentence.pinyin;
    if (!text) return;
    setIsPlaying(true);
    const done = () => setIsPlaying(false);
    speechRef.current = speak(text, { onEnd: done, onStop: done, onError: done });
  };

  const showTooltip = (target: HTMLElement, word: Word, row: WordRow, index: number) => {
    const content = contentRef.current;
    if (!content) return;
    const wordRect = target.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    setTooltip({
      text: word.english,
      x: wordRect.left + wordRect.width / 2 - contentRect.left,
      y: wordRect.top - contentRect.top + content.scrollTop,
    });
    setSelectedWord({ row, index });
  };

  const renderSentence = (row: WordRow) => (
    <div className="flex flex-wrap items-center">
      {sentence.words.map((word, index) => {
        const isSelected = selectedWord?.row === row && selectedWord.index === index;
        return (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isSelected) hideTooltip();
              else showTooltip(e.currentTarget, word, row, index);
            }}
            className={`cursor-pointer rounded px-px text-[#1c1c1e] active:bg-accent/10 ${
              row === "hanzi" ? "text-[22px] leading-[34px]" : "text-lg leading-[30px] font-semibold"
            } ${isSelected ? "underline decoration-accent decoration-2 underline-offset-4" : ""}`}
          >
            {word[row]}
            {" "}
          </button>
        );
      })}
    </div>
  );

  const transform =
    dragOffset !== null
      ? `translateY(${dragOffset}px)`
      : isOpen
        ? "translateY(0)"
        : `translateY(calc(100% - ${PEEK_HEIGHT}px))`;

  return (
    <>
      {isOpen ? (
        <div
          className="absolute inset-0 z-10 bg-black/15 motion-safe:animate-fade-in"
          onClick={() => {
            hideTooltip();
            setIsOpen(false);
          }}
          aria-hidden
        />
      ) : null}
      <div
        ref={cardRef}
        className={`absolute inset-x-0 bottom-0 z-20 flex h-[75%] flex-col rounded-t-3xl border-t border-[#e5e7eb] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_12px_rgba(0,0,0,0.08)] ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
        style={{
          transform,
          transition:
            dragOffset !== null ? "none" : "transform 320ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms",
        }}
      >
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close sentence breakdown" : "Open sentence breakdown"}
          onClick={toggleOpen}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-3 pb-2.5 select-none active:cursor-grabbing"
          style={{ minHeight: PEEK_HEIGHT - 10 }}
        >
          <span className="mb-3 h-[5px] w-10 rounded-full bg-[#e5e7eb]" aria-hidden />
          <span className="flex items-center justify-center gap-2 text-base font-medium text-subdued">
            <IoHelpCircleOutline size={24} className="text-[#9ca3af]" aria-hidden />
            {isOpen ? "Swipe down to close" : "Swipe up for detailed help"}
          </span>
        </button>

        <div
          ref={contentRef}
          inert={!isOpen}
          onClick={hideTooltip}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-2.5 pb-6"
        >
          <h2 className="mb-1 text-xl font-bold text-[#1c1c1e]">Sentence Breakdown</h2>
          <p className="mb-5 text-[13px] text-subdued italic">Tap any word to see its meaning</p>

          <div className="mb-8">
            <div className="flex items-center">
              <span className="text-sm text-subdued uppercase">Pinyin:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playAudio();
                }}
                aria-label={isPlaying ? "Stop audio" : "Play sentence"}
                className="ml-3 flex cursor-pointer items-center justify-center rounded-2xl border border-[#ffe0d2] bg-white p-1 text-accent active:opacity-60"
              >
                {isPlaying ? <IoPause size={20} /> : <IoPlay size={20} />}
              </button>
            </div>
            {renderSentence("pinyin")}
          </div>
          <div className="mb-8">
            <span className="text-sm text-subdued uppercase">Hanzi:</span>
            {renderSentence("hanzi")}
          </div>
          <div className="mb-8">
            <span className="text-sm text-subdued uppercase">English:</span>
            <p className="text-lg leading-[26px] text-[#1c1c1e]">{sentence.english}</p>
          </div>
          <div className="mb-8">
            <span className="text-sm text-subdued uppercase">Breakdown:</span>
            <p className="text-base leading-6 whitespace-pre-line text-[#1c1c1e]">{sentence.breakdown}</p>
          </div>

          {tooltip ? (
            <div
              role="tooltip"
              ref={(el) => {
                // Centre over the word, clamped inside the sheet.
                const content = contentRef.current;
                if (!el || !content) return;
                const width = el.offsetWidth;
                const maxLeft = content.clientWidth - width - 8;
                el.style.left = `${Math.max(8, Math.min(tooltip.x - width / 2, maxLeft))}px`;
              }}
              className="pointer-events-none absolute max-w-[calc(100%-16px)] rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-2 text-center text-sm text-[#1c1c1e] shadow-sm motion-safe:animate-fade-in"
              style={{ top: tooltip.y - 44 }}
            >
              {tooltip.text}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
