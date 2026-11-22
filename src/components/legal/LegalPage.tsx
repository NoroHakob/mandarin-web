"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { IoChevronBack } from "react-icons/io5";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

/** Scrollable, readable layout shared by /privacy and /terms. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();

  // Opened from inside the app → go back there; opened directly (or in a new tab) → home.
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.replace("/");
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-white text-text">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
        >
          <IoChevronBack size={24} />
        </button>
        <h1 className="text-[20px] font-bold">{title}</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-12 text-[15px] leading-6">
        <p className="mb-6 text-sm text-subdued">Last updated: {LEGAL_LAST_UPDATED}</p>
        <div className="flex flex-col gap-6 [&_a]:text-accent [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_li]:mb-1.5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
    </div>
  );
}
