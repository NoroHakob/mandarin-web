"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const GENERIC_ERROR = "Sign-in failed. Please try again.";

/**
 * Finishes both magic-link and OAuth (Google) sign-ins: with PKCE, both land here as
 * /auth/callback?code=…, and the code is exchanged the same way. Every outcome ends in
 * router.replace, so the one-time code never stays in the URL or browser history.
 */
export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  // e.g. ?error=access_denied when the user cancels on Google's consent screen.
  const urlError = searchParams.get("error") ?? searchParams.get("error_description");

  // A PKCE code can only be exchanged once; guard against Strict Mode's double effect run
  // (this also keeps failure toasts from showing twice).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const fail = (message: string) => {
      // Never echo provider/Supabase error text — it can be confusing or leak details.
      toast.error(message);
      router.replace("/");
    };

    if (urlError) {
      fail(urlError === "access_denied" ? "Sign-in was cancelled" : GENERIC_ERROR);
      return;
    }
    if (!code) {
      fail(GENERIC_ERROR);
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) fail(GENERIC_ERROR);
        // AppGate sends users who haven't finished onboarding on to /onboarding.
        else router.replace("/lessons");
      })
      .catch(() => fail(GENERIC_ERROR));
  }, [code, urlError, router]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <span
        role="status"
        aria-label="Signing in"
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/25 border-t-white"
      />
      <p className="text-sm text-white/70">Signing you in…</p>
    </div>
  );
}
