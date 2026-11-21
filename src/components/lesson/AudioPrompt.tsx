"use client";

import { IoMic, IoPlay, IoStop } from "react-icons/io5";
import { MdGraphicEq } from "react-icons/md";
import type { MandarinPrompt, Question } from "@/lib/course";
import AudioWaveform from "./AudioWaveform";

/**
 * The big round button plus its status text. Before an answer is chosen it plays the prompt
 * (once); once one is chosen it becomes the record/stop mic button.
 */
export default function AudioPrompt({
  questionType,
  prompt,
  isPlaying,
  hasListenedToAudio,
  isRecording,
  isStartingRecording,
  analyser,
  micError,
  hasSelectedOption,
  showMandarin,
  onPlay,
  onStartRecord,
  onStopRecord,
  onToggleMandarin,
}: {
  questionType: Question["type"];
  prompt: MandarinPrompt;
  isPlaying: boolean;
  hasListenedToAudio: boolean;
  isRecording: boolean;
  isStartingRecording: boolean;
  analyser: AnalyserNode | null;
  micError: string | null;
  hasSelectedOption: boolean;
  showMandarin: boolean;
  onPlay: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onToggleMandarin: () => void;
}) {
  // The prompt plays once; after that the button only comes back as a mic.
  const playbackDisabled = !hasSelectedOption && (isPlaying || hasListenedToAudio);
  const disabled = playbackDisabled || isStartingRecording;

  const label = hasSelectedOption
    ? isRecording
      ? "Stop recording"
      : "Start recording"
    : isPlaying
      ? "Playing audio"
      : "Play audio";

  const background = hasSelectedOption
    ? isRecording
      ? "bg-danger"
      : "bg-accent"
    : playbackDisabled
      ? "bg-[#ff8c66]"
      : "bg-accent";

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-pressed={hasSelectedOption ? isRecording : undefined}
        disabled={disabled}
        onClick={hasSelectedOption ? (isRecording ? onStopRecord : onStartRecord) : onPlay}
        className={`relative my-2.5 flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-[0_4px_8px_rgba(0,0,0,0.25)] transition-[transform,background-color] duration-200 enabled:active:scale-90 disabled:cursor-default ${background}`}
      >
        {isRecording ? (
          <span className="absolute inset-0 rounded-full bg-danger/40 motion-safe:animate-ping" aria-hidden />
        ) : null}
        <span className="relative">
          {hasSelectedOption ? (
            isRecording ? (
              <IoStop size={34} />
            ) : (
              <IoMic size={36} className={isStartingRecording ? "opacity-60" : undefined} />
            )
          ) : isPlaying ? (
            <MdGraphicEq size={36} />
          ) : (
            <IoPlay size={34} className="translate-x-0.5" />
          )}
        </span>
      </button>

      {hasSelectedOption && isRecording ? (
        <div className="flex flex-col items-center" role="status">
          <div className="mt-2 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-danger motion-safe:animate-pulse" aria-hidden />
            <span className="text-base font-semibold text-danger">Recording...</span>
          </div>
          <AudioWaveform active analyser={analyser} color="#ef4444" />
        </div>
      ) : (
        <AudioWaveform active={isPlaying} />
      )}

      <div
        className={`flex flex-col items-center ${questionType === "listening_mc" ? "" : "min-h-[50px]"}`}
      >
        {micError && hasSelectedOption && !isRecording ? (
          <p role="alert" className="max-w-[300px] px-3 pb-2 text-center text-sm leading-5 text-danger">
            {micError}
          </p>
        ) : null}

        {hasSelectedOption ? (
          <p className="p-3 text-center text-base text-subdued">
            {isRecording
              ? "Speak your response now"
              : isStartingRecording
                ? "Starting microphone..."
                : "Tap the microphone to record"}
          </p>
        ) : !hasListenedToAudio ? (
          <div className="relative flex min-h-[60px] flex-col items-center justify-center p-5">
            {/* Instructions fade out and "Listening..." in once playback starts. */}
            <div
              className={`flex flex-col items-center transition-opacity duration-200 ${
                isPlaying ? "opacity-0" : "opacity-100"
              }`}
            >
              <p className="mb-2 text-center text-base text-subdued">Tap play to listen carefully</p>
              <p className="text-center text-sm text-[#9ca3af]">
                The audio plays once before each response
              </p>
            </div>
            <p
              aria-live="polite"
              className={`absolute text-base text-subdued transition-[opacity,transform] duration-300 ${
                isPlaying ? "scale-100 opacity-100" : "scale-95 opacity-0"
              }`}
            >
              {isPlaying ? "Listening..." : ""}
            </p>
          </div>
        ) : showMandarin ? (
          <button
            type="button"
            onClick={onToggleMandarin}
            className="flex cursor-pointer flex-col items-center rounded-xl p-4 motion-safe:animate-fade-in"
          >
            <span className="mb-2 text-lg font-bold text-text">{prompt.pinyin}</span>
            <span className="text-lg text-subdued">{prompt.hanzi}</span>
          </button>
        ) : questionType !== "listening_mc" ? (
          <button
            type="button"
            onClick={onToggleMandarin}
            className="mt-4 mb-2 cursor-pointer px-5 py-2.5 text-center text-base text-subdued active:opacity-60"
          >
            Tap here to reveal what was said
          </button>
        ) : null}
      </div>
    </>
  );
}
