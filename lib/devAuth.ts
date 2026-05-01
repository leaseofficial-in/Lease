import { Session } from '@supabase/supabase-js';
import { Profile, UserRole } from '../types';

export const DEV_AUTH_PHONE = '+919876543210';
export const DEV_AUTH_INPUT_PHONE = '9876543210';
export const DEV_AUTH_OTP = '123456';
export const DEV_AUTH_USER_ID = '00000000-0000-0000-0000-000000000001';
export const DEV_AUTH_STORAGE_KEY = 'flatvio.dev.auth';

export const isDevAuthEnabled = (): boolean => {
  return __DEV__ || process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS === 'true';
};

export const isDevAuthUserId = (userId?: string | null): boolean => {
  return userId === DEV_AUTH_USER_ID;
};

export const createDevProfile = (role: UserRole | null = null): Profile => {
  const now = new Date().toISOString();

  return {
    id: DEV_AUTH_USER_ID,
    phone: DEV_AUTH_PHONE,
    full_name: 'Local Tester',
    avatar_url: null,
    role,
    email: 'local@flatvio.test',
    pan_number: null,
    aadhaar_last4: null,
    created_at: now,
    updated_at: now,
  };
};

export const createDevSession = (): Session => {
  const now = new Date().toISOString();

  return {
    access_token: 'flatvio-local-dev-token',
    refresh_token: 'flatvio-local-dev-refresh-token',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    token_type: 'bearer',
    user: {
      id: DEV_AUTH_USER_ID,
      app_metadata: { provider: 'local-dev', providers: ['local-dev'] },
      user_metadata: { phone: DEV_AUTH_PHONE },
      aud: 'authenticated',
      phone: DEV_AUTH_PHONE,
      created_at: now,
      confirmed_at: now,
      phone_confirmed_at: now,
      last_sign_in_at: now,
      role: 'authenticated',
      updated_at: now,
      identities: [],
      is_anonymous: false,
    },
  };
};
