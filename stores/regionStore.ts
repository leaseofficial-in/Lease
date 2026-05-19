// ─── Region Store ─────────────────────────────────────────────────────────────
// Persists the user's selected country/region across sessions.
// Reads from: AsyncStorage cache → profile.country_code → auto-detection.
// Zustand's getState() works outside React, so lib/formatters.ts can call it.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CountryCode, RegionConfig, REGIONS, getRegion } from '../lib/i18n/regions';
import { detectCountryWithConfidence } from '../lib/i18n/detection';

const STORAGE_KEY = 'rentybase.country_code';

interface RegionState {
  countryCode: CountryCode;
  regionConfig: RegionConfig;
  isLoaded: boolean;

  /** Load from AsyncStorage on app start. Falls back to detection if no stored value. */
  initialize: () => Promise<void>;

  /** Persist a new country choice to memory + AsyncStorage. */
  setCountry: (code: CountryCode) => Promise<void>;

  /** Called by authStore when a profile is loaded — syncs with profile.country_code. */
  syncFromProfile: (profileCountryCode: string | null | undefined) => void;
}

export const useRegionStore = create<RegionState>((set, get) => ({
  countryCode: 'IN',
  regionConfig: REGIONS['IN'],
  isLoaded: false,

  initialize: async () => {
    if (get().isLoaded) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && stored in REGIONS) {
        const code = stored as CountryCode;
        set({ countryCode: code, regionConfig: REGIONS[code], isLoaded: true });
        return;
      }
    } catch { /* AsyncStorage unavailable */ }

    // Fall back to auto-detection
    const { countryCode } = detectCountryWithConfidence();
    set({ countryCode, regionConfig: REGIONS[countryCode], isLoaded: true });
  },

  setCountry: async (code) => {
    set({ countryCode: code, regionConfig: REGIONS[code] });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, code);
    } catch { /* ignore */ }
  },

  syncFromProfile: (profileCountryCode) => {
    if (!profileCountryCode) return;
    const code = getRegion(profileCountryCode).countryCode;
    if (code === get().countryCode) return; // no-op if already matching
    set({ countryCode: code, regionConfig: REGIONS[code] });
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => undefined);
  },
}));

// ─── Convenience selectors (use in React components) ──────────────────────────

export const useRegion = () => useRegionStore((s) => s.regionConfig);
export const useCountryCode = () => useRegionStore((s) => s.countryCode);
export const useIsIndia = () => useRegionStore((s) => s.countryCode === 'IN');
export const useIsUS = () => useRegionStore((s) => s.countryCode === 'US');
