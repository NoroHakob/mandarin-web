"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  IoArrowUp,
  IoClose,
  IoEyeOffOutline,
  IoEyeOutline,
  IoMic,
  IoVolumeHigh,
} from "react-icons/io5";
import { toast } from "sonner";
import { usePaywall } from "@/components/subscription/PaywallProvider";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { ConversationScenario } from "@/lib/course";
import { isCustomScenarioId } from "@/lib/customScenarios";
import { recordConversationTurn } from "@/lib/speakingListeningStats";
import { speak, stopSpeech } from "@/lib/speech";
import { supabase } from "@/lib/supabase";

// Ported from reference/components/conversation/ConversationMode.tsx — text turns only.
// Voice input (mic) and the completion screen come in step 9d.

const MAX_INPUT_LENGTH = 500;
/** Show the character counter once the user gets close to the limit. */
const COUNTER_THRESHOLD = 400;
const TEXTAREA_MAX_HEIGHT = 120;
const AUTO_SPEAK_DELAY_MS = 200;

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  hanzi?: string;
  pinyin?: string;
  english?: string;
}

interface ChatReply {
  text: string;
  hanzi: string;
  pinyin: string;
  english: string;
  conversationComplete: boolean;
}

// Same first greeting as the reference.
const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  text: "你好！",
  hanzi: "你好！",
  pinyin: "Nǐ hǎo!",
  english: "Hello!",
};

/** Thrown for failures that already got their own UI (paywall, rate-limit toast). */
class HandledError extends Error {}

function isChatReply(value: unknown): value is ChatReply {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.text === "string" &&
    typeof v.hanzi === "string" &&
    typeof v.pinyin === "string" &&
    typeof v.english === "string" &&
    typeof v.conversationComplete === "boolean"
  );
}

/** The server resolves presets itself; custom scenarios only exist on this device, so they're sent. */
function scenarioPayload(scenario: ConversationScenario) {
  if (!isCustomScenarioId(scenario.id)) return { scenarioId: scenario.id };
  const { title, description, goal, tasks, difficulty } = scenario;
  return { customScenario: { title, description, goal, tasks, difficulty } };
}

async function requestReply(
  scenario: ConversationScenario,
  messages: Message[],
  signal: AbortSignal,
  onPremiumRequired: () => void,
): Promise<ChatReply> {
  // Read the session at send time so the token is the freshest one.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch("/api/chat-completion", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...scenarioPayload(scenario),
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
    }),
    signal,
  });

  if (res.status === 403) {
    onPremiumRequired();
    throw new HandledError();
  }
  if (res.status === 429) {
    toast.error("Too many requests, try again in a minute");
    throw new HandledError();
  }
  if (!res.ok) throw new Error(`chat-completion failed (${res.status})`);

  const data: unknown = await res.json();
  if (!isChatReply(data)) throw new Error("Invalid chat reply");
  return data;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const iconButton =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors";

function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Your partner is typing"
      className="mb-3 flex w-fit items-center gap-1 self-start rounded-2xl bg-text/[0.06] px-4 py-4"
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 rounded-full bg-text/40 motion-safe:animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
          aria-hidden
        />
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  showPinyin,
  isBlurred,
  isSpeaking,
  onPlay,
}: {
  message: Message;
  showPinyin: boolean;
  isBlurred: boolean;
  isSpeaking: boolean;
  onPlay: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="mb-3 max-w-[80%] self-end rounded-2xl bg-accent px-3 py-3 break-words whitespace-pre-wrap text-white">
        {message.text}
      </div>
    );
  }

  return (
    <AssistantBubble
      message={message}
      showPinyin={showPinyin}
      isBlurred={isBlurred}
      isSpeaking={isSpeaking}
      onPlay={onPlay}
    />
  );
}

