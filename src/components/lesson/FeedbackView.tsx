"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  IoArrowForward,
  IoBulbOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoMicCircle,
  IoPause,
  IoPlay,
  IoRefresh,
} from "react-icons/io5";

export interface FeedbackSentence {
  english: string;
  mandarin: { hanzi: string; pinyin: string };
}

/** Shown when the pronunciation checker can't judge the recording, so the learner does. */
export interface SelfCheck {
  /** Local object URL of the learner's recording, for playback only. */
  recordingUrl: string | null;
  onSaidItRight: () => void;
  onTryAgain: () => void;
}

export function FeedbackView({
  correctOption,
  isCorrect,
  onContinue,
  onRetry,
  attemptCount,
  maxAttempts,
  transcription,
  selfCheck,
}: {
  correctOption: FeedbackSentence;
  isCorrect: boolean | null;
  onContinue: () => void;
  onRetry?: () => void;
  attemptCount: number;
  maxAttempts: number;
  transcription?: { expected: string; said: string };
  selfCheck?: SelfCheck;
}) {
  if (selfCheck) {
    return <SelfCheckView sentence={correctOption} selfCheck={selfCheck} attemptCount={attemptCount} maxAttempts={maxAttempts} />;
  }

  const showRetryButton = !!onRetry && !isCorrect && attemptCount < maxAttempts;
  const showCorrectAnswer = !isCorrect && attemptCount >= maxAttempts;

  return (
    <section
      aria-live="polite"
      className={`rounded-3xl border-2 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.15)] ${
        isCorrect ? "border-success bg-[#e8f5e9]" : "border-danger bg-[#ffebee]"
      }`}
    >
      <div className="mb-5 flex items-center gap-4">
        {isCorrect ? (
          <IoCheckmarkCircle size={40} className="shrink-0 text-success" aria-hidden />
        ) : (
          <IoCloseCircle size={40} className="shrink-0 text-danger" aria-hidden />
        )}
        <div className="flex-1">
          <h2 className="mb-1 text-2xl font-bold text-text">
            {isCorrect ? "Great job!" : showRetryButton ? "Not quite" : "Keep practising"}
          </h2>
          {showRetryButton ? (
            <p className="text-[15px] leading-5 text-subdued">Try again - you&apos;ve got this!</p>
          ) : null}
          {showCorrectAnswer ? (
            <p className="text-[15px] leading-5 text-subdued">Here&apos;s what to say next time</p>
          ) : null}
        </div>
      </div>

      {transcription ? (
        <dl className="mb-3 rounded-lg bg-black/3 p-3 text-sm">
          <div className="flex">
            <dt className="w-20 shrink-0 font-semibold text-subdued">Expected:</dt>
            <dd className="flex-1 text-text">{transcription.expected}</dd>
          </div>
          <div className="flex">
            <dt className="w-20 shrink-0 font-semibold text-subdued">You said:</dt>
            <dd className={`flex-1 ${isCorrect ? "text-success" : "text-danger"}`}>
              {transcription.said.charAt(0).toUpperCase() + transcription.said.slice(1)}
            </dd>
          </div>
        </dl>
      ) : null}

      {showCorrectAnswer ? <CorrectAnswer sentence={correctOption} label="Correct Response:" /> : null}

      <div className="flex flex-col gap-3">
        {showRetryButton ? (
          <>
            <PrimaryButton onClick={onRetry}>
              <IoRefresh size={20} aria-hidden />
              Try Again ({maxAttempts - attemptCount} left)
            </PrimaryButton>
            <SecondaryButton onClick={onContinue}>Skip</SecondaryButton>
          </>
        ) : (
          <PrimaryButton onClick={onContinue}>
            {isCorrect ? "Continue" : "Next Question"}
            <IoArrowForward size={20} aria-hidden />
          </PrimaryButton>
        )}
      </div>

      {!isCorrect && attemptCount > 0 && attemptCount < maxAttempts ? (
        <AttemptDots attemptCount={attemptCount} maxAttempts={maxAttempts} />
      ) : null}
    </section>
  );
}

function SelfCheckView({
  sentence,
  selfCheck,
  attemptCount,
  maxAttempts,
}: {
  sentence: FeedbackSentence;
  selfCheck: SelfCheck;
  attemptCount: number;
  maxAttempts: number;
}) {
  return (
    <section
      aria-live="polite"
      className="rounded-3xl border-2 border-accent/40 bg-[#fff7f2] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
    >
      <div className="mb-5 flex items-center gap-4">
        <IoMicCircle size={40} className="shrink-0 text-accent" aria-hidden />
        <div className="flex-1">
          <h2 className="mb-1 text-xl leading-7 font-bold text-text">Pronunciation check coming soon</h2>
          <p className="text-[15px] leading-5 text-subdued">Compare yourself with the answer, then choose.</p>
        </div>
      </div>

      <CorrectAnswer sentence={sentence} label="You were saying:" />

      {selfCheck.recordingUrl ? <RecordingPlayback url={selfCheck.recordingUrl} /> : null}

      <div className="flex flex-col gap-3">
        <PrimaryButton onClick={selfCheck.onSaidItRight}>
          <IoCheckmarkCircle size={20} aria-hidden />I said it right
        </PrimaryButton>
        <SecondaryButton onClick={selfCheck.onTryAgain}>
          <IoRefresh size={18} aria-hidden />
          Try again
        </SecondaryButton>
      </div>

      {attemptCount > 0 && attemptCount < maxAttempts ? (
        <AttemptDots attemptCount={attemptCount} maxAttempts={maxAttempts} />
      ) : null}
    </section>
  );
}

/** Plays the learner's own recording back from memory; it is never uploaded. */
function RecordingPlayback({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
    } else {
      void audio.play().catch(() => setIsPlaying(false));
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="mb-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2 text-[15px] font-semibold text-accent active:opacity-60"
      >
        {isPlaying ? <IoPause size={18} aria-hidden /> : <IoPlay size={18} aria-hidden />}
        {isPlaying ? "Stop playback" : "Listen to your recording"}
      </button>
    </>
  );
}

function CorrectAnswer({ sentence, label }: { sentence: FeedbackSentence; label: string }) {
  return (
    <div className="mb-5 rounded-2xl border border-accent/30 bg-accent/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <IoBulbOutline size={20} className="text-accent" aria-hidden />
        <span className="text-[13px] font-bold text-accent uppercase">{label}</span>
      </div>
      <p className="mb-2 text-base font-semibold text-text">{sentence.english}</p>
      <p className="text-lg font-bold text-text">{sentence.mandarin.pinyin}</p>
      <p className="mt-1 text-base text-subdued">{sentence.mandarin.hanzi}</p>
    </div>
  );
}

function AttemptDots({ attemptCount, maxAttempts }: { attemptCount: number; maxAttempts: number }) {
  return (
    <div
      className="mt-4 flex justify-center gap-2"
      role="img"
      aria-label={`${attemptCount} of ${maxAttempts} attempts used`}
    >
      {Array.from({ length: maxAttempts }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < attemptCount ? "bg-danger" : "bg-[rgba(107,114,128,0.3)]"}`}
        />
      ))}
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-base font-bold text-white shadow-[0_4px_8px_rgba(255,73,0,0.3)] active:opacity-80"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-subdued bg-transparent px-6 py-4 text-base font-semibold text-subdued active:opacity-70"
    >
      {children}
    </button>
  );
}
