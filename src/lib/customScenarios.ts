import type { IoniconName } from "@/components/Ionicon";
import type { ConversationScenario, PhrasebookEntry } from "./course";
import { readUserItem, writeUserItem, type UserId } from "./storage";

// Ported from reference/lib/customScenarios.ts (AsyncStorage → localStorage, same shape).
// Stored per user under `${CUSTOM_SCENARIOS_KEY}:${userId}` (see storage.ts).
export const CUSTOM_SCENARIOS_KEY = "custom_scenarios";

export const CUSTOM_SCENARIO_ID_PREFIX = "custom_";

/** Icon given to every AI-generated scenario (matches the reference). */
export const CUSTOM_SCENARIO_ICON: IoniconName = "color-wand";

type StoredCustomScenario = {
  scenario: ConversationScenario;
  createdAt: string;
};

type StorageType = Record<string, StoredCustomScenario>;

const DIFFICULTIES: ReadonlySet<string> = new Set(["Beginner", "Intermediate", "Advanced"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPhrasebookEntry(value: unknown): value is PhrasebookEntry {
  return (
    isRecord(value) &&
    typeof value.hanzi === "string" &&
    typeof value.pinyin === "string" &&
    typeof value.english === "string"
  );
}

/** Rebuilds a custom scenario from untrusted data (storage, API), or null if required fields are missing. */
export function toCustomScenario(value: unknown): ConversationScenario | null {
  if (!isRecord(value)) return null;
  const { id, title, icon, isFree, description, goal, tasks, difficulty, phrasebook } = value;
  if (
    typeof id !== "string" ||
    !id.startsWith(CUSTOM_SCENARIO_ID_PREFIX) ||
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof goal !== "string" ||
    !Array.isArray(tasks) ||
    !tasks.every((t) => typeof t === "string") ||
    typeof difficulty !== "string" ||
    !DIFFICULTIES.has(difficulty)
  ) {
    return null;
  }
  return {
    id,
    title,
    // Unknown icon names render Ionicon's fallback glyph, so any string is safe here.
    icon: (typeof icon === "string" ? icon : CUSTOM_SCENARIO_ICON) as IoniconName,
    isFree: isFree === true,
    description,
    goal,
    tasks,
    difficulty: difficulty as ConversationScenario["difficulty"],
    phrasebook: Array.isArray(phrasebook) ? phrasebook.filter(isPhrasebookEntry) : undefined,
  };
}

/** Parses the raw stored value, dropping any malformed entries. */
export function parseCustomScenarios(raw: string | null): StorageType {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isRecord(parsed)) return {};

  const store: StorageType = {};
  for (const [key, entry] of Object.entries(parsed)) {
    if (!isRecord(entry) || typeof entry.createdAt !== "string") continue;
    const scenario = toCustomScenario(entry.scenario);
    if (scenario && scenario.id === key) store[key] = { scenario, createdAt: entry.createdAt };
  }
  return store;
}

/** Newest first, as in the reference. ISO timestamps sort correctly as strings. */
export function sortCustomScenarios(store: StorageType): ConversationScenario[] {
  return Object.values(store)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((x) => x.scenario);
}

const readStorage = (userId: UserId): StorageType =>
  parseCustomScenarios(readUserItem(CUSTOM_SCENARIOS_KEY, userId));

const writeStorage = (userId: UserId, data: StorageType) => {
  writeUserItem(CUSTOM_SCENARIOS_KEY, userId, JSON.stringify(data));
};

export const createCustomScenarioId = () => `${CUSTOM_SCENARIO_ID_PREFIX}${crypto.randomUUID()}`;

export const isCustomScenarioId = (id: string) => id.startsWith(CUSTOM_SCENARIO_ID_PREFIX);

export function saveCustomScenario(userId: UserId, scenario: ConversationScenario): void {
  if (!userId) return;
  const store = readStorage(userId);
  store[scenario.id] = { scenario, createdAt: new Date().toISOString() };
  writeStorage(userId, store);
}

export function getCustomScenario(userId: UserId, id: string): ConversationScenario | null {
  return readStorage(userId)[id]?.scenario ?? null;
}

export function listCustomScenarios(userId: UserId): ConversationScenario[] {
  return sortCustomScenarios(readStorage(userId));
}
