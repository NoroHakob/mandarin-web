import { readItem, writeItem } from "./storage";

// Ported from reference/lib/speakingListeningStats.ts (AsyncStorage → localStorage, same key and shape).
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

const readStats = () => parseStats(readItem(STATS_KEY));

const writeStats = (stats: SpeakingListeningStats) => {
  writeItem(STATS_KEY, JSON.stringify(stats));
};

export function recordQuestionAnswered(): void {
  const stats = readStats();
  stats.questionsAnswered += 1;
  stats.minutesSpoken = stats.questionsAnswered * MINUTES_PER_QUESTION;
  stats.lastUpdate = new Date().toISOString();
  writeStats(stats);
}

export function recordQuestionListened(): void {
  const stats = readStats();
  stats.questionsListened += 1;
  stats.minutesListened = stats.questionsListened * MINUTES_PER_QUESTION;
  stats.lastUpdate = new Date().toISOString();
  writeStats(stats);
}

export function recordConversationTurn(): void {
  const stats = readStats();
  stats.conversationTurns += 1;
  stats.minutesSpoken += MINUTES_PER_CONVERSATION_TURN;
  stats.minutesListened += MINUTES_PER_CONVERSATION_TURN;
  stats.lastUpdate = new Date().toISOString();
  writeStats(stats);
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

export function getWeeklyStats(): WeeklyStats {
  return toWeeklyStats(readStats());
}
