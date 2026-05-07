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

// Insert the in-app notification row. Best-effort — failures don't propagate.
const insertNotification = async (payload: NotifyPayload): Promise<void> => {
  try {
    await supabase.from('notifications').insert({
      user_id: payload.recipientId,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      read: false,
      data: payload.data ?? null,
    });
  } catch {
    // In-app notification is a nice-to-have; a failure here must never
    // break the caller's main flow.
  }
};

// Look up the recipient's Expo push token and fire a push notification.
// Best-effort — failures don't propagate.
const sendPushNotification = async (payload: NotifyPayload): Promise<void> => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', payload.recipientId)
      .maybeSingle();

    const token = profile?.push_token;
    if (!token) return;

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: 'default',
        priority: 'high',
      }),
    });
  } catch {
    // Push delivery failures are expected (token expired, device offline, etc.)
    // and must never surface to the user.
  }
};

export const notifyUser = (payload: NotifyPayload): void => {
  // Fire both operations concurrently, in the background. Neither awaited by
  // callers because a notification failure is never reason to block the UX.
  void insertNotification(payload);
  void sendPushNotification(payload);
};
