import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async (userId: string): Promise<void> => {
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

export const scheduleRentReminder = async (
  rentalId: string,
  dueDay: number,
  monthlyRent: number,
): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const triggerDate = new Date(now.getFullYear(), now.getMonth(), dueDay - 3, 9, 0, 0);
  if (triggerDate <= now) {
    triggerDate.setMonth(triggerDate.getMonth() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rent due in 3 days',
      body: `₹${monthlyRent.toLocaleString('en-IN')} is due on the ${dueDay}th. Pay now to avoid late fees.`,
      data: { rentalId, screen: 'pay-rent' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
};
