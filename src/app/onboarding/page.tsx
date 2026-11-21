"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  IoAirplaneOutline,
  IoArrowBack,
  IoBookOutline,
  IoBriefcaseOutline,
  IoGameControllerOutline,
  IoPeopleOutline,
} from "react-icons/io5";
import { toast } from "sonner";
import { usePaywall } from "@/components/subscription/PaywallProvider";
import { useAuth } from "@/lib/auth";

const LEVELS = [
  { id: "beginner", title: "Beginner", description: "I know a few words or nothing at all." },
  { id: "intermediate", title: "Intermediate", description: "I can have basic conversations." },
  { id: "advanced", title: "Advanced", description: "I can express myself fluently." },
];

const MOTIVATIONS: { id: string; title: string; icon: IconType }[] = [
  { id: "travel", title: "Travel", icon: IoAirplaneOutline },
  { id: "work", title: "Work", icon: IoBriefcaseOutline },
  { id: "family", title: "Family", icon: IoPeopleOutline },
  { id: "culture", title: "Culture", icon: IoBookOutline },
  { id: "hobby", title: "Hobby", icon: IoGameControllerOutline },
];

const INTERESTS = [
  "Food & Dining",
  "Business",
  "Daily Life",
  "Technology",
  "Art",
  "Music",
  "Politics",
  "Sports",
];

const STEP_COUNT = 4;

const cardBase = "w-full cursor-pointer rounded-2xl border-2 p-5 text-left transition-colors";
const cardIdle = "border-[#E5E7EB] bg-white";
const cardSelected = "border-accent bg-[#fff5f0]";

function toggle(list: string[], item: string) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h1 className="mb-3 text-[28px] leading-8 font-bold text-text">{title}</h1>
      {subtitle && <p className="mb-8 text-base text-subdued">{subtitle}</p>}
    </>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { saveProfile } = useAuth();
  const { openPaywall } = usePaywall();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<string | null>(null);
  const [motivations, setMotivations] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isLastStep = step === STEP_COUNT - 1;
  const isStepValid = [
    name.trim().length > 0,
    !!level,
    motivations.length > 0,
    interests.length > 0,
  ][step];
  const canContinue = isStepValid && !saving;

  const finish = async () => {
    setSaving(true);
    try {
      await saveProfile({
        full_name: name.trim(),
        chinese_level: level,
        motivations,
        interests,
        onboarding_completed: true,
      });
      // The Paywall lives in PaywallProvider, so it stays open across this navigation.
      openPaywall();
      router.replace("/");
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error("Failed to save your profile. Please try again.");
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;
    if (isLastStep) void finish();
    else setStep(step + 1);
  };

  let content: ReactNode;
  if (step === 0) {
    content = (
      <>
        <StepHeading
          title="What should we call you?"
          subtitle="Your name will be used to personalize your lessons."
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleContinue();
          }}
          placeholder="Your Name"
          aria-label="Your name"
          autoComplete="given-name"
          autoFocus
          className="mt-5 w-full border-b-2 border-icon bg-transparent py-3 text-xl text-text outline-none placeholder:text-[#9CA3AF] focus:border-accent"
        />
      </>
    );
  } else if (step === 1) {
    content = (
      <>
        <StepHeading title="How much Chinese do you know?" />
        <div className="mt-5 flex flex-col gap-4">
          {LEVELS.map((l) => {
            const selected = level === l.id;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setLevel(l.id)}
                className={`${cardBase} ${selected ? cardSelected : cardIdle}`}
              >
                <span
                  className={`mb-1 block text-lg font-semibold ${selected ? "text-accent" : "text-text"}`}
                >
                  {l.title}
                </span>
                <span className="block text-sm text-subdued">{l.description}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  } else if (step === 2) {
    content = (
      <>
        <StepHeading title="Why are you learning Chinese?" subtitle="Select all that apply." />
        <div className="mt-2.5 flex flex-col gap-4">
          {MOTIVATIONS.map(({ id, title, icon: Icon }) => {
            const selected = motivations.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => setMotivations((m) => toggle(m, id))}
                className={`${cardBase} flex items-center gap-4 ${selected ? cardSelected : cardIdle}`}
              >
                <Icon size={24} className={selected ? "text-accent" : "text-icon"} />
                <span className={`text-lg font-semibold ${selected ? "text-accent" : "text-text"}`}>
                  {title}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  } else {
    content = (
      <>
        <StepHeading title="What are you interested in?" subtitle="Select all that apply." />
        <div className="mt-5 flex flex-wrap gap-3">
          {INTERESTS.map((interest) => {
            const selected = interests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                aria-pressed={selected}
                onClick={() => setInterests((i) => toggle(i, interest))}
                className={`cursor-pointer rounded-3xl border px-5 py-2.5 text-base font-medium transition-colors ${
                  selected ? "border-accent bg-accent text-white" : "border-[#E5E7EB] text-text"
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <header className="flex h-[60px] shrink-0 items-center px-5">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={saving}
            aria-label="Back"
            className="mr-4 cursor-pointer text-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IoArrowBack size={24} />
          </button>
        )}
        <div
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          aria-valuenow={step + 1}
          className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[#E5E7EB]"
        >
          <div
            className="h-full rounded-[3px] bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6">
        <div key={step} className="motion-safe:animate-step-in">
          {content}
        </div>
      </main>

      <footer className="shrink-0 border-t border-[#E5E7EB] p-6">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className={`flex w-full items-center justify-center rounded-[30px] px-6 py-4 text-lg font-bold text-white transition-colors ${
            isStepValid
              ? "cursor-pointer bg-accent shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
              : "cursor-not-allowed bg-[#E5E7EB]"
          } disabled:cursor-not-allowed ${saving ? "opacity-70" : ""}`}
        >
          {isLastStep ? (saving ? "Saving..." : "Get Started") : "Continue"}
        </button>
      </footer>
    </div>
  );
}
