"use client";

import { useState, type FormEvent } from "react";
import { FiChevronLeft } from "react-icons/fi";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function EmailAuth({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const signInWithEmail = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) toast.error(error.message);
      else toast.success("Check your email for the login link");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mt-5 mb-5 flex items-center">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-1 cursor-pointer p-1 text-white"
        >
          <FiChevronLeft size={20} />
        </button>
      </div>

      <div className="mb-5">
        <h2 className="mb-2 text-2xl leading-[34px] font-bold text-white">
          Enter your email address.
        </h2>
        <p className="text-base text-white/70">We will send you a magic link to sign in.</p>
      </div>

      <form onSubmit={signInWithEmail} className="flex flex-col gap-5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          aria-label="Email"
          className="min-h-[52px] rounded-lg border border-white/20 bg-white/10 px-4 py-4 text-base text-white outline-none placeholder:text-white/40 focus:border-white/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-2.5 flex min-h-[52px] cursor-pointer items-center justify-center rounded-lg bg-white/15 px-5 py-4 text-base font-medium tracking-[-0.2px] text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>
    </div>
  );
}
