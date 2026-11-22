"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CUSTOM_SCENARIOS_KEY } from "./customScenarios";
import { LESSON_PROGRESS_KEY } from "./lessonProgress";
import { STATS_KEY } from "./speakingListeningStats";
import { migrateLegacyItems } from "./storage";
import { supabase } from "./supabase";

/** Keys that used to be global in localStorage and are now stored per user. */
const USER_SCOPED_STORAGE_KEYS = [LESSON_PROGRESS_KEY, STATS_KEY, CUSTOM_SCENARIOS_KEY] as const;

/** Row from public.profiles (see supabase/migrations). */
export type Profile = {
  id: string;
  full_name: string | null;
  chinese_level: string | null;
  motivations: string[] | null;
  interests: string[] | null;
  onboarding_completed: boolean | null;
  is_premium: boolean | null;
  premium_expires_at: string | null;
  updated_at: string | null;
};

/** The only profile columns users may write (premium fields are server-managed). */
export type ProfileFields = Partial<
  Pick<Profile, "full_name" | "chinese_level" | "motivations" | "interests" | "onboarding_completed">
>;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  refreshProfile: () => Promise<void>;
  /** Upserts the current user's profile, then reloads it. Throws on failure. */
  saveProfile: (fields: ProfileFields) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Profile>();
  return error ? null : data;
}

/** Premium only if flagged AND the expiry is in the future. */
function hasActivePremium(profile: Profile | null): boolean {
  if (!profile?.is_premium || !profile.premium_expires_at) return false;
  return new Date(profile.premium_expires_at).getTime() > Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Ignores stale profile responses when auth state changes mid-request.
  const loadId = useRef(0);

  const loadProfile = useCallback(async (s: Session | null) => {
    const id = ++loadId.current;
    const next = s ? await fetchProfile(s.user.id) : null;
    if (id === loadId.current) setProfile(next);
  }, []);

  useEffect(() => {
    // onAuthStateChange emits INITIAL_SESSION on subscribe, so no separate getSession() is needed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Synchronous localStorage work only (no Supabase calls), so it's safe inside this callback.
      if (newSession) migrateLegacyItems(USER_SCOPED_STORAGE_KEYS, newSession.user.id);
      setSession(newSession);
      // Don't await Supabase calls inside this callback (can deadlock the auth lock); defer instead.
      setTimeout(() => {
        loadProfile(newSession).finally(() => setLoading(false));
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session), [loadProfile, session]);

  const saveProfile = useCallback(
    async (fields: ProfileFields) => {
      if (!session) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        ...fields,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await loadProfile(session);
    },
    [loadProfile, session],
  );

  /** Signs out everywhere; if the server call fails, still clears the local session. Throws only if both fail. */
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) return;
    } catch {
      // Fall through to a local sign-out.
    }
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  }, []);

  const premiumExpiresAt = profile?.premium_expires_at ?? null;
  const isPremium = hasActivePremium(profile);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        isPremium,
        premiumExpiresAt,
        refreshProfile,
        saveProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
