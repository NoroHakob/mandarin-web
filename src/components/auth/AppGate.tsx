"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import IntroScreen from "./IntroScreen";

/** Routes that must render without a session (finishing sign-in, legal pages). */
const PUBLIC_PATHS = ["/auth/callback", "/privacy", "/terms"];
const ONBOARDING_PATH = "/onboarding";

function Spinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <span
        role="status"
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/25 border-t-white"
      />
    </div>
  );
}

export default function AppGate({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const onboarded = !!profile?.onboarding_completed;
  const onOnboarding = pathname === ONBOARDING_PATH;

  // Where the user should be instead of the current page, if anywhere.
  let redirectTo: string | null = null;
  if (!isPublic && !loading && session) {
    if (!onboarded && !onOnboarding) redirectTo = ONBOARDING_PATH;
    else if (onboarded && onOnboarding) redirectTo = "/lessons";
  }

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (isPublic) return children;
  if (loading) return <Spinner />;
  if (!session) return <IntroScreen />;
  // Keep the spinner up until the redirect lands, so the wrong page never flashes.
  if (redirectTo) return <Spinner />;

  return children;
}
