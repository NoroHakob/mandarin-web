"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { notifyStorageChange } from "@/lib/storage";
import { parseStats, STATS_KEY, toWeeklyStats, type WeeklyStats } from "@/lib/speakingListeningStats";
import { useStoredValue } from "./useStoredValue";

/** The signed-in user's weekly speaking/listening stats; refreshes on mount, on window focus and after stat writes. */
export function useSpeakingListeningStats(): {
  stats: WeeklyStats | null;
  loading: boolean;
  refresh: () => void;
} {
  const userId = useAuth().user?.id;
  const raw = useStoredValue(STATS_KEY, userId);
  const loading = raw === undefined;
  const stats = useMemo(() => (loading ? null : toWeeklyStats(parseStats(raw))), [loading, raw]);
  return { stats, loading, refresh: notifyStorageChange };
}
