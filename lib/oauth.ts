import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const getRedirectTo = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }

  return makeRedirectUri({ path: 'auth/callback' });
};

const getAuthParams = (url: string): URLSearchParams => {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);

  if (parsed.hash.startsWith('#')) {
    const hashParams = new URLSearchParams(parsed.hash.slice(1));
    hashParams.forEach((value, key) => params.set(key, value));
  }

  return params;
};

export const createSessionFromOAuthUrl = async (url: string) => {
  const params = getAuthParams(url);
  const error = params.get('error') ?? params.get('error_code');
  if (error) {
    throw new Error(params.get('error_description') ?? error);
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;
    return data.session;
  }

  const code = params.get('code');
  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return data.session;
  }

  return null;
};

export const signInWithGoogle = async () => {
  const redirectTo = getRedirectTo();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in did not return an auth URL.');

  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return null;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;

  return createSessionFromOAuthUrl(result.url);
};
