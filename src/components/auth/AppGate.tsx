"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import IntroScreen from "./IntroScreen";

/** Routes that must render without a session (e.g. finishing the magic-link sign-in). */
const PUBLIC_PATHS = ["/auth/callback"];

export default function AppGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();

  if (PUBLIC_PATHS.includes(pathname)) return children;

  if (loading) {
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

  if (!session) return <IntroScreen />;

  return children;
}
