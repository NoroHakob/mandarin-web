"use client";

import { useMemo } from "react";
import type { ConversationScenario } from "@/lib/course";
import {
  CUSTOM_SCENARIOS_KEY,
  parseCustomScenarios,
  sortCustomScenarios,
} from "@/lib/customScenarios";
import { useStoredValue } from "./useStoredValue";

/** The user's saved custom scenarios, newest first; empty until loaded on the client. */
export function useCustomScenarios(): ConversationScenario[] {
  const raw = useStoredValue(CUSTOM_SCENARIOS_KEY);
  return useMemo(() => sortCustomScenarios(parseCustomScenarios(raw ?? null)), [raw]);
}
