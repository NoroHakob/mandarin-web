import { readUserItem, writeUserItem, type UserId } from "./storage";

// Ported from reference/lib/lessonProgress.ts (AsyncStorage → localStorage, same shape).
// Stored per user under `${LESSON_PROGRESS_KEY}:${userId}` (see storage.ts).
export const LESSON_PROGRESS_KEY = "lesson_progress";

export interface LessonProgress {
  [lessonId: string]: number; // lessonID -> completionCount
}

/** Parses the raw stored value; anything missing or malformed counts as no progress. */
export function parseProgress(raw: string | null): LessonProgress {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as LessonProgress) : {};
  } catch {
    return {};
  }
}

export function getAllProgress(userId: UserId): LessonProgress {
  return parseProgress(readUserItem(LESSON_PROGRESS_KEY, userId));
}

export function incrementLessonCompletion(userId: UserId, lessonId: string): void {
  if (!userId) return;
  const progress = getAllProgress(userId);
  progress[lessonId] = (progress[lessonId] || 0) + 1;
  writeUserItem(LESSON_PROGRESS_KEY, userId, JSON.stringify(progress));
}
