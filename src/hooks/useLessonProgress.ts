"use client";

import { useMemo } from "react";
import { LESSON_PROGRESS_KEY, parseProgress, type LessonProgress } from "@/lib/lessonProgress";
import { useStoredValue } from "./useStoredValue";

/** Completion counts per lesson id; empty until loaded on the client. */
export function useLessonProgress(): LessonProgress {
  const raw = useStoredValue(LESSON_PROGRESS_KEY);
  return useMemo(() => parseProgress(raw ?? null), [raw]);
}
