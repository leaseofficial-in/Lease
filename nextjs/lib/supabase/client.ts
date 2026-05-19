import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Native Supabase client — uses @capacitor/preferences as storage so the
// PKCE code_verifier persists across WebView/Chrome context switches.
export async function createNativeClient() {
  const { buildNativeStorage } = await import('./native-storage')
  const storage = await buildNativeStorage()
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storage, flowType: 'pkce' } }
  )
}
