import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import {
  DEV_AUTH_OTP,
  DEV_AUTH_STORAGE_KEY,
  createDevProfile,
  createDevSession,
  isDevAuthEnabled,
  isDevAuthUserId,
} from '../lib/devAuth';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  signInWithDevOtp: (phone: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),

  fetchProfile: async (userId) => {
    if (isDevAuthEnabled() && isDevAuthUserId(userId)) {
      const stored = await AsyncStorage.getItem(DEV_AUTH_STORAGE_KEY);
      const role = stored ? (JSON.parse(stored) as { role: UserRole | null }).role : null;
      set({ profile: createDevProfile(role) });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }
  },

  updateProfile: async (updates) => {
    const { session } = get();
    if (!session) return;

    if (isDevAuthEnabled() && isDevAuthUserId(session.user.id)) {
      const profile = { ...createDevProfile(get().profile?.role ?? null), ...updates };
      await AsyncStorage.setItem(
        DEV_AUTH_STORAGE_KEY,
        JSON.stringify({ role: profile.role }),
      );
      set({ profile });
      return;
    }

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

    if (isDevAuthEnabled() && isDevAuthUserId(session.user.id)) {
      const profile = createDevProfile(role);
      await AsyncStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify({ role }));
      set({ profile });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw error;
    set({ profile: data as Profile });
  },

  signInWithDevOtp: async (phone, otp) => {
    if (!isDevAuthEnabled()) {
      throw new Error('Local dev login is disabled for this build.');
    }

    const digits = phone.replace(/\D/g, '');
    if (digits !== '9876543210' || otp !== DEV_AUTH_OTP) {
      throw new Error('Use local test phone 9876543210 and OTP 123456.');
    }

    const session = createDevSession();
    const profile = createDevProfile(null);
    await AsyncStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify({ role: null }));
    set({ session, profile });
  },

  signOut: async () => {
    if (isDevAuthEnabled() && isDevAuthUserId(get().session?.user.id)) {
      await AsyncStorage.removeItem(DEV_AUTH_STORAGE_KEY);
      set({ session: null, profile: null });
      return;
    }

    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  initialize: async () => {
    try {
      if (isDevAuthEnabled()) {
        const stored = await AsyncStorage.getItem(DEV_AUTH_STORAGE_KEY);
        if (stored) {
          const { role } = JSON.parse(stored) as { role: UserRole | null };
          set({
            session: createDevSession(),
            profile: createDevProfile(role),
          });
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!isDevAuthUserId(get().session?.user.id)) {
        set({ session });
      }

      if (session && !isDevAuthUserId(get().session?.user.id)) {
        await get().fetchProfile(session.user.id);
      }

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (isDevAuthEnabled() && isDevAuthUserId(get().session?.user.id)) {
          return;
        }

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
