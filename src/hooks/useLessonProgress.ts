"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { LESSON_PROGRESS_KEY, parseProgress, type LessonProgress } from "@/lib/lessonProgress";
import { useStoredValue } from "./useStoredValue";

/** The signed-in user's completion counts per lesson id; empty until loaded on the client. */
export function useLessonProgress(): LessonProgress {
  const userId = useAuth().user?.id;
  const raw = useStoredValue(LESSON_PROGRESS_KEY, userId);
  return useMemo(() => parseProgress(raw ?? null), [raw]);
}
