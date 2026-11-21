"use client";

import Image from "next/image";
import { IoStar } from "react-icons/io5";
import { usePaywall } from "@/components/subscription/PaywallProvider";
import { useAuth } from "@/lib/auth";

// Temporary home page until the real tabs are ported.
export default function Home() {
  const { user, isPremium, premiumExpiresAt, signOut } = useAuth();
  const { openPaywall } = usePaywall();

  return (
    <main className="absolute inset-0 overflow-y-auto">
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-10">
        <Image src="/images/logo.png" alt="Convo logo" width={96} height={96} priority />
        <h1 className="font-garamond text-4xl font-medium italic text-text">Convo</h1>
        <p className="text-sm text-subdued">Signed in as {user?.email}</p>

        {isPremium && premiumExpiresAt ? (
          <p className="rounded-lg bg-[#fff5f0] px-4 py-2 text-sm font-medium text-accent">
            Premium active until{" "}
            {new Date(premiumExpiresAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        ) : (
          <button
            type="button"
            onClick={openPaywall}
            className="flex cursor-pointer items-center gap-2 rounded-3xl bg-accent px-6 py-3 text-base font-bold text-white shadow-[0_4px_8px_rgba(255,73,0,0.4)]"
          >
            <IoStar size={18} />
            Get Premium
          </button>
        )}

        <button
          type="button"
          onClick={signOut}
          className="cursor-pointer rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
