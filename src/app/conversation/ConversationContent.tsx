"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { IoChatbubblesOutline } from "react-icons/io5";
import ConversationMode from "@/components/conversation/ConversationMode";
import { usePaywall } from "@/components/subscription/PaywallProvider";
import { useStoredValue } from "@/hooks/useStoredValue";
import { useAuth } from "@/lib/auth";
import { findScenario, type ConversationScenario } from "@/lib/course";
import { CUSTOM_SCENARIOS_KEY, parseCustomScenarios } from "@/lib/customScenarios";

const CONVERSATIONS_PATH = "/conversations";

/**
 * Resolves ?scenarioId (preset) or ?customScenarioId (localStorage). `undefined` while custom
 * scenarios are still loading on the client, `null` when not found.
 */
function useScenario(
  scenarioId: string | null,
  customScenarioId: string | null,
): ConversationScenario | null | undefined {
  const rawCustom = useStoredValue(CUSTOM_SCENARIOS_KEY);
  return useMemo(() => {
    if (scenarioId) return findScenario(scenarioId) ?? null;
    if (!customScenarioId) return null;
    if (rawCustom === undefined) return undefined;
    return parseCustomScenarios(rawCustom)[customScenarioId]?.scenario ?? null;
  }, [scenarioId, customScenarioId, rawCustom]);
}

function NotFound() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white px-8 text-center">
      <IoChatbubblesOutline size={48} className="text-subdued" aria-hidden />
      <h1 className="text-xl font-bold text-text">Scenario not found</h1>
      <p className="text-base text-subdued">
        This conversation doesn&apos;t exist or was created on another device.
      </p>
      <Link
        href={CONVERSATIONS_PATH}
        className="mt-2 flex min-h-11 items-center rounded-3xl bg-accent px-6 py-3 font-bold text-white"
      >
        Back to conversations
      </Link>
    </div>
  );
}

function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span
        role="status"
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-accent"
      />
    </div>
  );
}

export default function ConversationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPremium } = useAuth();
  const { openPaywall } = usePaywall();
  const scenario = useScenario(searchParams.get("scenarioId"), searchParams.get("customScenarioId"));

  // AppGate only renders pages once auth has loaded, so isPremium is settled here.
  const isLocked = !!scenario && !scenario.isFree && !isPremium;

  useEffect(() => {
    if (!isLocked) return;
    openPaywall();
    router.replace(CONVERSATIONS_PATH);
  }, [isLocked, openPaywall, router]);

  const exit = useCallback(() => router.replace(CONVERSATIONS_PATH), [router]);

  if (scenario === undefined || isLocked) return <Loading />;
  if (scenario === null) return <NotFound />;

  // Keyed by scenario so switching scenarios via the URL starts a fresh conversation.
  return <ConversationMode key={scenario.id} scenario={scenario} onExit={exit} />;
}
