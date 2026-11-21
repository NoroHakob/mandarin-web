"use client";

import { useSyncExternalStore } from "react";
import { readItem, subscribeStorage } from "@/lib/storage";

/**
 * Raw localStorage value for `key`, re-read on mount, on window focus and after any write.
 * Returns `undefined` during SSR/hydration (not loaded yet) and `null` when the key is absent.
 * The raw string is a stable snapshot, so unchanged storage never causes re-renders.
 */
export function useStoredValue(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribeStorage,
    () => readItem(key),
    () => undefined,
  );
}
