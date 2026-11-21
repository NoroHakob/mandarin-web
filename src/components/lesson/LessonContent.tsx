"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Question } from "@/lib/course";
import { incrementLessonCompletion } from "@/lib/lessonProgress";
import { checkPronunciation } from "@/lib/pronunciation";
import { RecorderError, startRecording as startMicRecording, type ActiveRecording } from "@/lib/recorder";
import { speak, stopSpeech, type SpeakHandle } from "@/lib/speech";
import { recordQuestionAnswered, recordQuestionListened } from "@/lib/speakingListeningStats";
import AudioPrompt from "./AudioPrompt";
import { FeedbackView, type FeedbackSentence } from "./FeedbackView";
import LessonCompleteScreen, { type LessonStats } from "./LessonCompleteScreen";
import ListeningMultipleChoiceMode from "./ListeningMultipleChoiceMode";
import MultipleChoiceMode from "./MultipleChoiceMode";
import ProgressHeader from "./ProgressHeader";
import SentenceBreakdownCard from "./SentenceBreakdownCard";
import SingleResponseMode from "./SingleResponseMode";

export type { LessonStats } from "./LessonCompleteScreen";

const MAX_ATTEMPTS = 3;
/** Recording stops on its own after this long, so a forgotten mic doesn't stay open. */
const MAX_RECORDING_MS = 15_000;
const NO_SPEECH_MESSAGE = "No speech detected — tap the mic and try again";
/** Matches SentenceBreakdownCard's closed strip, so content can scroll clear of it. */
const SHEET_PEEK = 90;

interface Tally {
  correct: number;
  /** Wrong attempts per question id. */
  attempts: Record<number, number>;
  /** Questions missed on the first try, in the order they were missed. */
  wrong: number[];
}

const EMPTY_TALLY: Tally = { correct: 0, attempts: {}, wrong: [] };

function buildStats(questions: Question[], tally: Tally): LessonStats {
  const wrongQuestions = questions
    .filter((q) => tally.wrong.includes(q.id))
    .map((q) => {
      if (q.type === "listening_mc") {
        return {
          english: q.options.find((opt) => opt.id === q.correctOptionId)?.english ?? "",
          mandarin: { hanzi: q.mandarin.hanzi, pinyin: q.mandarin.pinyin },
          attempts: tally.attempts[q.id] || 1,
        };
      }
      const option = q.options[0];
      return {
        english: option.english,
        mandarin: { hanzi: option.mandarin.hanzi, pinyin: option.mandarin.pinyin },
        attempts: tally.attempts[q.id] || 1,
      };
    });

  return {
    correctAnswers: tally.correct,
    totalQuestions: questions.length,
    accuracy: Math.round((tally.correct / questions.length) * 100),
    wrongQuestions: wrongQuestions.length > 0 ? wrongQuestions : undefined,
  };
}

