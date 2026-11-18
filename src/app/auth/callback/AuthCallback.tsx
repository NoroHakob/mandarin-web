"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const urlError = searchParams.get("error_description") ?? searchParams.get("error");

  const [exchangeError, setExchangeError] = useState<string | null>(null);
  // A PKCE code can only be exchanged once; guard against Strict Mode's double effect run.
  const started = useRef(false);

  useEffect(() => {
    if (urlError || !code || started.current) return;
    started.current = true;

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setExchangeError(error.message);
      else router.replace("/");
    });
  }, [code, urlError, router]);

  const error = urlError ?? exchangeError ?? (code ? null : "Missing sign-in code.");

  if (!error) {
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

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-8 text-center">
      <h1 className="text-2xl font-bold">Sign-in failed</h1>
      <p className="text-base text-white/70">{error}</p>
      <Link
        href="/"
        replace
        className="rounded-lg bg-white/15 px-6 py-3 text-base font-medium text-white"
      >
        Back
      </Link>
    </div>
  );
}
