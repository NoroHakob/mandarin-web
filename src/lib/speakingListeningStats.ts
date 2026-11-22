import { readUserItem, writeUserItem, type UserId } from "./storage";

// Ported from reference/lib/speakingListeningStats.ts (AsyncStorage → localStorage, same shape).
// Stored per user under `${STATS_KEY}:${userId}` (see storage.ts).
export const STATS_KEY = "speaking_listening_stats";

const MINUTES_PER_QUESTION = 0.5;
const MINUTES_PER_CONVERSATION_TURN = 1;

export interface SpeakingListeningStats {
  minutesSpoken: number;
  minutesListened: number;
  lastUpdate: string;
  questionsAnswered: number;
  questionsListened: number;
  conversationTurns: number;
}

export interface WeeklyStats {
  minutesSpoken: number;
  minutesListened: number;
  weeklyChange: {
    spoken: number;
    listened: number;
  };
}

const getDefaultStats = (): SpeakingListeningStats => ({
  minutesSpoken: 0,
  minutesListened: 0,
  lastUpdate: new Date().toISOString(),
  questionsAnswered: 0,
  questionsListened: 0,
  conversationTurns: 0,
});

/** Parses the raw stored value; anything missing or malformed yields default stats. */
export function parseStats(raw: string | null): SpeakingListeningStats {
  if (!raw) return getDefaultStats();
  try {
    return { ...getDefaultStats(), ...(JSON.parse(raw) as Partial<SpeakingListeningStats>) };
  } catch {
    return getDefaultStats();
  }
}

const readStats = (userId: UserId) => parseStats(readUserItem(STATS_KEY, userId));

const writeStats = (userId: UserId, stats: SpeakingListeningStats) => {
  writeUserItem(STATS_KEY, userId, JSON.stringify(stats));
};

export function recordQuestionAnswered(userId: UserId): void {
  if (!userId) return;
  const stats = readStats(userId);
  stats.questionsAnswered += 1;
  stats.minutesSpoken = stats.questionsAnswered * MINUTES_PER_QUESTION;
  stats.lastUpdate = new Date().toISOString();
  writeStats(userId, stats);
}

export function recordQuestionListened(userId: UserId): void {
  if (!userId) return;
  const stats = readStats(userId);
  stats.questionsListened += 1;
  stats.minutesListened = stats.questionsListened * MINUTES_PER_QUESTION;
  stats.lastUpdate = new Date().toISOString();
  writeStats(userId, stats);
}

export function recordConversationTurn(userId: UserId): void {
  if (!userId) return;
  const stats = readStats(userId);
  stats.conversationTurns += 1;
  stats.minutesSpoken += MINUTES_PER_CONVERSATION_TURN;
  stats.minutesListened += MINUTES_PER_CONVERSATION_TURN;
  stats.lastUpdate = new Date().toISOString();
  writeStats(userId, stats);
}

export function toWeeklyStats(stats: SpeakingListeningStats): WeeklyStats {
  return {
    minutesSpoken: Math.round(stats.minutesSpoken * 10) / 10,
    minutesListened: Math.round(stats.minutesListened * 10) / 10,
    weeklyChange: {
      spoken: 0,
      listened: 0,
    },
  };
}

export function getWeeklyStats(userId: UserId): WeeklyStats {
  return toWeeklyStats(readStats(userId));
}
