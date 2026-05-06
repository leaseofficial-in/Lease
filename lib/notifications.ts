import { Platform } from 'react-native';
import { supabase } from './supabase';

const isSupported = Platform.OS !== 'web';

let Notifications: typeof import('expo-notifications') | null = null;

if (isSupported) {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const registerForPushNotifications = async (userId: string): Promise<void> => {
  if (!isSupported || !Notifications) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
};

// Schedules three local notifications for an active rental:
//   • 2 days before due: "Rent due in 2 days"
//   • On due day at 9am: "Rent due today"
//   • 1 day after due at 9am: "Rent overdue" (with late-fee warning)
export const scheduleRentReminder = async (
  rentalId: string,
  dueDay: number,
  monthlyRent: number,
  lateFeePercent = 5,
): Promise<void> => {
  if (!isSupported || !Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const clampedDay = Math.min(dueDay, 28);
  const rentStr = `₹${monthlyRent.toLocaleString('en-IN')}`;
  const lateFee = Math.round(monthlyRent * lateFeePercent / 100);

  const buildDate = (dayOffset: number): Date => {
    const d = new Date(now.getFullYear(), now.getMonth(), clampedDay + dayOffset, 9, 0, 0);
    if (d <= now) d.setMonth(d.getMonth() + 1);
    return d;
  };

  const shared = { data: { rentalId, screen: 'pay-rent' } };

  // 2 days before
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Rent due in 2 days', body: `${rentStr} is due on the ${clampedDay}th. Pay now to avoid a ₹${lateFee} late fee.`, ...shared },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: buildDate(-2) },
  });

  // Due day
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Rent due today', body: `${rentStr} is due today. Pay now to keep your record clean.`, ...shared },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: buildDate(0) },
  });

  // 1 day overdue
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Rent overdue', body: `Your rent of ${rentStr} is overdue. A late fee of ₹${lateFee} has been added.`, ...shared },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: buildDate(1) },
  });
};
