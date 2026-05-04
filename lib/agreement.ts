import { supabase } from './supabase';

export type RentalAgreementResult = {
  agreementUrl: string;
  refNo: string;
};

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
): Promise<RentalAgreementResult> => {
  const { data, error } = await supabase.functions.invoke('generate-rental-agreement', {
    body: { rentalId },
  });
  if (error) throw new Error(await getFunctionErrorMessage(error));
  return data as RentalAgreementResult;
};

export const fetchAgreementHtml = async (agreementUrl: string): Promise<string> => {
  const response = await fetch(agreementUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Agreement document could not be loaded.');
  }
  return response.text();
};

export const loadRentalAgreementHtml = async (
  rentalId: string,
  agreementUrl?: string | null,
): Promise<RentalAgreementResult & { html: string; refreshed: boolean }> => {
  if (agreementUrl) {
    try {
      return {
        html: await fetchAgreementHtml(agreementUrl),
        agreementUrl,
        refNo: '',
        refreshed: false,
      };
    } catch {
      // Signed agreement links expire; regenerate below so tenants and landlords are not stuck.
    }
  }

  const generated = await generateRentalAgreement(rentalId);
  return {
    ...generated,
    html: await fetchAgreementHtml(generated.agreementUrl),
    refreshed: true,
  };
};
