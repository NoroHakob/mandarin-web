"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  IoAnalyticsOutline,
  IoBookOutline,
  IoBulbOutline,
  IoCheckmarkCircle,
  IoClose,
  IoMicOutline,
  IoPeopleOutline,
  IoStar,
  IoTrendingUpOutline,
} from "react-icons/io5";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ANNUAL_SAVINGS_PERCENT, PLANS, formatPrice, type BillingCycle } from "@/data/plans";

type Feature = { icon: IconType; title: string; description: string };

const FEATURES: Feature[] = [
  {
    icon: IoBookOutline,
    title: "Advanced Curriculum",
    description: "Access the world's most advanced speaking curriculum",
  },
  {
    icon: IoTrendingUpOutline,
    title: "Target Your Mistakes",
    description: "Lessons personalized to fix your frequent mistakes",
  },
  {
    icon: IoBulbOutline,
    title: "Custom Vocabulary",
    description: "Learn vocabulary tailored to your interests",
  },
  {
    icon: IoPeopleOutline,
    title: "Situational Roleplays",
    description: "Practice real-world conversations",
  },
  {
    icon: IoMicOutline,
    title: "Pronunciation Coach",
    description: "Get instant feedback on your pronunciation",
  },
  {
    icon: IoAnalyticsOutline,
    title: "Progress Reports",
    description: "Track your learning journey with detailed analytics",
  },
];

const textShadow = "[text-shadow:0_1px_3px_rgba(0,0,0,0.3)]";

export function Paywall({
  closing,
  onClose,
  onExited,
}: {
  /** True while the slide-down exit animation plays. */
  closing: boolean;
  onClose: () => void;
  onExited: () => void;
}) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const { refreshProfile } = useAuth();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const selectedPlan = PLANS[billingCycle];

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
      // Read the session at click time so the token is the freshest one.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      const res = await fetch("/api/start-trial", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 409) {
        toast.error("You've already used your free trial");
        return;
      }
      if (!res.ok) throw new Error(`start-trial failed (${res.status})`);

      await refreshProfile();
      toast.success("Your free week has started!");
      onClose();
    } catch {
      toast.error("Could not start trial. Please try again.");
    } finally {
      setIsStartingTrial(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onAnimationEnd={(e) => {
        // Only the sheet's own exit animation (not bubbled child animations) ends the close.
        if (closing && e.target === e.currentTarget && e.animationName === "sheet-down") onExited();
      }}
      className={`absolute inset-0 z-50 flex flex-col bg-[#1a1a2e] bg-[linear-gradient(to_bottom,var(--color-accent)_0%,#ff6b35_40%,#1a1a2e_100%)] text-white ${
        closing ? "motion-safe:animate-sheet-down" : "motion-safe:animate-sheet-up"
      }`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/50"
        >
          <IoClose size={24} />
        </button>
        <span className="text-lg font-bold">Go Premium</span>
        <span className="w-10" aria-hidden />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-6 pb-10">
        <h2
          id="paywall-title"
          className={`mb-8 text-center text-[26px] leading-tight font-bold ${textShadow}`}
        >
          Speak Mandarin
          <br />
          with <span className="text-[#FFD700]">confidence</span>
        </h2>

        <ul className="mb-8 grid grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="rounded-2xl border-[1.5px] border-white/20 bg-[rgba(26,26,46,0.7)] p-4"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(255,73,0,0.3)] bg-[rgba(255,73,0,0.2)]">
                <Icon size={24} className="text-accent" />
              </div>
              <h3 className="mb-1 text-sm font-bold">{title}</h3>
              <p className="text-xs leading-4 text-white/85">{description}</p>
            </li>
          ))}
        </ul>

        <div
          role="radiogroup"
          aria-label="Billing cycle"
          className="mb-5 flex rounded-xl border-[1.5px] border-white/20 bg-[rgba(26,26,46,0.6)] p-1"
        >
          {(["annual", "monthly"] as const).map((cycle) => {
            const active = billingCycle === cycle;
            return (
              <button
                key={cycle}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setBillingCycle(cycle)}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold transition-colors ${
                  active ? "bg-white text-[#1a1a2e]" : "text-white/90"
                }`}
              >
                {cycle === "annual" ? "Annual" : "Monthly"}
                {cycle === "annual" && active && ANNUAL_SAVINGS_PERCENT > 0 && (
                  <span className="rounded-md bg-success px-2 py-1 text-[11px] font-bold text-white">
                    Save {ANNUAL_SAVINGS_PERCENT}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative mb-5 rounded-3xl border-2 border-accent bg-white p-6 text-[#1a1a2e] shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
          {selectedPlan.recommended && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1.5 text-[11px] font-extrabold tracking-[1px] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
              BEST VALUE
            </span>
          )}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{selectedPlan.name}</p>
              <p className="mt-1 text-sm text-subdued">{selectedPlan.billingCycle}</p>
            </div>
            <div className="text-right">
              <p className="text-[32px] leading-tight font-extrabold">{formatPrice(selectedPlan)}</p>
              <p className="text-sm text-subdued">{selectedPlan.period}</p>
            </div>
          </div>
          <ul className="flex flex-col gap-3 border-t border-[#e5e7eb] pt-4">
            {selectedPlan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <IoCheckmarkCircle size={20} className="text-success" />
                <span className="text-sm font-medium text-[#4b5563]">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={handleStartTrial}
          disabled={isStartingTrial}
          className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-3xl bg-accent px-8 py-[18px] text-lg font-bold shadow-[0_4px_8px_rgba(255,73,0,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <IoStar size={20} />
          {isStartingTrial ? "Starting..." : "Start my free week"}
        </button>

        <p className="mb-8 text-center text-sm font-semibold">Try 7 days free. Cancel anytime.</p>

        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <button type="button" className="cursor-pointer text-white/80 underline">
            Restore Purchase
          </button>
          <span className="text-white/60" aria-hidden>
            •
          </span>
          <button type="button" className="cursor-pointer text-white/80 underline">
            Terms
          </button>
          <span className="text-white/60" aria-hidden>
            •
          </span>
          <button type="button" className="cursor-pointer text-white/80 underline">
            Privacy
          </button>
        </nav>
      </div>
    </div>
  );
}
