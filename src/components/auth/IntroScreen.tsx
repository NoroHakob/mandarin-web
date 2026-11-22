"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { FaApple, FaGoogle } from "react-icons/fa";
import { MdOutlineEmail } from "react-icons/md";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import EmailAuth from "./EmailAuth";

const MENU_HEIGHT = 250;
const PEEK_MENU_HEIGHT = 50;
const CLOSED_POSITION = MENU_HEIGHT - PEEK_MENU_HEIGHT;
const SWIPE_THRESHOLD = 50;

// Apple sign-in needs an Apple Developer account, which we don't have yet. Flip to true once
// the Apple provider is configured in Supabase (and wire it like Google below).
const SHOW_APPLE_SIGN_IN = false;

const SCRIPT_PHRASES = ["Speaking", "Listening", "Practising", "Conversing"];

// Approximates the reference's withSpring({ damping: 30, stiffness: 200 }) — critically damped, no bounce.
const SHEET_TRANSITION = "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)";

type View = "login" | "email";

export default function IntroScreen() {
  const [mainVisible, setMainVisible] = useState(false);
  const [scriptVisible, setScriptVisible] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const dragStartY = useRef<number | null>(null);

  const [view, setView] = useState<View>("login");
  const [contentVisible, setContentVisible] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Hero text intro + phrase cycle (same timing as the reference):
  // every 3.5s fade out (0.5s), swap word, pause 0.15s, fade in.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    later(() => {
      setMainVisible(true);
      later(() => setScriptVisible(true), 800);
    }, 300);

    const interval = setInterval(() => {
      setScriptVisible(false);
      later(() => {
        setPhraseIndex((i) => (i + 1) % SCRIPT_PHRASES.length);
        later(() => setScriptVisible(true), 150);
      }, 500);
    }, 3500);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  // If the user comes back from Google with the browser's Back button, the page may be
  // restored from the back/forward cache with the button still disabled.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setGoogleLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const switchView = (to: View) => {
    setContentVisible(false);
    setTimeout(() => {
      setView(to);
      setContentVisible(true);
    }, 200);
  };

  // --- Sheet drag (pointer events) ---
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Let text fields keep their own pointer behaviour (caret, selection).
    if ((e.target as HTMLElement).closest("input, textarea")) return;
    dragStartY.current = e.clientY;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (Math.abs(delta) <= 4) return;
    // Capture only once it's a real drag, so plain taps still click the button underneath.
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDragOffset(delta);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    dragStartY.current = null;
    setDragOffset(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (delta < -SWIPE_THRESHOLD) setIsMenuOpen(true);
    else if (delta > SWIPE_THRESHOLD) setIsMenuOpen(false);
  };

  const baseY = isMenuOpen ? 0 : CLOSED_POSITION;
  const translateY =
    dragOffset === null ? baseY : Math.min(CLOSED_POSITION, Math.max(0, baseY + dragOffset));

  const comingSoon = () => toast("Coming soon");

  // Redirects the whole page to Google. With PKCE, Supabase sends the user back to
  // /auth/callback?code=…, which AuthCallback exchanges exactly like a magic link.
  const signInWithGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // On success the browser navigates away; keep the spinner up until it does.
    } catch {
      setGoogleLoading(false);
      toast.error("Couldn't start Google sign-in. Please try again.");
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/broll.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Hero text */}
      <div className="absolute inset-x-[30px] top-[15%]">
        <h1
          className={`text-[44px] leading-[1.1] font-extrabold text-[#fff4cc] transition-all duration-[1200ms] ease-out ${
            mainVisible ? "translate-y-0 opacity-100" : "translate-y-[30px] opacity-0"
          }`}
        >
          Learn Mandarin the right way
        </h1>
        <p
          className={`font-garamond text-[54px] font-medium italic tracking-[0.5px] text-accent transition-all ease-out ${
            scriptVisible
              ? "translate-y-0 opacity-100 duration-[600ms]"
              : "translate-y-[20px] opacity-0 duration-500"
          }`}
          aria-live="polite"
        >
          {SCRIPT_PHRASES[phraseIndex]}
        </p>
      </div>

      {/* Bottom sheet */}
      <div
        className="absolute inset-x-0 bottom-0 flex touch-none flex-col rounded-t-3xl border-x-[1.5px] border-t-[1.5px] border-white/15 bg-black/60 backdrop-blur-xl select-none"
        style={{
          height: MENU_HEIGHT + 100,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 30px)",
          transform: `translateY(${translateY}px)`,
          transition: dragOffset === null ? SHEET_TRANSITION : "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <button
          type="button"
          data-handle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          className="flex w-full cursor-pointer justify-center py-3"
          onClick={() => setIsMenuOpen((o) => !o)}
        >
          <span className="h-1 w-10 rounded-sm bg-white/50" />
        </button>

        <div
          className={`flex-1 px-[30px] transition-opacity ${
            contentVisible ? "opacity-100 duration-300" : "opacity-0 duration-200"
          }`}
        >
          {view === "login" ? (
            <div>
              <div className="mt-5 mb-6 flex items-center justify-between px-2.5">
                <div className="flex items-center">
                  <Image
                    src="/images/logo.png"
                    alt=""
                    width={25}
                    height={25}
                    className="mr-[5px] rounded-xl"
                  />
                  <span className="text-lg font-bold text-white">Convo</span>
                </div>
                <span className="text-base font-semibold text-white">Start today</span>
              </div>

              <div className="flex flex-col gap-4">
                {SHOW_APPLE_SIGN_IN && (
                  <LoginButton icon={<FaApple size={16} />} onClick={comingSoon}>
                    Continue with Apple
                  </LoginButton>
                )}
                <LoginButton
                  icon={<FaGoogle size={16} />}
                  onClick={signInWithGoogle}
                  loading={googleLoading}
                >
                  Continue with Google
                </LoginButton>
                <LoginButton
                  icon={<MdOutlineEmail size={16} />}
                  onClick={() => {
                    setIsMenuOpen(true);
                    switchView("email");
                  }}
                >
                  Continue with Email
                </LoginButton>
              </div>
            </div>
          ) : (
            <EmailAuth onBack={() => switchView("login")} />
          )}
        </div>
      </div>
    </div>
  );
}

function LoginButton({
  icon,
  onClick,
  loading = false,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className="flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-[rgba(120,120,128,0.4)] bg-[rgba(60,60,67,0.8)] px-5 py-3 text-[17px] font-medium tracking-[-0.2px] text-white transition-opacity active:opacity-70 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="mr-3 flex items-center">
        {loading ? (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          />
        ) : (
          icon
        )}
      </span>
      {children}
    </button>
  );
}
