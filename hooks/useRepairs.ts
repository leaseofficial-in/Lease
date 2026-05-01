import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { RepairRequest, RepairStatus } from '../types';

export const useRepairs = (rentalId: string | undefined) => {
  return useQuery({
    queryKey: ['repairs', rentalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('rental_id', rentalId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RepairRequest[];
    },
    enabled: !!rentalId,
  });
};

export const useUpdateRepairStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ repairId, status, rentalId }: {
      repairId: string;
      status: RepairStatus;
      rentalId: string;
    }) => {
      const { error } = await supabase
        .from('repair_requests')
        .update({
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', repairId);
      if (error) throw error;
      return rentalId;
    },
    onSuccess: (rentalId) => {
      queryClient.invalidateQueries({ queryKey: ['repairs', rentalId] });
    },
  });
};
