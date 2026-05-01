import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';

// SecureStore adapter — falls back to AsyncStorage for large values (>2048 bytes)
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) return value;
      return AsyncStorage.getItem(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (value.length > 2048) {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(key),
    ]);
  },
};

export const supabase = createClient(Config.supabaseUrl, Config.supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Typed helpers for common Supabase operations

export const getPublicUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const uploadFile = async (
  bucket: string,
  path: string,
  file: Blob,
  contentType: string,
): Promise<string> => {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw error;
  return getPublicUrl(bucket, path);
};
