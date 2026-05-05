import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Config } from '../constants/config';

export const buildLandlordReferralLink = (tenantId?: string | null) => {
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : Config.publicAppUrl;
  const url = new URL(origin);
  url.searchParams.set('role', 'landlord');
  url.searchParams.set('utm_source', 'tenant_referral');
  url.searchParams.set('utm_medium', 'share');
  if (tenantId) url.searchParams.set('ref', tenantId);
  return url.toString();
};

export const shareLandlordReferral = async (tenantId?: string | null) => {
  const url = buildLandlordReferralLink(tenantId);
  const title = 'Manage rentals on Flatvio';
  const text = 'I use Flatvio for rent, proof, payments, and agreements. You can set up your rental here.';

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return { shared: true, url };
      } catch {
        // Fall back to clipboard when the share sheet is dismissed or unavailable.
      }
    }

    await Clipboard.setStringAsync(url);
    return { shared: false, url };
  }

  await Share.share({
    title,
    message: `${text} ${url}`,
    url,
  });
  return { shared: true, url };
};
