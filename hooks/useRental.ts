import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Rental } from '../types';
import { useAuth } from './useAuth';

export const useLandlordRentals = () => {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['landlord-rentals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select(`*, property:properties(*), tenant:profiles!rentals_tenant_id_fkey(*)`)
        .eq('landlord_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Rental[];
    },
    enabled: !!userId,
  });
};

export const useTenantRental = () => {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['tenant-rental', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select(`*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(*)`)
        .eq('tenant_id', userId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return (data as Rental) ?? null;
    },
    enabled: !!userId,
  });
};

export const useRentalRealtime = (rentalId: string | undefined) => {
  const queryClient = useQueryClient();

  // Subscribe to realtime changes on the rental row
  useQuery({
    queryKey: ['rental-realtime', rentalId],
    queryFn: async () => {
      if (!rentalId) return null;
      const channel = supabase
        .channel(`rental:${rentalId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rentals', filter: `id=eq.${rentalId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ['tenant-rental'] });
            queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
          },
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    },
    enabled: !!rentalId,
    staleTime: Infinity,
  });
};
