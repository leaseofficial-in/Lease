import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { UserRole } from '../../types';
import { Colors, Fonts, Shadow } from '../../constants/theme';
import { recordTenantReferral } from '../../lib/referrals';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface RoleOption {
  role: UserRole;
  icon: IoniconName;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  perks: { icon: IoniconName; text: string }[];
}

const roles: RoleOption[] = [
  {
    role: 'landlord',
    icon: 'business-outline',
    title: 'Landlord',
    subtitle: 'I own or manage a rental property.',
    color: Colors.action,
    bg: Colors.actionSoft,
    perks: [
      { icon: 'person-add-outline', text: 'Create rentals and invite tenants' },
      { icon: 'cash-outline', text: 'Track rent collection and deposits' },
      { icon: 'camera-outline', text: 'Review move-in proof and repair requests' },
    ],
  },
  {
    role: 'tenant',
    icon: 'home-outline',
    title: 'Tenant',
    subtitle: 'I rent or am looking to rent a home.',
    color: Colors.success,
    bg: Colors.successSoft,
    perks: [
      { icon: 'link-outline', text: 'Join your rental via invite link' },
      { icon: 'receipt-outline', text: 'Pay rent and download HRA receipts' },
      { icon: 'construct-outline', text: 'Upload move-in proof and raise repairs' },
    ],
  },
];

export default function RoleSelectScreen() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { setRole } = useAuthStore();
  const { showToast } = useUIStore();
  const router = useRouter();
  const { role, ref } = useLocalSearchParams<{ role?: string; ref?: string }>();

  useEffect(() => {
    if (role === 'landlord' || role === 'tenant') {
      setSelected(role);
      void AsyncStorage.setItem('rentybase.pending_role', role);
    }
    if (typeof ref === 'string' && ref.trim()) {
      void AsyncStorage.setItem('rentybase.pending_referrer_tenant', ref.trim());
    }

    if (role === 'landlord' || role === 'tenant') return;

    AsyncStorage.getItem('rentybase.pending_role').then((pendingRole) => {
      if (pendingRole === 'landlord' || pendingRole === 'tenant') {
        setSelected(pendingRole);
      }
    });
  }, [ref, role]);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const pendingReferrer = await AsyncStorage.getItem('rentybase.pending_referrer_tenant');
      await setRole(selected);
      await AsyncStorage.removeItem('rentybase.pending_role');
      if (selected === 'landlord') {
        const session = useAuthStore.getState().session;
        await recordTenantReferral(pendingReferrer, session?.user.id);
        await AsyncStorage.removeItem('rentybase.pending_referrer_tenant');
      } else {
        await AsyncStorage.removeItem('rentybase.pending_referrer_tenant');
      }
      // After role is set, always go to country-select for new users.
      // country-select will then redirect to the correct dashboard.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(auth)/country-select' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save your role.';
      showToast(message, 'error');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32 }}
      >
        {/* Header */}
        <Text style={{
          color: Colors.muted, fontFamily: Fonts.mono,
          fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10,
        }}>
          One last step
        </Text>
        <Text style={{
          color: Colors.primary, fontFamily: Fonts.sansSemiBold,
          fontSize: 36, lineHeight: 40, letterSpacing: -0.8, marginBottom: 4,
        }}>
          How will you
        </Text>
        <Text style={{
          color: Colors.ink3, fontFamily: Fonts.serifItalic,
          fontSize: 36, lineHeight: 42, marginBottom: 10,
        }}>
          use the app?
        </Text>
        <Text style={{
          color: Colors.ink3, fontFamily: Fonts.sans,
          fontSize: 15, lineHeight: 23, marginBottom: 32,
        }}>
          RentyBase sets up different tools for each role. This cannot be changed later.
        </Text>

        {/* Role cards */}
        <View style={{ gap: 16, marginBottom: 32 }}>
          {roles.map((option) => {
            const isSelected = selected === option.role;
            return (
              <TouchableOpacity
                key={option.role}
                onPress={() => setSelected(option.role)}
                activeOpacity={0.88}
                style={{
                  borderRadius: 24, overflow: 'hidden',
                  borderWidth: isSelected ? 2.5 : 1,
                  borderColor: isSelected ? option.color : Colors.border,
                  backgroundColor: Colors.surface,
                  ...(isSelected ? Shadow.card : {}),
                }}
              >
                {/* Colored header band */}
                <View style={{
                  backgroundColor: isSelected ? option.color : option.bg,
                  paddingHorizontal: 20, paddingVertical: 20,
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                }}>
                  <View style={{
                    width: 58, height: 58, borderRadius: 18,
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons
                      name={option.icon}
                      size={29}
                      color={isSelected ? '#fff' : option.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: isSelected ? '#fff' : option.color,
                      fontFamily: Fonts.sansSemiBold, fontSize: 20, lineHeight: 24,
                    }}>
                      {option.title}
                    </Text>
                    <Text style={{
                      color: isSelected ? 'rgba(255,255,255,0.7)' : Colors.ink3,
                      fontFamily: Fonts.sans, fontSize: 13, marginTop: 3, lineHeight: 18,
                    }}>
                      {option.subtitle}
                    </Text>
                  </View>

                  {/* Radio */}
                  <View style={{
                    width: 26, height: 26, borderRadius: 13,
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected
                      ? <Ionicons name="checkmark" size={15} color={option.color} />
                      : <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: option.color, opacity: 0.4 }} />
                    }
                  </View>
                </View>

                {/* Perk list */}
                <View style={{
                  paddingHorizontal: 20, paddingVertical: 16, gap: 10,
                  borderTopWidth: 1,
                  borderTopColor: isSelected ? `${option.color}22` : Colors.borderSoft,
                }}>
                  {option.perks.map((perk) => (
                    <View key={perk.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{
                        width: 30, height: 30, borderRadius: 10,
                        backgroundColor: isSelected ? option.bg : Colors.fill,
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Ionicons
                          name={perk.icon}
                          size={15}
                          color={isSelected ? option.color : Colors.muted}
                        />
                      </View>
                      <Text style={{
                        color: Colors.ink2, fontFamily: Fonts.sans,
                        fontSize: 13, flex: 1, lineHeight: 19,
                      }}>
                        {perk.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title={
            selected
              ? `Continue as ${selected === 'landlord' ? 'Landlord' : 'Tenant'}`
              : 'Select a role to continue'
          }
          onPress={handleContinue}
          loading={loading}
          disabled={!selected}
          fullWidth
          size="lg"
        />

        <Text style={{
          color: Colors.muted, fontFamily: Fonts.sans,
          fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 18,
        }}>
          Your role is permanent and tied to your account.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
