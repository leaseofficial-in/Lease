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
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Rental } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { notifyUser } from '../../lib/sendPush';
import { Button } from '../../components/ui/Button';
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

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setToken(text);
      setPreview(null);
      void handleLookup(text);
    }
  };

  const handleLookup = async (overrideToken?: string) => {
    const raw = (overrideToken ?? token).trim();
    if (!raw) {
      showToast('Paste the invite link or token first', 'error');
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
      void notifyUser({
        recipientId: preview.landlord_id,
        title: 'Tenant joined your rental',
        body: `${profile.full_name || 'A tenant'} joined ${preview.property?.name ?? 'your property'}. They'll upload move-in photos next.`,
        type: 'general',
        data: { rental_id: joinedRental.id },
      });
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
        {/* ── Header ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1, borderBottomColor: Colors.border,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center',
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
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}
        >
          {/* ── Hero ── */}
          <View style={{ paddingTop: 8, paddingBottom: 4 }}>
            <View style={{
              width: 52, height: 52, borderRadius: 16,
              backgroundColor: Colors.actionSoft,
              alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <Ionicons name="link" size={26} color={Colors.action} />
            </View>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, lineHeight: 30, marginBottom: 6 }}>
              Enter your invite
            </Text>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 }}>
              Your landlord shared a link that looks like{' '}
              <Text style={{ fontFamily: Fonts.sansMedium, color: Colors.ink2 }}>rentybase.com/join/…</Text>
            </Text>
          </View>

          {/* ── Token input ── */}
          <View style={{
            backgroundColor: Colors.surface, borderRadius: 18,
            borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
          }}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
                Invite Link or Token
              </Text>
              <TextInput
                value={token}
                onChangeText={(v) => { setToken(v); setPreview(null); }}
                placeholder="https://rentybase.com/join/abc123…"
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 12,
                  fontFamily: Fonts.sans, fontSize: 14,
                  color: Colors.primary, backgroundColor: Colors.fill,
                  marginBottom: 10,
                }}
              />
              <TouchableOpacity
                onPress={handlePaste}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                  backgroundColor: Colors.fill2,
                }}
              >
                <Ionicons name="clipboard-outline" size={14} color={Colors.muted} />
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                  Paste from clipboard
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Button
                title="Look Up Rental"
                onPress={() => void handleLookup()}
                loading={loading}
                loadingText="Looking up…"
                fullWidth
              />
            </View>
          </View>

          {/* ── Preview card ── */}
          {preview && (
            <View>
              {/* Found badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </View>
                <Text style={{ color: Colors.success, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
                  Rental found — review before joining
                </Text>
              </View>

              <View style={{
                backgroundColor: Colors.surface, borderRadius: 20,
                borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
              }}>
                {/* Property header */}
                <View style={{ backgroundColor: Colors.primary, padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: 14,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="home" size={22} color="rgba(255,255,255,0.9)" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 18, lineHeight: 22 }}>
                        {preview.property?.name}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.sans, fontSize: 13, marginTop: 2 }}>
                        {preview.property?.address_line1}, {preview.property?.city}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Terms */}
                <View style={{ padding: 20, gap: 0 }}>
                  <TermRow
                    icon="cash-outline"
                    label="Monthly Rent"
                    value={formatCurrency(preview.monthly_rent)}
                    highlight
                  />
                  <Divider />
                  <TermRow
                    icon="shield-checkmark-outline"
                    label="Security Deposit"
                    value={formatCurrency(preview.security_deposit)}
                  />
                  <Divider />
                  <TermRow
                    icon="calendar-outline"
                    label="Due Each Month"
                    value={`${preview.rent_due_day}th`}
                  />
                  <Divider />
                  <TermRow
                    icon="play-circle-outline"
                    label="Starts"
                    value={formatDate(preview.start_date)}
                  />
                </View>

                {/* Join CTA */}
                <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
                  <Button
                    title="Join This Rental"
                    onPress={handleJoin}
                    loading={joining}
                    loadingText="Joining…"
                    fullWidth
                    size="lg"
                  />
                  <Text style={{
                    color: Colors.muted, fontFamily: Fonts.sans,
                    fontSize: 11, textAlign: 'center', lineHeight: 16,
                  }}>
                    You'll be asked to upload move-in proof photos after joining.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Help hint ── */}
          {!preview && !loading && (
            <View style={{
              backgroundColor: Colors.surface, borderRadius: 18,
              borderWidth: 1, borderColor: Colors.border,
              padding: 16, flexDirection: 'row', gap: 12,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: Colors.fill2, alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Ionicons name="information-circle-outline" size={20} color={Colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 4 }}>
                  Don't have an invite yet?
                </Text>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                  Ask your landlord to open RentyBase and share the invite link from their property screen. Invite links expire after 7 days.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 12 }} />;
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
      <View style={{
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: highlight ? Colors.actionSoft : Colors.fill,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={icon} size={16} color={highlight ? Colors.action : Colors.muted} />
      </View>
      <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{
        color: highlight ? Colors.action : Colors.primary,
        fontFamily: highlight ? Fonts.sansSemiBold : Fonts.sansMedium,
        fontSize: highlight ? 17 : 14,
      }}>
        {value}
      </Text>
    </View>
  );
}