export default function LessonContent({ questions, lessonId }: { questions: Question[]; lessonId: string }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  // Bumped by "Practise Again" so every question player remounts from scratch.
  const [round, setRound] = useState(0);
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const [lessonStats, setLessonStats] = useState<LessonStats | null>(null);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const closeExitConfirm = useCallback(() => setExitConfirmVisible(false), []);

  const recordAnswer = useCallback((questionId: number, correct: boolean, attemptIndex: number) => {
    setTally((prev) => {
      if (correct) return { ...prev, correct: prev.correct + 1 };
      return {
        ...prev,
        attempts: { ...prev.attempts, [questionId]: (prev.attempts[questionId] || 0) + 1 },
        wrong: attemptIndex === 0 && !prev.wrong.includes(questionId) ? [...prev.wrong, questionId] : prev.wrong,
      };
    });
  }, []);

  const goToNext = () => {
    if (index < questions.length - 1) setIndex(index + 1);
    else setLessonStats(buildStats(questions, tally));
  };

  if (lessonStats) {
    return (
      <LessonCompleteScreen
        lessonStats={lessonStats}
        isContinuing={isContinuing}
        onContinue={() => {
          if (isContinuing) return;
          setIsContinuing(true);
          incrementLessonCompletion(lessonId);
          router.replace("/lessons");
        }}
        onReview={() => {
          setLessonStats(null);
          setTally(EMPTY_TALLY);
          setIndex(0);
          setRound((r) => r + 1);
        }}
      />
    );
  }

  const question = questions[index];

  return (
    <div className="flex h-full flex-col">
      <ConfirmDialog
        visible={exitConfirmVisible}
        title="Exit practise"
        description="Are you sure you want to quit? Your progress will be lost."
        cancelLabel="Cancel"
        confirmLabel="Exit"
        destructive
        onCancel={closeExitConfirm}
        onConfirm={() => {
          setExitConfirmVisible(false);
          // Unmounting the question player cancels speech and releases the mic.
          router.replace("/lessons");
        }}
      />
      <ProgressHeader
        progress={((index + 1) / questions.length) * 100}
        currentCount={index + 1}
        totalCount={questions.length}
        onClose={() => setExitConfirmVisible(true)}
      />
      <QuestionPlayer
        key={`${round}-${index}`}
        question={question}
        onAnswer={(correct, attemptIndex) => recordAnswer(question.id, correct, attemptIndex)}
        onNext={goToNext}
      />
    </div>
  );
}

/**
 * One question from first listen to "Continue". Keyed by question, so moving on remounts it
 * with fresh state; unmounting cancels speech and stops the mic.
 */
