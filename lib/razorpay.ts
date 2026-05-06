// Razorpay integration is disabled — payments are handled manually (UPI / bank / cash).
// Re-enable by installing react-native-razorpay and restoring this module when ready.

export const createPaymentOrder = async (): Promise<never> => {
  throw new Error('Razorpay is not enabled. Use manual payment flow.');
};
