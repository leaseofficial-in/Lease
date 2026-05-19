// ─── Region auto-detection ────────────────────────────────────────────────────
// Uses Intl APIs (always available in React Native / web) to infer country.
// No network call needed — timezone alone covers >95% of cases accurately.

import { CountryCode, REGIONS } from './regions';

// IANA timezone → CountryCode mapping for common timezones
const TIMEZONE_MAP: Record<string, CountryCode> = {
  // United States
  'America/New_York':       'US',
  'America/Chicago':        'US',
  'America/Denver':         'US',
  'America/Los_Angeles':    'US',
  'America/Phoenix':        'US',
  'America/Anchorage':      'US',
  'Pacific/Honolulu':       'US',
  'America/Detroit':        'US',
  'America/Indiana/Indianapolis': 'US',
  'America/Indiana/Knox':   'US',
  'America/Boise':          'US',
  'America/Juneau':         'US',
  'America/Nome':           'US',
  // India
  'Asia/Kolkata':           'IN',
  'Asia/Calcutta':          'IN',
  // United Kingdom
  'Europe/London':          'GB',
  // Canada
  'America/Toronto':        'CA',
  'America/Vancouver':      'CA',
  'America/Winnipeg':       'CA',
  'America/Halifax':        'CA',
  'America/Edmonton':       'CA',
  'America/Regina':         'CA',
  'America/St_Johns':       'CA',
  'America/Whitehorse':     'CA',
  // Australia
  'Australia/Sydney':       'AU',
  'Australia/Melbourne':    'AU',
  'Australia/Brisbane':     'AU',
  'Australia/Perth':        'AU',
  'Australia/Adelaide':     'AU',
  'Australia/Darwin':       'AU',
  'Australia/Hobart':       'AU',
  // UAE
  'Asia/Dubai':             'AE',
  'Asia/Muscat':            'AE',
  // Singapore
  'Asia/Singapore':         'SG',
  // Germany
  'Europe/Berlin':          'DE',
  // France
  'Europe/Paris':           'FR',
  // New Zealand
  'Pacific/Auckland':       'NZ',
  'Pacific/Chatham':        'NZ',
};

// BCP-47 locale → CountryCode fallback
const LOCALE_MAP: Record<string, CountryCode> = {
  'en-US': 'US',
  'en-IN': 'IN',
  'en-GB': 'GB',
  'en-CA': 'CA',
  'en-AU': 'AU',
  'en-AE': 'AE',
  'en-SG': 'SG',
  'de-DE': 'DE',
  'fr-FR': 'FR',
  'en-NZ': 'NZ',
};

/**
 * Detect the user's country from system timezone and locale.
 * Returns a CountryCode — always succeeds (falls back to 'IN' for existing users).
 * Call this once on first launch; afterward use the stored value.
 */
export const detectCountry = (): CountryCode => {
  // 1. Timezone — most reliable signal
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_MAP[tz]) return TIMEZONE_MAP[tz];
  } catch {
    // Intl not available (very old env)
  }

  // 2. System locale
  try {
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
      ?? (typeof navigator !== 'undefined' ? navigator.language : null);
    if (systemLocale) {
      // Try exact match first
      if (LOCALE_MAP[systemLocale]) return LOCALE_MAP[systemLocale];
      // Try region subtag (e.g. 'en-US-u-ca-gregory' → 'US')
      const match = systemLocale.match(/[a-z]{2}-([A-Z]{2})/);
      if (match?.[1]) {
        const code = match[1] as CountryCode;
        if (code in REGIONS) return code;
      }
    }
  } catch {
    // ignore
  }

  // 3. Default — fall back to India (preserves existing user experience)
  return 'IN';
};

/**
 * Detect country and return a confidence level so the UI can decide
 * whether to ask for confirmation or skip directly.
 */
export const detectCountryWithConfidence = (): {
  countryCode: CountryCode;
  confidence: 'high' | 'low';
  source: 'timezone' | 'locale' | 'default';
} => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_MAP[tz]) {
      return { countryCode: TIMEZONE_MAP[tz], confidence: 'high', source: 'timezone' };
    }
  } catch { /* ignore */ }

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale && LOCALE_MAP[locale]) {
      return { countryCode: LOCALE_MAP[locale], confidence: 'high', source: 'locale' };
    }
  } catch { /* ignore */ }

  return { countryCode: 'IN', confidence: 'low', source: 'default' };
};
