import { supabase } from './supabase';
import { AppNotification } from '../types';

interface NotifyPayload {
  recipientId: string;
  title: string;
  body: string;
  type: AppNotification['type'];
  data?: Record<string, string | number | boolean | null>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export const notifyUser = async ({
  recipientId,
  title,
  body,
  type,
  data,
}: NotifyPayload): Promise<void> => {
  // Insert in-app notification row (best-effort — never throws to caller)
  try {
    await supabase.from('notifications').insert({
      user_id: recipientId,
      title,
      body,
      type,
      read: false,
      data: data ?? null,
    });
  } catch {
    // Silently ignore — in-app notification is a nice-to-have
  }

  // Look up recipient's push token and send (fire-and-forget)
  void Promise.resolve(
    supabase
      .from('profiles')
      .select('push_token')
      .eq('id', recipientId)
      .maybeSingle(),
  ).then(({ data: profile }) => {
    const token = profile?.push_token;
    if (!token) return;
    fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        priority: 'high',
      }),
    }).catch(() => {
      // Silently ignore push delivery failures
    });
  }).catch(() => {
    // Silently ignore token lookup failures
  });
};
