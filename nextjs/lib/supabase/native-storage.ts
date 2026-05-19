import type { SupportedStorage } from '@supabase/supabase-js'

// Supabase storage adapter backed by @capacitor/preferences.
// Unlike localStorage, Preferences survives WebView recreation and
// is inaccessible to Chrome — so the PKCE code_verifier written by
// signInWithOAuth() is still readable when the deep-link fires.
export async function buildNativeStorage(): Promise<SupportedStorage> {
  const { Preferences } = await import('@capacitor/preferences')
  return {
    async getItem(key) {
      const { value } = await Preferences.get({ key })
      return value
    },
    async setItem(key, value) {
      await Preferences.set({ key, value })
    },
    async removeItem(key) {
      await Preferences.remove({ key })
    },
  }
}
