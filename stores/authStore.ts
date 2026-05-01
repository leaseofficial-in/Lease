import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { createSessionFromOAuthUrl, signInWithGoogle } from '../lib/oauth';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isInitialized: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  completeOAuthSignIn: (callbackUrl: string) => Promise<Session>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isProfileLoading: false,
  isInitialized: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),

  fetchProfile: async (userId) => {
    set({ isProfileLoading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      const profile = data ? (data as Profile) : null;
      set({ profile });
      return profile;
    } finally {
      set({ isProfileLoading: false });
    }
  },

  completeOAuthSignIn: async (callbackUrl) => {
    const session = await createSessionFromOAuthUrl(callbackUrl);
    if (!session) {
      throw new Error('Google sign-in did not return a session.');
    }
    set({ session });
    void get().fetchProfile(session.user.id).catch(() => undefined);
    return session;
  },

  updateProfile: async (updates) => {
    const { session } = get();
    if (!session) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw error;
    set({ profile: data as Profile });
  },

  setRole: async (role) => {
    const { session } = get();
    if (!session) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw error;
    if (data) {
      set({ profile: data as Profile });
    } else {
      // UPDATE succeeded but SELECT returned nothing (RLS edge case) — re-fetch
      await get().fetchProfile(session.user.id);
    }
  },

  signInWithGoogle: async () => {
    const session = await signInWithGoogle();
    if (session) {
      set({ session });
      await get().fetchProfile(session.user.id);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut({ scope: 'local' });
    set({ session: null, profile: null });
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      if (session) {
        await get().fetchProfile(session.user.id);
      }

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        set({ session: newSession });
        if (newSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          await get().fetchProfile(newSession.user.id);
        }
        if (event === 'SIGNED_OUT') {
          set({ profile: null });
        }
      });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },
}));
