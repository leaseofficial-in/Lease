import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Rental } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';

export default function JoinRentalScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [preview, setPreview] = useState<(Rental & { property: { name: string; city: string; address_line1: string } }) | null>(null);

  const handleLookup = async () => {
    const raw = token.trim();
    if (!raw) {
      showToast('Paste the invite link or token', 'error');
      return;
    }
    // Extract token from full URL if needed
    const extracted = raw.includes('/join/') ? raw.split('/join/').pop()! : raw;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select(`*, property:properties(name, city, address_line1)`)
        .eq('invite_token', extracted)
        .gt('invite_expires_at', new Date().toISOString())
        .is('tenant_id', null)
        .single();

      if (error || !data) {
        showToast('Invite not found or expired. Ask your landlord for a new link.', 'error');
        return;
      }
      setPreview(data as typeof preview);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!preview || !profile) return;
    setJoining(true);
    try {
      const { error } = await supabase
        .from('rentals')
        .update({
          tenant_id: profile.id,
          status: 'pending_proof',
          updated_at: new Date().toISOString(),
        })
        .eq('id', preview.id)
        .is('tenant_id', null);

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['tenant-rental'] });
      showToast('You\'ve joined the rental! Upload move-in photos next.', 'success');
      router.replace('/(tenant)');
    } catch {
      showToast('Failed to join rental. It may have already been taken.', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="px-5 py-4 flex-row items-center border-b border-border">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
            >
              <Text className="text-primary">←</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-primary">Join Rental</Text>
          </View>

          <View className="px-5 pt-6">
            <Text className="text-2xl font-bold text-primary mb-2">Enter invite link</Text>
            <Text className="text-base text-muted mb-6">
              Paste the invite link or token your landlord shared with you.
            </Text>

            <Input
              label="Invite Link or Token"
              placeholder="https://flatvio.in/join/abc123… or just the token"
              value={token}
              onChangeText={(v) => { setToken(v); setPreview(null); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              title="Look Up Rental"
              onPress={handleLookup}
              loading={loading}
              fullWidth
              style={{ marginBottom: 24 }}
            />

            {preview && (
              <Card className="mb-4">
                <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                  Rental Found
                </Text>
                <Text className="text-lg font-bold text-primary mb-1">
                  {preview.property?.name}
                </Text>
                <Text className="text-sm text-muted mb-3">
                  {preview.property?.address_line1}, {preview.property?.city}
                </Text>
                <View className="gap-2 mb-4">
                  <PreviewRow label="Monthly Rent" value={formatCurrency(preview.monthly_rent)} />
                  <PreviewRow label="Security Deposit" value={formatCurrency(preview.security_deposit)} />
                  <PreviewRow label="Due Day" value={`${preview.rent_due_day}th of each month`} />
                  <PreviewRow label="Start Date" value={formatDate(preview.start_date)} />
                </View>
                <Button
                  title="Join This Rental"
                  onPress={handleJoin}
                  loading={joining}
                  fullWidth
                />
              </Card>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-medium text-primary">{value}</Text>
    </View>
  );
}