function QuestionPlayer({
  question,
  onAnswer,
  onNext,
}: {
  question: Question;
  /** Called once per judged attempt; `attemptIndex` is 0 for the first try. */
  onAnswer: (correct: boolean, attemptIndex: number) => void;
  onNext: () => void;
}) {
  const [isSpeechPlaying, setIsSpeechPlaying] = useState(false);
  const [hasListenedToAudio, setHasListenedToAudio] = useState(false);
  const [showMandarin, setShowMandarin] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [transcription, setTranscription] = useState<{ expected: string; said: string } | null>(null);
  const [needsSelfCheck, setNeedsSelfCheck] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const speechRef = useRef<SpeakHandle | null>(null);
  const recordingRef = useRef<ActiveRecording | null>(null);
  const startingRef = useRef(false);
  const listenedRef = useRef(false);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      speechRef.current?.cancel();
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      recordingRef.current?.cancel();
      recordingRef.current = null;
    };
  }, []);

  // The recording only lives in memory; free it when it's no longer offered for playback.
  useEffect(() => {
    if (!recordingUrl) return;
    return () => URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  const correctListeningEnglish =
    question.type === "listening_mc"
      ? (question.options.find((opt) => opt.id === question.correctOptionId)?.english ?? "")
      : "";

  // The sentence being answered: the chosen/given response, or for listening the heard sentence.
  const selectedSentence =
    question.type === "listening_mc"
      ? showResult
        ? { english: correctListeningEnglish, mandarin: question.mandarin }
        : null
      : selectedOption !== null
        ? (question.options.find((opt) => opt.id === selectedOption) ?? null)
        : null;

  const breakdownSentence =
    question.type === "listening_mc"
      ? hasListenedToAudio
        ? {
            english: correctListeningEnglish,
            pinyin: question.mandarin.pinyin,
            hanzi: question.mandarin.hanzi,
            words: question.mandarin.words,
            breakdown: question.mandarin.breakdown,
          }
        : null
      : selectedSentence && "words" in selectedSentence.mandarin
        ? {
            english: selectedSentence.english,
            pinyin: selectedSentence.mandarin.pinyin,
            hanzi: selectedSentence.mandarin.hanzi,
            words: selectedSentence.mandarin.words,
            breakdown: selectedSentence.mandarin.breakdown,
          }
        : null;

  const finishListening = () => {
    setIsSpeechPlaying(false);
    if (listenedRef.current) return;
    listenedRef.current = true;
    setHasListenedToAudio(true);
    recordQuestionListened();
    // single_response has one answer, so it's selected as soon as the options appear.
    if (question.type === "single_response") setSelectedOption(question.options[0].id);
  };

  const playAudio = () => {
    if (isSpeechPlaying || hasListenedToAudio) return;
    setIsSpeechPlaying(true);
    speechRef.current = speak(question.mandarin.hanzi || question.mandarin.pinyin, {
      onEnd: finishListening,
      onStop: () => setIsSpeechPlaying(false),
      onError: () => {
        // Don't strand the learner when the browser can't speak: show the answers anyway.
        toast.error("Couldn't play the audio", { description: "You can still answer — tap to reveal what was said." });
        finishListening();
      },
    });
  };

  const clearAutoStop = () => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    autoStopRef.current = null;
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    clearAutoStop();
    setIsRecording(false);
    setAnalyser(null);
    setIsLoading(true);
    const expected = selectedSentence?.mandarin.pinyin ?? "";

    try {
      const blob = await recording.stop();
      if (!mountedRef.current) return;
      const result = blob.size === 0 ? ({ status: "no_speech" } as const) : await checkPronunciation(blob, expected);
      if (!mountedRef.current) return;
      setIsLoading(false);

      // Silence isn't an answer: no attempt used, nothing recorded in stats, just record again.
      if (result.status === "no_speech") {
        setMicError(NO_SPEECH_MESSAGE);
        return;
      }

      setShowResult(true);

      if (result.status === "unavailable") {
        setIsCorrect(null);
        setNeedsSelfCheck(true);
        setRecordingUrl(URL.createObjectURL(blob));
        return;
      }

      setTranscription({ expected, said: result.transcript });
      setIsCorrect(result.isCorrect);
      onAnswer(result.isCorrect, attemptCount);
      if (result.isCorrect) recordQuestionAnswered();
    } catch {
      if (!mountedRef.current) return;
      setIsLoading(false);
      toast.error("Recording failed", { description: "Please try again." });
    }
  };

  const startRecording = async () => {
    if (startingRef.current || recordingRef.current) return;
    stopSpeech();
    startingRef.current = true;
    setIsStartingRecording(true);
    setMicError(null);

    try {
      const recording = await startMicRecording();
      if (!mountedRef.current) {
        recording.cancel();
        return;
      }
      recordingRef.current = recording;
      setAnalyser(recording.analyser);
      setIsRecording(true);
      autoStopRef.current = setTimeout(() => void stopRecording(), MAX_RECORDING_MS);
    } catch (err) {
      if (!mountedRef.current) return;
      const error =
        err instanceof RecorderError ? err : new RecorderError("unknown", "Could not start recording. Please try again.");
      setMicError(error.message);
      toast.error(error.kind === "permission-denied" ? "Microphone access denied" : "Microphone unavailable", {
        description: error.message,
      });
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setIsStartingRecording(false);
    }
  };

  const handleOptionPress = (id: number) => {
    if (question.type === "listening_mc") {
      const correct = id === question.correctOptionId;
      setSelectedOption(id);
      setIsCorrect(correct);
      setShowResult(true);
      onAnswer(correct, attemptCount);
      return;
    }
    setMicError(null);
    setSelectedOption((prev) => (prev === id ? null : id));
  };

  const handleRetry = () => {
    setShowResult(false);
    setIsCorrect(null);
    setAttemptCount((c) => c + 1);
    setTranscription(null);
    setNeedsSelfCheck(false);
    setRecordingUrl(null);
    setIsLoading(false);
    // single_response keeps its only answer selected; the others pick again.
    if (question.type !== "single_response") setSelectedOption(null);
  };

  const handleSaidItRight = () => {
    setNeedsSelfCheck(false);
    setRecordingUrl(null);
    setIsCorrect(true);
    onAnswer(true, attemptCount);
    recordQuestionAnswered();
  };

  const handleSelfCheckTryAgain = () => {
    onAnswer(false, attemptCount);
    if (attemptCount + 1 < MAX_ATTEMPTS) {
      handleRetry();
      return;
    }
    // Out of attempts: fall through to the regular "here's what to say" feedback.
    setNeedsSelfCheck(false);
    setRecordingUrl(null);
    setIsCorrect(false);
  };

  const isBusy = isLoading || showResult;
  const hasSelectedSpeakingOption = question.type !== "listening_mc" && selectedOption !== null;
  const feedbackAttemptCount = needsSelfCheck || isCorrect ? attemptCount : attemptCount + 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-5"
        style={{ paddingBottom: breakdownSentence ? SHEET_PEEK + 20 : 20 }}
      >
        <section
          inert={isBusy}
          className={`flex shrink-0 flex-col items-center justify-center rounded-2xl bg-[#f9fafb] p-5 transition-[flex-grow,min-height,opacity] duration-700 ease-out ${
            hasListenedToAudio ? "min-h-[200px] grow-0" : "min-h-[320px] grow"
          } ${isBusy ? "opacity-60" : ""}`}
        >
          <AudioPrompt
            questionType={question.type}
            prompt={question.mandarin}
            isPlaying={isSpeechPlaying}
            hasListenedToAudio={hasListenedToAudio}
            isRecording={isRecording}
            isStartingRecording={isStartingRecording}
            analyser={analyser}
            micError={micError}
            hasSelectedOption={hasSelectedSpeakingOption}
            showMandarin={showMandarin}
            onPlay={playAudio}
            onStartRecord={() => void startRecording()}
            onStopRecord={() => void stopRecording()}
            onToggleMandarin={() => setShowMandarin((v) => !v)}
          />
        </section>

        {hasListenedToAudio ? (
          <div
            inert={isBusy}
            className={`mt-8 shrink-0 motion-safe:animate-rise-in ${isBusy ? "opacity-50" : ""}`}
          >
            {question.type === "multiple_choice" ? (
              <MultipleChoiceMode
                options={question.options}
                selectedOption={selectedOption}
                onOptionPress={handleOptionPress}
                disabled={isBusy || isRecording || isStartingRecording}
              />
            ) : null}
            {question.type === "listening_mc" ? (
              <ListeningMultipleChoiceMode
                options={question.options}
                selectedOption={selectedOption}
                onOptionPress={handleOptionPress}
                disabled={isBusy}
              />
            ) : null}
            {question.type === "single_response" ? <SingleResponseMode option={question.options[0]} /> : null}
          </div>
        ) : null}

        {isLoading ? (
          <div role="status" className="mt-5 flex shrink-0 flex-col items-center p-5">
            <span
              aria-hidden
              className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-accent"
            />
            <p className="mt-3 text-base text-subdued">Analyzing your pronunciation...</p>
          </div>
        ) : null}
      </div>

      {!isLoading && breakdownSentence ? (
        <SentenceBreakdownCard
          key={breakdownSentence.hanzi}
          sentence={breakdownSentence}
          disabled={showResult || isRecording}
        />
      ) : null}

      {showResult && selectedSentence ? (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-full overflow-y-auto px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] motion-safe:animate-pop-in">
          <FeedbackView
            correctOption={selectedSentence as FeedbackSentence}
            isCorrect={isCorrect}
            onContinue={onNext}
            onRetry={attemptCount < MAX_ATTEMPTS && !isCorrect ? handleRetry : undefined}
            attemptCount={feedbackAttemptCount}
            maxAttempts={MAX_ATTEMPTS}
            transcription={transcription ?? undefined}
            selfCheck={
              needsSelfCheck
                ? { recordingUrl, onSaidItRight: handleSaidItRight, onTryAgain: handleSelfCheckTryAgain }
                : undefined
            }
          />
        </div>
      ) : null}
    </div>
  );
}
