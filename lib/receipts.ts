import { Config } from '../constants/config';
import { supabase } from './supabase';

const getReceiptErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = await response.clone().json();
    if (typeof payload?.error === 'string') return payload.error;
  } catch {
    // Fall through to text/default handling below.
  }

  try {
    const message = await response.text();
    if (message.trim()) return message.trim();
  } catch {
    // Ignore body parsing errors.
  }

  return `Receipt generation failed (${response.status})`;
};

export const generateHraReceiptHtml = async (paymentId: string): Promise<string> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error('Please sign in again to generate the receipt.');
  }

  const response = await fetch(`${Config.supabaseUrl}/functions/v1/generate-hra-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: Config.supabaseAnonKey,
    },
    body: JSON.stringify({ paymentId }),
  });

  if (!response.ok) {
    throw new Error(await getReceiptErrorMessage(response));
  }

  return response.text();
};
