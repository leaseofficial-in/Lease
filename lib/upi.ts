import { Linking, Platform } from 'react-native';

export interface UPIParams {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}

export const buildUPIUrl = ({ upiId, payeeName, amount, note }: UPIParams): string => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
};

// Returns true if UPI intent was successfully opened
export const openUPIPayment = async (params: UPIParams): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const url = buildUPIUrl(params);
  const supported = await Linking.canOpenURL(url);
  if (!supported) return false;
  await Linking.openURL(url);
  return true;
};
