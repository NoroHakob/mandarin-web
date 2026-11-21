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
