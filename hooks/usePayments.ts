import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { RentPayment } from '../types';
import { monthKey } from '../lib/formatters';

export const useTenantPayments = (tenantId: string | undefined) => {
  return useQuery({
    queryKey: ['tenant-payments', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('month', { ascending: false });
      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!tenantId,
  });
};

export const useCurrentMonthPayment = (rentalId: string | undefined) => {
  return useQuery({
    queryKey: ['current-payment', rentalId],
    queryFn: async () => {
      const month = monthKey();
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('rental_id', rentalId!)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return (data as RentPayment) ?? null;
    },
    enabled: !!rentalId,
  });
};

export const useLandlordPayments = (landlordId: string | undefined) => {
  return useQuery({
    queryKey: ['landlord-payments', landlordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`*, rental:rentals!inner(*, property:properties(name, city))`)
        .eq('rental.landlord_id', landlordId!)
        .order('month', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!landlordId,
  });
};
