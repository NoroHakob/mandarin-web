"use client";

import Image from "next/image";
import { useAuth } from "@/lib/auth";

// Temporary home page until the real tabs are ported.
export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <main className="absolute inset-0 overflow-y-auto">
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-10">
        <Image src="/images/logo.png" alt="Convo logo" width={96} height={96} priority />
        <h1 className="font-garamond text-4xl font-medium italic text-text">Convo</h1>
        <p className="text-sm text-subdued">Signed in as {user?.email}</p>
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
