"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import type { ConversationScenario } from "@/lib/course";
import {
  CUSTOM_SCENARIOS_KEY,
  parseCustomScenarios,
  sortCustomScenarios,
} from "@/lib/customScenarios";
import { useStoredValue } from "./useStoredValue";

/** The signed-in user's saved custom scenarios, newest first; empty until loaded on the client. */
export function useCustomScenarios(): ConversationScenario[] {
  const userId = useAuth().user?.id;
  const raw = useStoredValue(CUSTOM_SCENARIOS_KEY, userId);
  return useMemo(() => sortCustomScenarios(parseCustomScenarios(raw ?? null)), [raw]);
}
