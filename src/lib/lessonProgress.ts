import { readItem, writeItem } from "./storage";

// Ported from reference/lib/lessonProgress.ts (AsyncStorage → localStorage, same key and shape).
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

export function getAllProgress(): LessonProgress {
  return parseProgress(readItem(LESSON_PROGRESS_KEY));
}

export function incrementLessonCompletion(lessonId: string): void {
  const progress = getAllProgress();
  progress[lessonId] = (progress[lessonId] || 0) + 1;
  writeItem(LESSON_PROGRESS_KEY, JSON.stringify(progress));
}
