import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Proof, ProofPhoto } from '../types';

export const useProof = (rentalId: string | undefined, type: 'move_in' | 'move_out' = 'move_in') => {
  return useQuery({
    queryKey: ['proof', rentalId, type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select(`*, photos:proof_photos(*)`)
        .eq('rental_id', rentalId!)
        .eq('type', type)
        .maybeSingle();
      if (error) throw error;
      return data as (Proof & { photos: ProofPhoto[] }) | null;
    },
    enabled: !!rentalId,
  });
};

export const useProofRealtime = (rentalId: string | undefined) => {
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['proof-realtime', rentalId],
    queryFn: async () => {
      if (!rentalId) return null;
      const channel = supabase
        .channel(`proof:${rentalId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'proofs', filter: `rental_id=eq.${rentalId}` },
          () => queryClient.invalidateQueries({ queryKey: ['proof', rentalId] }),
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'proof_photos' },
          () => queryClient.invalidateQueries({ queryKey: ['proof', rentalId] }),
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
    enabled: !!rentalId,
    staleTime: Infinity,
  });
};
