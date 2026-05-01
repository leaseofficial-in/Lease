import { useAuthStore } from '../stores/authStore';

// Convenience hook — components shouldn't import the store directly
export const useAuth = () => {
  const { session, profile, isLoading, isInitialized, signOut, updateProfile, setRole } =
    useAuthStore();

  return {
    session,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated: !!session,
    hasRole: !!profile?.role,
    isLandlord: profile?.role === 'landlord',
    isTenant: profile?.role === 'tenant',
    userId: session?.user.id ?? null,
    signOut,
    updateProfile,
    setRole,
  };
};
