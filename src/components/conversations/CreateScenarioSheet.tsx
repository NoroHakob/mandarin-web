"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { IoChevronBack, IoHappyOutline, IoImageOutline, IoPersonOutline } from "react-icons/io5";
import { toast } from "sonner";

// Same caps the reference's scenario-generate function applies to its inputs.
export const ROLE_MAX_LENGTH = 80;
export const SCENE_MAX_LENGTH = 600;

function Field({
  id,
  icon: Icon,
  label,
  length,
  maxLength,
  multiline = false,
  children,
}: {
  id: string;
  icon: IconType;
  label: string;
  length: number;
  maxLength: number;
  multiline?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={`flex gap-3 rounded-xl border border-border p-4 focus-within:border-accent ${
          multiline ? "h-[140px] items-start" : "items-center"
        }`}
      >
        <Icon size={20} className={`shrink-0 text-subdued ${multiline ? "mt-0.5" : ""}`} aria-hidden />
        {children}
      </div>
      <p
        id={`${id}-count`}
        className={`mt-1 text-right text-xs ${length >= maxLength ? "text-danger" : "text-subdued"}`}
      >
        {length}/{maxLength}
      </p>
    </div>
  );
}

/**
 * Full-height sheet for describing a custom roleplay (port of the reference's "Create" modal).
 * Uses `fixed`, which stays inside `.app-column` (its transform makes it the containing block)
 * and covers the tab bar. Generation isn't wired up yet.
 */
export default function CreateScenarioSheet({ onClose }: { onClose: () => void }) {
  const [myRole, setMyRole] = useState("");
  const [aiRole, setAiRole] = useState("");
  const [scene, setScene] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const ids = {
    title: `${baseId}-title`,
    hint: `${baseId}-hint`,
    myRole: `${baseId}-my-role`,
    aiRole: `${baseId}-ai-role`,
    scene: `${baseId}-scene`,
  };

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstInputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const canGenerate = scene.trim().length > 0;

  const handleGenerate = () => {
    if (!canGenerate) return;
    toast("Coming in the next step");
  };

  const inputClass =
    "min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-subdued";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ids.title}
      aria-describedby={ids.hint}
      className="fixed inset-0 z-40 flex flex-col bg-white motion-safe:animate-sheet-up"
    >
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="-ml-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-text hover:bg-black/5"
        >
          <IoChevronBack size={24} aria-hidden />
        </button>
        <h2 id={ids.title} className="text-base font-semibold text-text">
          Create
        </h2>
        <span className="w-10" aria-hidden />
      </header>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          handleGenerate();
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <p id={ids.hint} className="mb-5 text-base text-subdued">
            Fill out each role and describe in detail the scene and the conversation you want to
            have.
          </p>

          <div className="flex flex-col gap-2">
            <Field
              id={ids.myRole}
              icon={IoPersonOutline}
              label="My role (optional)"
              length={myRole.length}
              maxLength={ROLE_MAX_LENGTH}
            >
              <input
                ref={firstInputRef}
                id={ids.myRole}
                type="text"
                placeholder="My role"
                value={myRole}
                maxLength={ROLE_MAX_LENGTH}
                onChange={(e) => setMyRole(e.target.value)}
                aria-describedby={`${ids.myRole}-count`}
                autoComplete="off"
                className={inputClass}
              />
            </Field>

            <Field
              id={ids.aiRole}
              icon={IoHappyOutline}
              label="AI's role (optional)"
              length={aiRole.length}
              maxLength={ROLE_MAX_LENGTH}
            >
              <input
                id={ids.aiRole}
                type="text"
                placeholder="AI's role"
                value={aiRole}
                maxLength={ROLE_MAX_LENGTH}
                onChange={(e) => setAiRole(e.target.value)}
                aria-describedby={`${ids.aiRole}-count`}
                autoComplete="off"
                className={inputClass}
              />
            </Field>

            <Field
              id={ids.scene}
              icon={IoImageOutline}
              label="Scene and chat topic"
              length={scene.length}
              maxLength={SCENE_MAX_LENGTH}
              multiline
            >
              <textarea
                id={ids.scene}
                placeholder="Set the scene and the chat topic here"
                value={scene}
                maxLength={SCENE_MAX_LENGTH}
                onChange={(e) => setScene(e.target.value)}
                aria-describedby={`${ids.scene}-count`}
                required
                className={`${inputClass} h-full resize-none`}
              />
            </Field>
          </div>
        </div>

        <footer className="shrink-0 border-t border-border p-5">
          <button
            type="submit"
            disabled={!canGenerate}
            className="w-full cursor-pointer rounded-xl bg-accent p-4 text-lg font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generate
          </button>
        </footer>
      </form>
    </div>
  );
}
