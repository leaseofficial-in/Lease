export const Config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
  publicAppUrl: process.env.EXPO_PUBLIC_APP_URL ?? 'https://rentybase.com',
  appScheme: 'rentybase',
  appName: 'RentyBase',
  supportEmail: 'support@rentybase.com',
  maxPhotosPerRoom: 10,
  maxPhotoSizeBytes: 5 * 1024 * 1024,
  photoQuality: 0.8,
  otpResendCooldownSeconds: 30,
  inviteExpiryHours: 168,
  lateFeePercentage: 2,
  defaultRooms: ['Living Room', 'Bedroom 1', 'Bedroom 2', 'Kitchen', 'Bathroom', 'Balcony'],

  // ── Global / region ──────────────────────────────────────────────────────────
  // Default country for new users when detection fails.
  // IMPORTANT: keep 'IN' so legacy users aren't affected.
  defaultCountryCode: 'IN' as const,

  // Countries available for selection in the country picker.
  // Ordered: US first (current priority market), then India (legacy), rest alpha.
  supportedCountries: ['US', 'IN', 'GB', 'CA', 'AU', 'AE', 'SG', 'DE', 'FR', 'NZ'] as const,
} as const;
