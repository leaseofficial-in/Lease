import { supabase } from './supabase';

export const generateRentalAgreement = async (
  rentalId: string,
): Promise<{ agreementUrl: string; refNo: string }> => {
  const { data, error } = await supabase.functions.invoke('generate-rental-agreement', {
    body: { rentalId },
  });
  if (error) throw error;
  return data as { agreementUrl: string; refNo: string };
};
