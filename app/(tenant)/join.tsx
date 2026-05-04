import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Rental } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Cap } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';

type PreviewRental = Rental & { property: { name: string; city: string; address_line1: string } };

export default function JoinRentalScreen() {
  const router = useRouter();
  const { prefillToken } = useLocalSearchParams<{ prefillToken?: string }>();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();

  const [token, setToken] = useState(typeof prefillToken === 'string' ? prefillToken : '');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [preview, setPreview] = useState<PreviewRental | null>(null);

  useEffect(() => {
    if (typeof prefillToken === 'string' && prefillToken.length > 0) {
      void handleLookup(prefillToken);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLookup = async (overrideToken?: string) => {
    const raw = (overrideToken ?? token).trim();
    if (!raw) {
      showToast('Paste the invite link or token', 'error');
      return;
    }
    const extracted = raw.includes('/join/') ? raw.split('/join/').pop()! : raw;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select('*, property:properties(name, city, address_line1)')
        .eq('invite_token', extracted)
        .gt('invite_expires_at', new Date().toISOString())
        .is('tenant_id', null)
        .maybeSingle();

      if (error || !data) {
        setPreview(null);
        showToast('Invite not found or expired. Ask your landlord for a new link.', 'error');
        return;
      }
      setPreview(data as PreviewRental);
    } finally {
      setLoading(false);
    }
  };

  const doJoin = async () => {
    if (!preview || !profile) return;
    setJoining(true);
    try {
      let joinedRental: { id: string } | null = null;
      const rpcResult = await supabase
        .rpc('accept_rental_invite', { invite_token_input: preview.invite_token })
        .maybeSingle();

      if (rpcResult.error) {
        const canFallback = rpcResult.error.code === '42883' || rpcResult.error.code === 'PGRST202';
        if (!canFallback) throw rpcResult.error;

        const updateResult = await supabase
          .from('rentals')
          .update({ tenant_id: profile.id, status: 'pending_proof', updated_at: new Date().toISOString() })
          .eq('id', preview.id)
          .is('tenant_id', null)
          .select('id')
          .maybeSingle();
        if (updateResult.error) throw updateResult.error;
        joinedRental = updateResult.data;
      } else {
        joinedRental = rpcResult.data as { id: string } | null;
      }

      if (!joinedRental) throw new Error('Invite could not be accepted.');
      await queryClient.invalidateQueries({ queryKey: ['tenant-rental'] });
      showToast("You've joined the rental! Upload move-in photos next.", 'success');
      router.replace('/(tenant)');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to join. The invite may have been taken.',
        'error',
      );
    } finally {
      setJoining(false);
    }
  };

  const handleJoin = async () => {
    if (!preview || !profile) return;
    // Check for existing active rental
    const { data: existing } = await supabase
      .from('rentals')
      .select('id, status, property:properties(name)')
      .eq('tenant_id', profile.id)
      .neq('status', 'ended')
      .limit(1)
      .maybeSingle();

    if (existing) {
      const prop = Array.isArray(existing.property) ? existing.property[0] : existing.property;
      const propName = (prop as { name?: string } | null)?.name ?? 'another property';
      showToast(
        `You already have an active rental at ${propName}. Your dashboard will show the newest one.`,
        'error',
      );
      return;
    }
    await doJoin();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: Colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: Colors.fill,
              alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View>
            <Cap>Tenant</Cap>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
              Join Rental
            </Text>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        >
          {/* Hero text */}
          <View style={{ paddingTop: 8 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, lineHeight: 30, marginBottom: 6 }}>
              Enter your invite
            </Text>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 }}>
              Paste the invite link or token your landlord sent you. The link looks like{' '}
              <Text style={{ fontFamily: Fonts.sansMedium }}>flatvio.vercel.app/join/…</Text>
            </Text>
          </View>

          {/* Token input */}
          <View>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
              Invite Link or Token <Text style={{ color: Colors.danger }}>*</Text>
            </Text>
            <TextInput
              value={token}
              onChangeText={(v) => { setToken(v); setPreview(null); }}
              placeholder="https://flatvio.vercel.app/join/abc123"
              placeholderTextColor={Colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1.5,
                borderColor: Colors.border,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontFamily: Fonts.sans,
                fontSize: 14,
                color: Colors.primary,
                backgroundColor: Colors.surface,
                marginBottom: 10,
              }}
            />
            <Button
              title="Look Up Rental"
              onPress={() => void handleLookup()}
              loading={loading}
              fullWidth
            />
          </View>

          {/* Preview card */}
          {preview && (
            <View>
              {/* Confirmation header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: Colors.successSoft,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" size={14} color={Colors.success} />
                </View>
                <Text style={{ color: Colors.success, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
                  Rental found — review the details
                </Text>
              </View>

              <Card padded={false}>
                {/* Property hero */}
                <View
                  style={{
                    padding: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: Colors.fill2,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="home" size={20} color={Colors.ink2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17 }}>
                        {preview.property?.name}
                      </Text>
                      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, marginTop: 1 }}>
                        {preview.property?.address_line1}, {preview.property?.city}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Terms grid */}
                <View style={{ padding: 20, gap: 12 }}>
                  <TermRow
                    icon="cash-outline"
                    label="Monthly Rent"
                    value={formatCurrency(preview.monthly_rent)}
                    highlight
                  />
                  <TermRow
                    icon="shield-checkmark-outline"
                    label="Security Deposit"
                    value={formatCurrency(preview.security_deposit)}
                  />
                  <TermRow
                    icon="calendar-outline"
                    label="Due Day"
                    value={`${preview.rent_due_day}th of each month`}
                  />
                  <TermRow
                    icon="play-circle-outline"
                    label="Start Date"
                    value={formatDate(preview.start_date)}
                  />
                </View>

                {/* Join CTA */}
                <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                  <Button
                    title="Join This Rental"
                    onPress={handleJoin}
                    loading={joining}
                    fullWidth
                    size="lg"
                  />
                  <Text
                    style={{
                      color: Colors.muted,
                      fontFamily: Fonts.sans,
                      fontSize: 11,
                      textAlign: 'center',
                      marginTop: 10,
                      lineHeight: 16,
                    }}
                  >
                    By joining you accept the rental terms above. You'll be asked to upload move-in proof photos next.
                  </Text>
                </View>
              </Card>
            </View>
          )}

          {/* Help hint when no preview */}
          {!preview && !loading && (
            <Card style={{ backgroundColor: Colors.fill }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Ionicons name="information-circle-outline" size={20} color={Colors.muted} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 4 }}>
                    Don't have an invite yet?
                  </Text>
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                    Ask your landlord to open Flatvio and share the invite link from their property screen. Links expire after 72 hours.
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TermRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={16} color={Colors.muted} />
      <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text
        style={{
          color: highlight ? Colors.action : Colors.primary,
          fontFamily: Fonts.sansSemiBold,
          fontSize: highlight ? 16 : 13,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
