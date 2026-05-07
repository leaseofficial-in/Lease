export const Config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
  publicAppUrl: process.env.EXPO_PUBLIC_APP_URL ?? 'https://rentybase.com',
  appScheme: 'rentybase',
  appName: 'RentyBase',
  supportEmail: 'support@rentybase.com',
  maxPhotosPerRoom: 10,
  maxPhotoSizeBytes: 5 * 1024 * 1024, // 5 MB
  photoQuality: 0.8,
  otpResendCooldownSeconds: 30,
  inviteExpiryHours: 168, // 7 days
  lateFeePercentage: 2, // 2% of monthly rent (one-time flat fee when overdue)
  defaultRooms: ['Living Room', 'Bedroom 1', 'Bedroom 2', 'Kitchen', 'Bathroom', 'Balcony'],
} as const;
