import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.rentybase.app',
  appName: 'RentyBase',

  // webDir is used in offline/static mode (npx next build with output:'export').
  // When server.url is set below, Capacitor loads from that URL instead.
  webDir: 'out',

  server: {
    // Points the WebView at your live Vercel deployment so SSR + auth work
    // without a static export step. Update this to your production domain.
    // ⚠️  Comment this out to switch to offline/static mode (run npm run export first).
    url: 'https://rentybase.com',
    cleartext: false,
    androidScheme: 'https',
  },

  android: {
    buildOptions: {
      releaseType: 'APK',
    },
    // Allows the app to open links to rentybase.in inside the WebView
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true during dev
  },

  ios: {
    contentInset: 'automatic',
  },

  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '721315070243-hhqp60g6cvcis1kr1cg5j5n285n8karb.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0E1413',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'large',
      spinnerColor: '#00C896',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0E1413',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
