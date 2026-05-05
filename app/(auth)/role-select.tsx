import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Cap, DisplayText, SerifItalic } from '../../components/ui/V2';
import { UserRole } from '../../types';
import { Colors, Fonts } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface RoleOption {
  role: UserRole;
  icon: IoniconName;
  title: string;
  subtitle: string;
  perks: string[];
}

const roles: RoleOption[] = [
  {
    role: 'landlord',
    icon: 'home',
    title: 'Landlord',
    subtitle: 'I own or manage a rental property.',
    perks: [
      'Create rentals and invite tenants',
      'Track rent collection and deposits',
      'Review move-in proof and repair requests',
    ],
  },
  {
    role: 'tenant',
    icon: 'key',
    title: 'Tenant',
    subtitle: 'I rent or am looking to rent a home.',
    perks: [
      'Join your rental via invite link',
      'Pay rent and view payment history',
      'Upload move-in proof and raise repairs',
    ],
  },
];

export default function RoleSelectScreen() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { setRole } = useAuthStore();
  const { showToast } = useUIStore();
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();

  useEffect(() => {
    if (role === 'landlord' || role === 'tenant') {
      setSelected(role);
      void AsyncStorage.setItem('flatvio.pending_role', role);
      return;
    }

    AsyncStorage.getItem('flatvio.pending_role').then((pendingRole) => {
      if (pendingRole === 'landlord' || pendingRole === 'tenant') {
        setSelected(pendingRole);
      }
    });
  }, [role]);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await setRole(selected);
      await AsyncStorage.removeItem('flatvio.pending_role');
      if (selected === 'landlord') router.replace('/(landlord)');
      else router.replace('/(tenant)');
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
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 }}
      >
        <Cap style={{ marginBottom: 10 }}>One last step</Cap>
        <DisplayText style={{ fontSize: 38, lineHeight: 40, marginBottom: 8 }}>
          How will you{'\n'}<SerifItalic>use the app?</SerifItalic>
        </DisplayText>
        <Text
          style={{
            color: Colors.ink3,
            fontFamily: Fonts.sans,
            fontSize: 15,
            lineHeight: 23,
            marginBottom: 32,
          }}
        >
          Flatvio sets up different tools for each role. This cannot be changed later.
        </Text>

        <View style={{ gap: 12, marginBottom: 32 }}>
          {roles.map((option) => {
            const isSelected = selected === option.role;
            return (
              <TouchableOpacity
                key={option.role}
                onPress={() => setSelected(option.role)}
                style={{
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: isSelected ? Colors.action : Colors.border,
                  backgroundColor: isSelected ? Colors.actionSoft : Colors.surface,
                  padding: 20,
                }}
                activeOpacity={0.85}
              >
                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 }}>
                  <View
                    style={{
                      width: 54, height: 54, borderRadius: 17,
                      backgroundColor: isSelected ? Colors.action : Colors.fill2,
                      alignItems: 'center', justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Ionicons name={option.icon} size={26} color={isSelected ? '#fff' : Colors.ink2} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: isSelected ? Colors.action : Colors.primary,
                        fontFamily: Fonts.sansSemiBold,
                        fontSize: 19,
                        lineHeight: 22,
                      }}
                    >
                      {option.title}
                    </Text>
                    <Text
                      style={{
                        color: Colors.ink3,
                        fontFamily: Fonts.sans,
                        fontSize: 13,
                        lineHeight: 19,
                        marginTop: 3,
                      }}
                    >
                      {option.subtitle}
                    </Text>
                  </View>

                  {/* Radio indicator */}
                  <View
                    style={{
                      width: 22, height: 22, borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isSelected ? Colors.action : Colors.border,
                      backgroundColor: isSelected ? Colors.action : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                </View>

                {/* Perk list */}
                <View
                  style={{
                    gap: 8,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: isSelected ? 'rgba(46,91,255,0.12)' : Colors.borderSoft,
                  }}
                >
                  {option.perks.map((perk) => (
                    <View key={perk} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={isSelected ? Colors.action : Colors.success}
                      />
                      <Text
                        style={{
                          color: Colors.ink2,
                          fontFamily: Fonts.sans,
                          fontSize: 13,
                          flex: 1,
                          lineHeight: 19,
                        }}
                      >
                        {perk}
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

        <Text
          style={{
            color: Colors.muted,
            fontFamily: Fonts.sans,
            fontSize: 12,
            textAlign: 'center',
            marginTop: 14,
            lineHeight: 18,
          }}
        >
          Your role is permanent and tied to your account.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
