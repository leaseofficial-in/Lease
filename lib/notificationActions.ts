import { supabase } from './supabase';
import { AppNotification } from '../types';

export const markNotificationsRead = async (ids: string[]) => {
  if (!ids.length) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .in('id', ids);
  if (error) throw error;
};

export const markNotificationRead = async (id: string) => {
  await markNotificationsRead([id]);
};

export const routeForNotification = (notification: AppNotification) => {
  const data = notification.data ?? {};
  const rentalId = typeof data.rental_id === 'string' || typeof data.rental_id === 'number'
    ? data.rental_id
    : undefined;
  const propertyId = typeof data.property_id === 'string' || typeof data.property_id === 'number'
    ? String(data.property_id)
    : undefined;

  if (notification.type === 'repair_update' && rentalId) {
    return {
      pathname: '/(landlord)/repairs/[rentalId]' as const,
      params: { rentalId },
    };
  }

  if (notification.type === 'payment_received') {
    return '/(landlord)/payments' as const;
  }

  if (notification.type === 'proof_submitted' && rentalId) {
    return {
      pathname: '/(landlord)/proof/[rentalId]' as const,
      params: { rentalId },
    };
  }

  if (propertyId) {
    return `/(landlord)/property/${propertyId}` as const;
  }

  return '/(landlord)' as const;
};
