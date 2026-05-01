export const Config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
  publicAppUrl: process.env.EXPO_PUBLIC_APP_URL ?? 'https://flatvio.vercel.app',
  appScheme: 'flatvio',
  appName: 'Flatvio',
  supportEmail: 'support@flatvio.in',
  maxPhotosPerRoom: 10,
  maxPhotoSizeBytes: 5 * 1024 * 1024, // 5 MB
  photoQuality: 0.8,
  otpResendCooldownSeconds: 30,
  inviteExpiryHours: 72,
  lateFeePercentage: 0.02, // 2% per day
  defaultRooms: ['Living Room', 'Bedroom 1', 'Bedroom 2', 'Kitchen', 'Bathroom', 'Balcony'],
} as const;
