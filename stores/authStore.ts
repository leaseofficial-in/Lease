import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { signInWithGoogle } from '../lib/oauth';
import { sendEmail } from '../lib/email';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isInitialized: boolean;
  _authSubscription: { unsubscribe: () => void } | null;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

const loadProfileSoon = (load: () => Promise<unknown>) => {
  setTimeout(() => {
    void load().catch(() => undefined);
  }, 0);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isProfileLoading: false,
  isInitialized: false,
  _authSubscription: null,

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
    const saved = data as Profile | null;
    if (saved) {
      set({ profile: saved });
      // Welcome email — sent once per user, deduplicated by profile ID
      sendEmail({
        type: 'welcome',
        recipientId: saved.id,
        referenceId: saved.id,
        variables: { name: saved.full_name || 'there', role },
      });
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

      // Tear down any existing listener before registering a new one.
      // Guards against React strict-mode double-invocation of the effect.
      get()._authSubscription?.unsubscribe();

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        set({ session: newSession });
        if (newSession) {
          loadProfileSoon(() => get().fetchProfile(newSession.user.id));
        }
        if (event === 'SIGNED_OUT') {
          set({ profile: null, isProfileLoading: false });
        }
      });
      set({ _authSubscription: subscription });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },
}));
