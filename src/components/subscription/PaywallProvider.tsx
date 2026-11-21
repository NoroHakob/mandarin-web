"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Paywall } from "./Paywall";

type PaywallContextValue = {
  openPaywall: () => void;
  closePaywall: () => void;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

type Phase = "closed" | "open" | "closing";

/** Slightly longer than the 240ms sheet-down animation in globals.css. */
const EXIT_FALLBACK_MS = 400;

/** Same media query Tailwind's `motion-safe:` variant uses, so JS and CSS always agree. */
function animationsEnabled(): boolean {
  return window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
}

/** Renders the Paywall globally so it stays open across route changes. */
export function PaywallProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("closed");
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExitTimer = useCallback(() => {
    if (exitTimer.current !== null) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
  }, []);

  const finishClose = useCallback(() => {
    clearExitTimer();
    setPhase("closed");
  }, [clearExitTimer]);

  const openPaywall = useCallback(() => {
    clearExitTimer();
    setPhase("open");
  }, [clearExitTimer]);

  const closePaywall = useCallback(() => {
    if (!animationsEnabled()) {
      finishClose();
      return;
    }
    setPhase((p) => (p === "closed" ? p : "closing"));
    // Never rely on animationend alone: it may not fire (e.g. animations disabled mid-close).
    clearExitTimer();
    exitTimer.current = setTimeout(finishClose, EXIT_FALLBACK_MS);
  }, [clearExitTimer, finishClose]);

  useEffect(() => clearExitTimer, [clearExitTimer]);

  const value = useMemo(() => ({ openPaywall, closePaywall }), [openPaywall, closePaywall]);

  return (
    <PaywallContext.Provider value={value}>
      {children}
      {phase !== "closed" && (
        <Paywall closing={phase === "closing"} onClose={closePaywall} onExited={finishClose} />
      )}
    </PaywallContext.Provider>
  );
}

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error("usePaywall must be used within <PaywallProvider>");
  return ctx;
}
