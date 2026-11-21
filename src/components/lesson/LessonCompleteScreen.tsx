"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  IoAlertCircle,
  IoArrowForward,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoRefresh,
  IoRefreshOutline,
  IoTrophy,
} from "react-icons/io5";

export interface WrongQuestion {
  english: string;
  mandarin: { hanzi: string; pinyin: string };
  attempts: number;
}

export interface LessonStats {
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  wrongQuestions?: WrongQuestion[];
}

const CONFETTI_COLORS = ["#ff4900", "#ff6b35", "#FFD700", "#34C759", "#FF9F0A"];

function getPerformance(accuracy: number) {
  if (accuracy >= 90) return { message: "Outstanding! 🌟", color: "#FFD700" };
  if (accuracy >= 75) return { message: "Great work! 🎉", color: "#34C759" };
  if (accuracy >= 60) return { message: "Good effort! 💪", color: "#ff4900" };
  return { message: "Keep practising! 📚", color: "#6b7280" };
}

export default function LessonCompleteScreen({
  lessonStats,
  onContinue,
  onReview,
  isContinuing = false,
}: {
  lessonStats: LessonStats;
  onContinue: () => void;
  onReview: () => void;
  isContinuing?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const performance = getPerformance(lessonStats.accuracy);
  const wrongQuestions = lessonStats.wrongQuestions ?? [];

  // Confetti draws on a canvas inside this screen, so it stays within .app-column.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fire = confetti.create(canvas, { resize: true, disableForReducedMotion: true });
    const timer = setTimeout(() => {
      const shared = {
        particleCount: 100,
        spread: 70,
        startVelocity: 55,
        ticks: 250,
        colors: CONFETTI_COLORS,
      };
      void fire({ ...shared, angle: 60, origin: { x: 0, y: 0.7 } });
      void fire({ ...shared, angle: 120, origin: { x: 1, y: 0.7 } });
    }, 400);
    return () => {
      clearTimeout(timer);
      fire.reset();
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col bg-linear-to-b from-white via-[#f9fafb] to-[#f3f4f6]">
      <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-[60px] pb-8">
        <div className="mb-8 flex flex-col items-center motion-safe:animate-pop-in">
          <div className="mb-5 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-linear-to-br from-accent to-[#ff6b35] shadow-[0_8px_16px_rgba(255,73,0,0.4)]">
            <IoTrophy size={56} className="text-white" aria-hidden />
          </div>
          <h1 className="mb-2 text-center text-2xl font-extrabold text-text">Lesson Complete!</h1>
          <p className="text-center text-base text-text">{performance.message}</p>
        </div>

        <section
          aria-label="Your score"
          className="mb-8 flex items-center rounded-[20px] border-2 border-[#e5e7eb] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] motion-safe:animate-fade-in"
        >
          <div
            className="mr-5 flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${performance.color}20` }}
          >
            <IoCheckmarkCircle size={40} style={{ color: performance.color }} aria-hidden />
          </div>
          <div className="flex-1">
            <p className="mb-1 text-2xl font-extrabold text-text tabular-nums">{lessonStats.accuracy}%</p>
            <p className="text-base font-medium text-subdued">
              {lessonStats.correctAnswers}/{lessonStats.totalQuestions} correct
            </p>
          </div>
        </section>

        {wrongQuestions.length > 0 ? (
          <section className="motion-safe:animate-fade-in">
            <div className="mb-2 flex items-center gap-3">
              <IoAlertCircle size={24} className="text-danger" aria-hidden />
              <h2 className="text-xl font-bold text-text">Questions to Review</h2>
            </div>
            <p className="mb-4 text-[15px] text-subdued">Focus on these for improvement</p>

            <ul className="flex flex-col gap-3">
              {wrongQuestions.map((question, index) => (
                <li
                  key={index}
                  className="flex items-start rounded-2xl border-2 border-danger/20 bg-white p-5 shadow-[0_2px_4px_rgba(239,68,68,0.08)]"
                >
                  <IoCloseCircle size={20} className="mt-0.5 mr-3 shrink-0 text-danger" aria-hidden />
                  <div className="mr-3 min-w-0 flex-1">
                    <p className="mb-2 text-[17px] font-semibold text-text">{question.english}</p>
                    <p className="text-base font-semibold text-text">{question.mandarin.pinyin}</p>
                    <p className="mt-1 text-[15px] text-subdued">{question.mandarin.hanzi}</p>
                  </div>
                  {question.attempts > 0 ? (
                    <span
                      className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-danger/10 px-3 py-1.5 text-sm font-bold text-danger"
                      aria-label={`${question.attempts} wrong attempts`}
                    >
                      <IoRefresh size={16} aria-hidden />
                      {question.attempts}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <div className="flex shrink-0 flex-col gap-3 border-t border-[#e5e7eb] bg-white px-5 pt-5 pb-[max(10px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onContinue}
          disabled={isContinuing}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-[20px] bg-linear-to-r from-accent to-[#ff6b35] px-8 py-[18px] text-lg font-bold text-white shadow-[0_4px_8px_rgba(255,73,0,0.3)] active:opacity-85 disabled:opacity-60"
        >
          Continue
          <IoArrowForward size={20} aria-hidden />
        </button>
        {wrongQuestions.length > 0 ? (
          <button
            type="button"
            onClick={onReview}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-[20px] border-2 border-[#e5e7eb] px-8 py-[18px] text-base font-semibold text-accent active:bg-black/3"
          >
            <IoRefreshOutline size={20} aria-hidden />
            Practise Again
          </button>
        ) : null}
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden />
    </div>
  );
}
