"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { IoTrophy } from "react-icons/io5";

const CONFETTI_COLORS = ["#ff4900", "#ff6b35", "#FFD700", "#34C759", "#FF9F0A"];
/** Same delay as the reference: confetti starts once the card has popped in. */
const CONFETTI_DELAY_MS = 400;

/**
 * Port of the reference's "Conversation complete" modal. Uses `fixed`, which stays inside
 * `.app-column` (its transform makes it the containing block); confetti draws on a canvas in here
 * for the same reason. Continue is the only way out, as in the reference.
 */
export default function ConversationCompleteModal({ onContinue }: { onContinue: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // disableForReducedMotion: no confetti at all when the user prefers reduced motion.
    const fire = confetti.create(canvas, { resize: true, disableForReducedMotion: true });
    const timer = setTimeout(() => {
      void fire({
        particleCount: 200,
        spread: 100,
        startVelocity: 50,
        ticks: 250,
        origin: { x: 0.5, y: 0.35 },
        colors: CONFETTI_COLORS,
      });
    }, CONFETTI_DELAY_MS);
    return () => {
      clearTimeout(timer);
      fire.reset();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conversation-complete-title"
      aria-describedby="conversation-complete-description"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-5 motion-safe:animate-fade-in"
    >
      <div className="flex w-full max-w-[400px] flex-col items-center rounded-3xl bg-white p-8 shadow-[0_8px_16px_rgba(0,0,0,0.3)] motion-safe:animate-pop-in">
        <div className="mb-6 flex h-[100px] w-[100px] items-center justify-center rounded-full bg-accent/[0.13]">
          <IoTrophy size={56} className="text-accent" aria-hidden />
        </div>
        <h2
          id="conversation-complete-title"
          className="mb-3 text-center text-2xl font-bold text-text"
        >
          Conversation Complete!
        </h2>
        <p id="conversation-complete-description" className="mb-8 text-center text-base text-subdued">
          Great job! You successfully completed the conversation.
        </p>
        <button
          ref={continueRef}
          type="button"
          onClick={onContinue}
          className="min-w-[200px] cursor-pointer rounded-xl bg-accent px-12 py-4 text-lg font-bold text-white transition-transform active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
    </div>
  );
}
