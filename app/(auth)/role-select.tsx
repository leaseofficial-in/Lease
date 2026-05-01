import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { UserRole } from '../../types';

interface RoleOption {
  role: UserRole;
  badge: string;
  title: string;
  subtitle: string;
  perks: string[];
}

const roles: RoleOption[] = [
  {
    role: 'landlord',
    badge: 'Owner',
    title: 'Landlord',
    subtitle: 'Manage properties, rent, deposits, and proof.',
    perks: ['Create rentals and invite tenants', 'Track rent and deposits', 'Review move-in proof'],
  },
  {
    role: 'tenant',
    badge: 'Tenant',
    title: 'Tenant',
    subtitle: 'Stay on top of your rental home.',
    perks: ['Join by invite link', 'Upload move-in proof', 'Raise repair requests'],
  },
];

export default function RoleSelectScreen() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { setRole } = useAuthStore();
  const { showToast } = useUIStore();
  const router = useRouter();

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await setRole(selected);
      // Navigate directly — don't wait for AuthGate to react
      if (selected === 'landlord') {
        router.replace('/(landlord)');
      } else {
        router.replace('/(tenant)');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save your role.';
      showToast(message, 'error');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View className="flex-1 px-6 pt-8 pb-6">
        <Text className="text-3xl font-bold text-primary mb-2">Choose your workspace</Text>
        <Text className="text-base text-muted mb-8 leading-6">
          Flatvio sets up different tools for landlords and tenants.
        </Text>

        <View className="gap-4 mb-8">
          {roles.map((option) => {
            const isSelected = selected === option.role;
            return (
              <TouchableOpacity
                key={option.role}
                onPress={() => setSelected(option.role)}
                className={`rounded-2xl border-2 p-5 ${
                  isSelected ? 'border-action bg-blue-50' : 'border-border bg-white'
                }`}
                activeOpacity={0.85}
              >
                <View className="flex-row items-center mb-4">
                  <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mr-3">
                    <Text className="text-xs font-bold text-action">{option.badge}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-lg font-bold ${isSelected ? 'text-action' : 'text-primary'}`}>
                      {option.title}
                    </Text>
                    <Text className="text-sm text-muted leading-5">{option.subtitle}</Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      isSelected ? 'border-action bg-action' : 'border-border'
                    }`}
                  >
                    {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </View>
                </View>

                <View className="gap-2">
                  {option.perks.map((perk) => (
                    <View key={perk} className="flex-row items-center">
                      <View className={`w-1.5 h-1.5 rounded-full mr-2 ${isSelected ? 'bg-action' : 'bg-success'}`} />
                      <Text className="text-sm text-primary flex-1">{perk}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="mt-auto">
          <Button
            title="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={!selected}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
