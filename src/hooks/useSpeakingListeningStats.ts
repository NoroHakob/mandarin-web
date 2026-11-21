"use client";

import { useMemo } from "react";
import { notifyStorageChange } from "@/lib/storage";
import { parseStats, STATS_KEY, toWeeklyStats, type WeeklyStats } from "@/lib/speakingListeningStats";
import { useStoredValue } from "./useStoredValue";

/** Weekly speaking/listening stats; refreshes on mount, on window focus and after stat writes. */
export function useSpeakingListeningStats(): {
  stats: WeeklyStats | null;
  loading: boolean;
  refresh: () => void;
} {
  const raw = useStoredValue(STATS_KEY);
  const loading = raw === undefined;
  const stats = useMemo(() => (loading ? null : toWeeklyStats(parseStats(raw))), [loading, raw]);
  return { stats, loading, refresh: notifyStorageChange };
}
