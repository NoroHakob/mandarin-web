"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  IoChevronForward,
  IoHelpCircleOutline,
  IoLogOutOutline,
  IoSettingsOutline,
  IoStar,
} from "react-icons/io5";
import { toast } from "sonner";
import StatItem from "@/components/StatItem";
import { usePaywall } from "@/components/subscription/PaywallProvider";
import { useSpeakingListeningStats } from "@/hooks/useSpeakingListeningStats";
import { useAuth } from "@/lib/auth";

const cardShadow = "shadow-[0_2px_8px_rgba(0,0,0,0.08)]";

function MenuItem({
  icon: Icon,
  title,
  href,
  last,
}: {
  icon: IconType;
  title: string;
  /** Page to open; items without one aren't built yet. */
  href?: string;
  last?: boolean;
}) {
  const className = `flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left ${
    last ? "" : "border-b-[0.5px] border-[#bababe]"
  }`;
  const content = (
    <>
      <span className="flex flex-1 items-center gap-4">
        <Icon size={24} className="text-subdued" aria-hidden />
        <span className="text-base font-semibold text-text">{title}</span>
      </span>
      <IoChevronForward size={20} className="text-subdued" aria-hidden />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => toast("Coming soon")} className={className}>
      {content}
    </button>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfilePage() {
  const { user, profile, isPremium, premiumExpiresAt, signOut } = useAuth();
  const { openPaywall } = usePaywall();
  const { stats } = useSpeakingListeningStats();
  const [signingOut, setSigningOut] = useState(false);

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Learner";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      // AppGate swaps to the intro screen once the session clears.
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out. Please reload the page.");
      setSigningOut(false);
    }
  };

  const premiumContent: ReactNode = (
    <>
      <span className="flex flex-1 items-center gap-3">
        <IoStar size={24} aria-hidden />
        <span className="flex-1">
          <span className="mb-0.5 block text-lg font-bold">
            {isPremium ? "Premium Active" : "Get Premium"}
          </span>
          <span className="block text-[13px] text-white/90">
            {isPremium
              ? premiumExpiresAt
                ? `Premium ends ${formatDate(premiumExpiresAt)}`
                : "Unlocked premium features"
              : "Unlock unlimited access to all lessons"}
          </span>
        </span>
      </span>
      {!isPremium && <IoChevronForward size={20} aria-hidden />}
    </>
  );
  const premiumClass =
    "mb-8 flex w-full items-center justify-between rounded-3xl bg-accent px-5 py-4 text-left text-white shadow-[0_4px_5px_rgba(0,0,0,0.2)]";

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <h1 className="text-[22px] font-bold text-text">Profile</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-10">
        {/* Profile info */}
        <section
          className={`mb-5 flex flex-col items-center rounded-3xl border-2 border-border bg-white px-5 py-8 ${cardShadow}`}
        >
          <div
            aria-hidden
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-[32px] leading-9 font-bold text-white"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <p className="mb-1 text-2xl font-bold text-text">{displayName}</p>
          <p className="text-sm break-all text-subdued">{user?.email}</p>
        </section>

        {/* Statistics */}
        <div className="mb-5 flex items-center justify-center gap-6 py-2.5">
          <StatItem
            value={Math.floor(stats?.minutesSpoken ?? 0)}
            change={Math.floor(stats?.weeklyChange.spoken ?? 0)}
            label="minutes spoken"
          />
          <div className="h-6 w-px bg-border" />
          <StatItem value={0} label="day streak" />
        </div>

        {/* Premium */}
        {isPremium ? (
          <div className={premiumClass}>{premiumContent}</div>
        ) : (
          <button type="button" onClick={openPaywall} className={`${premiumClass} cursor-pointer`}>
            {premiumContent}
          </button>
        )}

        {/* Settings */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-[#8e8e93] uppercase">Settings</h2>
          <div
            className={`overflow-hidden rounded-3xl border-2 border-border bg-white ${cardShadow}`}
          >
            <MenuItem icon={IoSettingsOutline} title="App Settings" />
            <MenuItem icon={IoHelpCircleOutline} title="Help & Support" href="/help" last />
          </div>
        </section>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-3xl border-2 border-border px-5 py-4 text-base font-semibold text-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IoLogOutOutline size={20} aria-hidden />
          {signingOut ? "Signing out..." : "Sign Out"}
        </button>

        <nav
          aria-label="Legal"
          className="mt-6 flex items-center justify-center gap-2 text-xs text-subdued"
        >
          <Link href="/terms" className="underline">
            Terms of Use
          </Link>
          <span aria-hidden>•</span>
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
        </nav>
      </main>
    </div>
  );
}
