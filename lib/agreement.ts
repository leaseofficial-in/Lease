import { supabase } from './supabase';

async function getFunctionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : 'Agreement generation failed.';
  const context = (error as { context?: Response }).context;
  if (!context) return fallback;

  try {
    const payload = await context.clone().json();
    if (typeof payload?.error === 'string') return payload.error;
  } catch {
    // Keep the original Supabase error message when the response is not JSON.
  }

  return fallback;
}

export const generateRentalAgreement = async (
  rentalId: string,
): Promise<{ agreementUrl: string; refNo: string }> => {
  const { data, error } = await supabase.functions.invoke('generate-rental-agreement', {
    body: { rentalId },
  });
  if (error) throw new Error(await getFunctionErrorMessage(error));
  return data as { agreementUrl: string; refNo: string };
};
