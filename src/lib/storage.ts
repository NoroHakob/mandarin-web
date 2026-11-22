/**
 * SSR-safe localStorage helpers. Every access is wrapped in try/catch because storage can be
 * missing (server render) or throw (private mode, blocked site data, quota exceeded).
 */

/** Fired on window after any write through writeItem, so same-tab subscribers re-read. */
const CHANGE_EVENT = "app-storage-change";

export function readItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full; progress just isn't persisted.
  }
  notifyStorageChange();
}

/** Signed-in user's id, or nothing when signed out. */
export type UserId = string | null | undefined;

/** Per-user key, so different accounts in the same browser never see each other's data. */
export function userScopedKey(key: string, userId: string): string {
  return `${key}:${userId}`;
}

/** Reads `key` for this user. Signed out → nothing is read. */
export function readUserItem(key: string, userId: UserId): string | null {
  return userId ? readItem(userScopedKey(key, userId)) : null;
}

/** Writes `key` for this user. Signed out → nothing is written. */
export function writeUserItem(key: string, userId: UserId, value: string): void {
  if (userId) writeItem(userScopedKey(key, userId), value);
}

/**
 * One-time move of data saved under the old global (unscoped) keys to `userId`: the first user
 * to sign in on this browser after the switch to per-user keys. The legacy value is copied only if
 * the user has nothing under the scoped key yet, then removed either way, so it can never leak
 * to a later account.
 */
export function migrateLegacyItems(keys: readonly string[], userId: string): void {
  if (typeof window === "undefined") return;
  let changed = false;
  for (const key of keys) {
    try {
      const legacy = window.localStorage.getItem(key);
      if (legacy === null) continue;
      const scoped = userScopedKey(key, userId);
      if (window.localStorage.getItem(scoped) === null) window.localStorage.setItem(scoped, legacy);
      window.localStorage.removeItem(key);
      changed = true;
    } catch {
      // Storage unavailable or full; the legacy value stays put and is retried on the next sign-in.
    }
  }
  if (changed) notifyStorageChange();
}

export function notifyStorageChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Subscribes to anything that may change stored values: our own writes, writes from other tabs
 * ("storage") and the window regaining focus (the web stand-in for useFocusEffect).
 */
export function subscribeStorage(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("focus", callback);
  };
}