function AssistantBubble({
  message,
  showPinyin,
  isBlurred,
  isSpeaking,
  onPlay,
}: {
  message: Message;
  showPinyin: boolean;
  isBlurred: boolean;
  isSpeaking: boolean;
  onPlay: () => void;
}) {
  // Per message (the bubble is keyed by message id). Hidden by default, as in the reference.
  const [showEnglish, setShowEnglish] = useState(false);
  const englishId = `translation-${message.id}`;
  const hanzi = message.hanzi || message.text;

  return (
    <div className="mb-3 max-w-[80%] self-start rounded-2xl bg-text/[0.06] px-3 pt-3 pb-1">
      <div
        className={`break-words transition-[filter] ${isBlurred ? "blur-[6px] select-none" : ""}`}
        aria-hidden={isBlurred || undefined}
      >
        <p lang="zh-CN" className="text-lg leading-snug text-text">
          {hanzi}
        </p>
        {showPinyin && message.pinyin && (
          <p className="mt-0.5 text-[15px] text-text/80">{message.pinyin}</p>
        )}
        {message.english && showEnglish && (
          <p id={englishId} className="mt-1 text-sm text-subdued">
            {message.english}
          </p>
        )}
      </div>
      {isBlurred && <span className="sr-only">Text hidden</span>}
      <div className="-ml-3 flex items-center">
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Play: ${hanzi}`}
          aria-pressed={isSpeaking}
          className={`${iconButton} ${isSpeaking ? "text-accent" : "text-text hover:bg-black/5"}`}
        >
          <IoVolumeHigh size={18} aria-hidden />
        </button>
        {message.english && (
          <button
            type="button"
            onClick={() => setShowEnglish((v) => !v)}
            aria-expanded={showEnglish}
            aria-controls={showEnglish ? englishId : undefined}
            className="flex min-h-11 cursor-pointer items-center rounded-full px-3 text-sm font-semibold text-accent hover:bg-black/5"
          >
            {showEnglish ? "Hide translation" : "Translate"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConversationMode({
  scenario,
  onExit,
}: {
  scenario: ConversationScenario;
  onExit: () => void;
}) {
  const { openPaywall } = usePaywall();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPinyin, setShowPinyin] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSpokenId = useRef<string | null>(null);

  const hasUserMessages = messages.some((m) => m.role === "user");

  // Stop audio and cancel any in-flight request when leaving.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopSpeech();
    };
  }, []);

  const playMessage = useCallback((message: Message) => {
    const text = message.hanzi || message.text;
    if (!text) return;
    const clear = () => setSpeakingId((id) => (id === message.id ? null : id));
    setSpeakingId(message.id);
    speak(text, { onEnd: clear, onStop: clear, onError: clear });
  }, []);

  // Auto-speak each new assistant message once, like the reference (including the greeting).
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || lastSpokenId.current === last.id) return;
    lastSpokenId.current = last.id;
    const timeoutId = setTimeout(() => playMessage(last), AUTO_SPEAK_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [messages, playMessage]);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
  }, []);

  // Newest message (or the typing indicator) into view.
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isLoading, scrollToBottom]);

  // The on-screen keyboard resizes the visual viewport: keep the latest message visible.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const onResize = () => scrollToBottom(false);
    viewport.addEventListener("resize", onResize);
    return () => viewport.removeEventListener("resize", onResize);
  }, [scrollToBottom]);

  // Grow the textarea with its content up to a max height, then scroll inside it.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [inputText]);

  const handleSend = async () => {
    const userText = inputText.trim();
    if (!userText || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text: userText };
    const history = [...messages, userMessage];
    setMessages(history);
    setInputText("");
    setIsLoading(true);
    stopSpeech();

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await requestReply(scenario, history, controller.signal, openPaywall);
      if (controller.signal.aborted) return;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: reply.text || reply.hanzi,
          hanzi: reply.hanzi,
          pinyin: reply.pinyin,
          english: reply.english,
        },
      ]);
      recordConversationTurn();
      // 9d replaces this with the completion screen.
      if (reply.conversationComplete) toast.success("Conversation complete!");
    } catch (err) {
      if (controller.signal.aborted) return;
      // Undo the optimistic bubble and give the text back (unless the user already typed more).
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInputText((current) => (current.trim() ? current : userText));
      if (!(err instanceof HandledError)) {
        toast.error("Couldn't send your message. Please try again.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a line. Never send mid-IME composition (pinyin keyboards!).
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    void handleSend();
  };

  const handleExit = () => {
    if (hasUserMessages) setIsConfirmingExit(true);
    else onExit();
  };

  const canSend = inputText.trim().length > 0 && !isLoading;

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-icon/20 px-2 py-1.5">
        <button
          type="button"
          onClick={handleExit}
          aria-label="Exit conversation"
          className={`${iconButton} text-text hover:bg-black/5`}
        >
          <IoClose size={24} aria-hidden />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-base font-semibold text-text">{scenario.title}</h1>
          <p className="truncate text-xs text-subdued">Goal: {scenario.goal}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPinyin((v) => !v)}
          aria-pressed={showPinyin}
          aria-label="Show pinyin"
          title={showPinyin ? "Hide pinyin" : "Show pinyin"}
          className={`${iconButton} text-base font-bold text-accent hover:bg-black/5`}
        >
          <span lang="zh-CN" aria-hidden>
            {showPinyin ? "拼" : "汉"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIsBlurred((v) => !v)}
          aria-pressed={isBlurred}
          aria-label="Hide partner's text"
          title={isBlurred ? "Show text" : "Hide text (listening practice)"}
          className={`${iconButton} text-text hover:bg-black/5`}
        >
          {isBlurred ? <IoEyeOffOutline size={24} aria-hidden /> : <IoEyeOutline size={24} aria-hidden />}
        </button>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-4 pb-5"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            showPinyin={showPinyin}
            isBlurred={isBlurred}
            isSpeaking={speakingId === message.id}
            onPlay={() => playMessage(message)}
          />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      <footer className="shrink-0 border-t border-icon/20 bg-white px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          {/* 9d: voice input — this becomes the record/stop button. */}
          <button
            type="button"
            disabled
            aria-label="Voice input (coming soon)"
            title="Voice input coming soon"
            className={`${iconButton} bg-accent text-white disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <IoMic size={22} aria-hidden />
          </button>

          <div className="flex min-h-11 min-w-0 flex-1 items-center rounded-[22px] bg-text/[0.06] px-4 py-2.5">
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <textarea
              ref={textareaRef}
              id="chat-input"
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_INPUT_LENGTH}
              placeholder="Type a message..."
              enterKeyHint="send"
              autoComplete="off"
              aria-describedby={inputText.length >= COUNTER_THRESHOLD ? "chat-input-count" : undefined}
              // text-base = 16px: smaller inputs make iOS Safari zoom in on focus.
              className="block max-h-[120px] w-full resize-none bg-transparent text-base leading-6 text-text outline-none placeholder:text-[#9ca3af]"
            />
          </div>

          <button
            type="submit"
            disabled={!canSend}
            aria-label={isLoading ? "Sending" : "Send message"}
            className={`${iconButton} bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isLoading ? (
              <span
                className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin"
                aria-hidden
              />
            ) : (
              <IoArrowUp size={20} aria-hidden />
            )}
          </button>
        </form>
        {inputText.length >= COUNTER_THRESHOLD && (
          <p
            id="chat-input-count"
            className={`mt-1 pr-14 text-right text-xs ${inputText.length >= MAX_INPUT_LENGTH ? "text-danger" : "text-subdued"}`}
          >
            {inputText.length}/{MAX_INPUT_LENGTH}
          </p>
        )}
      </footer>

      <ConfirmDialog
        visible={isConfirmingExit}
        title="Leave conversation?"
        description="Your conversation will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        destructive
        onConfirm={() => {
          setIsConfirmingExit(false);
          onExit();
        }}
        onCancel={() => setIsConfirmingExit(false)}
      />
    </div>
  );
}
