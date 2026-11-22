"use client";

import { useSyncExternalStore } from "react";
import { readUserItem, subscribeStorage, type UserId } from "@/lib/storage";

/**
 * Raw localStorage value for `key`, scoped to `userId`. Re-read on mount, on window focus, after
 * any write and when the user changes. Returns `undefined` during SSR/hydration (not loaded yet)
 * and `null` when the key is absent or nobody is signed in.
 * The raw string is a stable snapshot, so unchanged storage never causes re-renders.
 */
export function useStoredValue(key: string, userId: UserId): string | null | undefined {
  return useSyncExternalStore(
    subscribeStorage,
    () => readUserItem(key, userId),
    () => undefined,
  );
}
