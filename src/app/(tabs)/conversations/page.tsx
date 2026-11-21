"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { IoChatbox, IoColorWand, IoLockClosed } from "react-icons/io5";
import Ionicon from "@/components/Ionicon";
import CreateScenarioSheet from "@/components/conversations/CreateScenarioSheet";
import DifficultyBadge from "@/components/conversations/DifficultyBadge";
import ScenarioDetailSheet from "@/components/conversations/ScenarioDetailSheet";
import { usePaywall } from "@/components/subscription/PaywallProvider";
import { useCustomScenarios } from "@/hooks/useCustomScenarios";
import { useAuth } from "@/lib/auth";
import { COURSE_DATA, type ConversationScenario } from "@/lib/course";
import { isCustomScenarioId } from "@/lib/customScenarios";

function conversationHref(scenario: ConversationScenario): string {
  const param = isCustomScenarioId(scenario.id) ? "customScenarioId" : "scenarioId";
  return `/conversation?${param}=${encodeURIComponent(scenario.id)}`;
}

function ScenarioCard({
  scenario,
  locked,
  onSelect,
}: {
  scenario: ConversationScenario;
  locked: boolean;
  onSelect: (scenario: ConversationScenario) => void;
}) {
  const isCustom = isCustomScenarioId(scenario.id);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(scenario)}
        aria-label={`${scenario.title}, ${scenario.difficulty}${locked ? ", locked: premium required" : ""}`}
        className="flex h-full min-h-[190px] w-full cursor-pointer flex-col rounded-2xl border border-border bg-white p-4 text-left transition-transform hover:bg-black/[0.02] active:scale-[0.98]"
      >
        <div className="mb-3 flex min-h-6 items-center gap-1.5" aria-hidden>
          {isCustom && (
            <span className="rounded-lg bg-text/[0.13] px-2 py-1 text-[10px] font-bold text-subdued">
              CUSTOM
            </span>
          )}
          {scenario.isFree && (
            <span className="rounded-lg bg-accent px-2 py-1 text-[10px] font-bold text-white">
              FREE
            </span>
          )}
          {locked && <IoLockClosed size={20} className="ml-auto text-subdued" />}
        </div>

        <h3 className="text-lg leading-tight font-semibold text-text">{scenario.title}</h3>
        <p className="mt-1 line-clamp-3 text-[13px] leading-snug text-subdued">
          {scenario.description}
        </p>

        <div className="mt-auto flex items-end justify-between pt-3">
          <DifficultyBadge difficulty={scenario.difficulty} />
          <Ionicon
            name={scenario.icon}
            size={36}
            className={locked ? "text-subdued" : "text-accent"}
          />
        </div>
      </button>
    </li>
  );
}

function ScenarioGrid({
  scenarios,
  isLocked,
  onSelect,
}: {
  scenarios: ConversationScenario[];
  isLocked: (scenario: ConversationScenario) => boolean;
  onSelect: (scenario: ConversationScenario) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-4">
      {scenarios.map((scenario) => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          locked={isLocked(scenario)}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

export default function ConversationsPage() {
  const router = useRouter();
  const { isPremium } = useAuth();
  const { openPaywall } = usePaywall();
  const customScenarios = useCustomScenarios();
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario | null>(null);

  const isLocked = useCallback(
    (scenario: ConversationScenario) => !scenario.isFree && !isPremium,
    [isPremium],
  );

  const handleScenarioSelect = (scenario: ConversationScenario) => {
    if (isLocked(scenario)) {
      openPaywall();
      return;
    }
    setSelectedScenario(scenario);
  };

  const closeDetailSheet = useCallback(() => setSelectedScenario(null), []);

  const handleStartConversation = () => {
    if (!selectedScenario) return;
    const href = conversationHref(selectedScenario);
    setSelectedScenario(null);
    router.push(href);
  };

  const handleCreateCustom = () => {
    if (isPremium) setIsCreatingCustom(true);
    else openPaywall();
  };

  const closeCreateSheet = useCallback(() => setIsCreatingCustom(false), []);

  // As in the reference: after generating, close Create and show the new scenario's details.
  const handleScenarioCreated = (scenario: ConversationScenario) => {
    setIsCreatingCustom(false);
    setSelectedScenario(scenario);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <h1 className="text-[22px] font-bold text-text">Conversations</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-12">
        {!isPremium && (
          <button
            type="button"
            onClick={openPaywall}
            className="mb-5 flex w-full cursor-pointer flex-col items-center rounded-2xl bg-accent p-5 text-center text-white shadow-[0_4px_8px_rgba(255,73,0,0.2)] transition-transform active:scale-[0.99]"
          >
            <IoChatbox size={24} className="mb-2" aria-hidden />
            <span className="mb-1 text-lg font-bold">Get full access to Convo</span>
            <span className="mb-4 text-sm text-white/80">
              Unlock Convo Premium to get access to custom scenarios and more
            </span>
            <span className="rounded-3xl bg-white px-6 py-2.5 font-bold text-accent">
              Start free trial
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCreateCustom}
          aria-label={`Create scenario${isPremium ? "" : ", premium required"}`}
          className="mb-6 flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border p-5 text-left transition-transform hover:bg-black/[0.02] active:scale-[0.99]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-text">Free Talk</span>
            <span className="mt-1 block text-base text-subdued">
              Describe a scenario of your choice to create your custom roleplay experience.
            </span>
          </span>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF]">
            <IoColorWand size={32} color="#A855F7" aria-hidden />
          </span>
        </button>

        {customScenarios.length > 0 && (
          <section className="mb-8" aria-labelledby="my-scenarios-heading">
            <h2 id="my-scenarios-heading" className="mb-3 text-sm font-bold text-[#8e8e93] uppercase">
              My scenarios
            </h2>
            <ScenarioGrid
              scenarios={customScenarios}
              isLocked={isLocked}
              onSelect={handleScenarioSelect}
            />
          </section>
        )}

        <section aria-labelledby="scenarios-heading">
          <h2 id="scenarios-heading" className="mb-3 text-sm font-bold text-[#8e8e93] uppercase">
            Scenarios
          </h2>
          <ScenarioGrid
            scenarios={COURSE_DATA.scenarios}
            isLocked={isLocked}
            onSelect={handleScenarioSelect}
          />
        </section>
      </main>

      {isCreatingCustom && (
        <CreateScenarioSheet onClose={closeCreateSheet} onCreated={handleScenarioCreated} />
      )}
      {selectedScenario && (
        <ScenarioDetailSheet
          key={selectedScenario.id}
          scenario={selectedScenario}
          onClose={closeDetailSheet}
          onStart={handleStartConversation}
        />
      )}
    </div>
  );
}
