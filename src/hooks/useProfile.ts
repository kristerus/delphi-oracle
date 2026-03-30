"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserProfile } from "@/lib/ai/types";
import { authClient } from "@/lib/auth-client";

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
}

const DEFAULT_PROFILE: Omit<UserProfile, "name"> = {
  skills: [],
  experience: [],
  education: [],
  riskTolerance: "medium",
  timeHorizon: "3y",
};

export function useProfile() {
  const { data: session } = authClient.useSession();
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: false,
    saving: false,
    error: null,
    isDirty: false,
  });

  const fetchProfile = useCallback(async () => {
    if (!session?.user) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const response = await fetch("/api/profile");
      if (response.status === 404) {
        // No profile yet — bootstrap from session
        setState((s) => ({
          ...s,
          profile: {
            name: session.user.name ?? "",
            ...DEFAULT_PROFILE,
          },
          loading: false,
        }));
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      setState((s) => ({
        ...s,
        profile: data,
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load profile",
        // Still set a default profile so the form can render
        profile: session?.user
          ? { name: session.user.name ?? "", ...DEFAULT_PROFILE }
          : null,
      }));
    }
  }, [session]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setState((s) => ({
      ...s,
      profile: s.profile ? { ...s.profile, ...updates } : null,
      isDirty: true,
    }));
  }, []);

  const saveProfile = useCallback(async () => {
    if (!state.profile) return;
    setState((s) => ({ ...s, saving: true, error: null }));

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.profile),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setState((s) => ({ ...s, saving: false, isDirty: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        saving: false,
        error: err instanceof Error ? err.message : "Save failed",
      }));
      throw err;
    }
  }, [state.profile]);

  return {
    ...state,
    updateProfile,
    saveProfile,
    refetch: fetchProfile,
  };
}
