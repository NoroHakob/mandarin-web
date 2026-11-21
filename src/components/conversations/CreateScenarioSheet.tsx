"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { IoChevronBack, IoHappyOutline, IoImageOutline, IoPersonOutline } from "react-icons/io5";
import { toast } from "sonner";
import { usePaywall } from "@/components/subscription/PaywallProvider";
import type { ConversationScenario } from "@/lib/course";
import {
  CUSTOM_SCENARIO_ICON,
  createCustomScenarioId,
  saveCustomScenario,
  toCustomScenario,
} from "@/lib/customScenarios";
import { supabase } from "@/lib/supabase";

// Same caps the reference's scenario-generate function applies to its inputs.
export const ROLE_MAX_LENGTH = 80;
export const SCENE_MAX_LENGTH = 600;

const GENERIC_ERROR = "Couldn't create the scenario. Please try again.";

/** Thrown for failures that already got their own UI (paywall, rate-limit toast). */
class HandledError extends Error {}

/** Calls POST /api/scenario-generate and turns the response into a storable custom scenario. */
async function generateScenario(
  input: { myRole: string; aiRole: string; sceneDescription: string },
  signal: AbortSignal,
  onPremiumRequired: () => void,
): Promise<ConversationScenario> {
  // Read the session at click time so the token is the freshest one.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch("/api/scenario-generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
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
  if (!res.ok) throw new Error(`scenario-generate failed (${res.status})`);

  const data: unknown = await res.json();
  const scenario = toCustomScenario({
    ...(typeof data === "object" && data !== null ? data : {}),
    id: createCustomScenarioId(),
    icon: CUSTOM_SCENARIO_ICON,
    isFree: false,
  });
  if (!scenario) throw new Error("Invalid scenario response");
  return scenario;
}

function Field({
  id,
  icon: Icon,
  label,
  length,
  maxLength,
  multiline = false,
  disabled = false,
  children,
}: {
  id: string;
  icon: IconType;
  label: string;
  length: number;
  maxLength: number;
  multiline?: boolean;
  disabled?: boolean;
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
        } ${disabled ? "bg-black/[0.03] opacity-60" : ""}`}
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
 * and covers the tab bar. Generate saves the new scenario and hands it to `onCreated`.
 */
export default function CreateScenarioSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  /** Called after the scenario is saved; the parent closes this sheet and shows the scenario. */
  onCreated: (scenario: ConversationScenario) => void;
}) {
  const { openPaywall } = usePaywall();
  const [myRole, setMyRole] = useState("");
  const [aiRole, setAiRole] = useState("");
  const [scene, setScene] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const ids = {
    title: `${baseId}-title`,
    hint: `${baseId}-hint`,
    myRole: `${baseId}-my-role`,
    aiRole: `${baseId}-ai-role`,
    scene: `${baseId}-scene`,
  };

  // Focus the first field on open; give focus back to the opener and cancel any request on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstInputRef.current?.focus();
    return () => {
      abortRef.current?.abort();
      previouslyFocused?.focus();
    };
  }, []);

  // Like the reference, the sheet can't be dismissed while a scenario is being generated.
  useEffect(() => {
    if (isGenerating) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, isGenerating]);

  const canGenerate = scene.trim().length > 0 && !isGenerating;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    try {
      const scenario = await generateScenario(
        { myRole, aiRole, sceneDescription: scene },
        controller.signal,
        openPaywall,
      );
      if (controller.signal.aborted) return;
      saveCustomScenario(scenario);
      onCreated(scenario);
    } catch (err) {
      if (controller.signal.aborted || err instanceof HandledError) return;
      toast.error(GENERIC_ERROR);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      // Inputs are kept on error so the user can retry; on success the sheet unmounts.
      if (!controller.signal.aborted) setIsGenerating(false);
    }
  };

  const inputClass =
    "min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-subdued disabled:cursor-not-allowed";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ids.title}
      aria-describedby={ids.hint}
      aria-busy={isGenerating}
      className="fixed inset-0 z-40 flex flex-col bg-white motion-safe:animate-sheet-up"
    >
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isGenerating}
          aria-label="Back"
          className="-ml-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-text hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
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
          void handleGenerate();
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
              disabled={isGenerating}
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
                disabled={isGenerating}
                className={inputClass}
              />
            </Field>

            <Field
              id={ids.aiRole}
              icon={IoHappyOutline}
              label="AI's role (optional)"
              length={aiRole.length}
              maxLength={ROLE_MAX_LENGTH}
              disabled={isGenerating}
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
                disabled={isGenerating}
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
              disabled={isGenerating}
            >
              <textarea
                id={ids.scene}
                placeholder="Set the scene and the chat topic here"
                value={scene}
                maxLength={SCENE_MAX_LENGTH}
                onChange={(e) => setScene(e.target.value)}
                aria-describedby={`${ids.scene}-count`}
                required
                disabled={isGenerating}
                className={`${inputClass} h-full resize-none`}
              />
            </Field>
          </div>
        </div>

        <footer className="shrink-0 border-t border-border p-5">
          <button
            type="submit"
            disabled={!canGenerate}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent p-4 text-lg font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating && (
              <span
                className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin"
                aria-hidden
              />
            )}
            {isGenerating ? "Generating…" : "Generate"}
          </button>
          <p className="sr-only" role="status" aria-live="polite">
            {isGenerating ? "Generating your scenario…" : ""}
          </p>
        </footer>
      </form>
    </div>
  );
}
