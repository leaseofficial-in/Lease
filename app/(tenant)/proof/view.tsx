import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { Proof, ProofPhoto, Rental } from '../../../types';
import { Colors, Fonts } from '../../../constants/theme';
import { DashboardShell } from '../../../components/layout/WebSidebar';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';

const THUMB_COLORS = [
  '#a87a4f', '#c9a878', '#9aa6a3', '#a89280',
  '#7a5d35', '#5b3a20', '#4f5e5b', '#5e483a',
  '#6e553a', '#3a4441', '#664a32', '#876b4f',
];

function SealIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={13} fill="none" stroke={Colors.accent} strokeWidth={1.4} />
      <Path d="M11 16 l4 4 l6 -7" fill="none" stroke={Colors.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ProofViewScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();

  const { data: rental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('*, property:properties(*)')
        .eq('tenant_id', profile!.id)
        .eq('status', 'active')
        .single();
      if (error) throw error;
      return data as Rental;
    },
    enabled: !!profile?.id,
  });

  const { data: proof, isLoading } = useQuery({
    queryKey: ['tenant-proof', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select('*')
        .eq('rental_id', rental!.id)
        .eq('type', 'move_in')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data as Proof;
    },
    enabled: !!rental?.id,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['tenant-proof-photos', proof?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proof_photos')
        .select('*')
        .eq('proof_id', proof!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ProofPhoto[];
    },
    enabled: !!proof?.id,
  });

  if (isLoading) return <LoadingScreen />;

  const sealedDate = proof ? new Date(proof.created_at) : null;
  const sealedLabel = sealedDate
    ? sealedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const photoCount = photos.length;

  return (
    <DashboardShell role="tenant">
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1, borderBottomColor: Colors.border,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
              Sealed {sealedLabel}
            </Text>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
              Move-in proof
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          {/* Sealed banner */}
          <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 4 }}>
            <View style={{
              backgroundColor: Colors.accentSoft,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#F3D5A6',
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}>
              <SealIcon />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.accent, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
                  Locked &amp; geotagged
                </Text>
                <Text style={{ color: '#A37840', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, marginTop: 1 }}>
                  {photoCount} photo{photoCount !== 1 ? 's' : ''} · {sealedLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Photo grid */}
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 16, color: Colors.primary }}>
                The unit · {photoCount} photo{photoCount !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity onPress={() => showToast('PDF export coming soon', 'info')} activeOpacity={0.75}>
                <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 13, color: Colors.action }}>⤓ PDF</Text>
              </TouchableOpacity>
            </View>

            {photoCount === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="camera-outline" size={40} color={Colors.muted} />
                <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 14, marginTop: 12 }}>
                  No photos uploaded yet
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {photos.map((photo, idx) => (
                  <View
                    key={photo.id}
                    style={{
                      width: '31%',
                      aspectRatio: 1,
                      borderRadius: 10,
                      overflow: 'hidden',
                      backgroundColor: THUMB_COLORS[idx % THUMB_COLORS.length],
                    }}
                  >
                    {photo.public_url ? (
                      <Image source={{ uri: photo.public_url }} style={{ width: '100%', height: '100%' }} />
                    ) : null}
                    <View style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      backgroundColor: 'rgba(0,0,0,0.42)', padding: 5,
                    }}>
                      <Text style={{ color: '#fff', fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.3 }} numberOfLines={1}>
                        {photo.room_label}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Document trail */}
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 16, color: Colors.primary, marginBottom: 12 }}>
              Document trail
            </Text>

            <View style={{ backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderSoft, overflow: 'hidden' }}>
              {[
                {
                  icon: '📄',
                  iconBg: Colors.actionSoft,
                  iconColor: Colors.action,
                  title: 'Lease agreement · signed',
                  sub: `11-month · ${rental?.start_date ? new Date(rental.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}`,
                  action: rental?.agreement_url ? 'PDF →' : '—',
                  onAction: rental?.agreement_url ? () => showToast('Opening agreement…', 'info') : undefined,
                },
                {
                  icon: '🪪',
                  iconBg: Colors.accentSoft,
                  iconColor: Colors.accent,
                  title: 'Move-in proof submitted',
                  sub: `Both parties · ${sealedLabel}`,
                  action: '✓',
                  onAction: undefined,
                },
                {
                  icon: '📋',
                  iconBg: Colors.fill,
                  iconColor: Colors.ink3,
                  title: 'Inventory checklist',
                  sub: 'Agreed by both parties on move-in',
                  action: 'View →',
                  onAction: () => showToast('Checklist coming soon', 'info'),
                },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={item.title}
                  onPress={item.onAction}
                  activeOpacity={item.onAction ? 0.78 : 1}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingHorizontal: 14, paddingVertical: 14,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                    borderBottomColor: Colors.borderSoft,
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: item.iconBg,
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>{item.title}</Text>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 2 }}>{item.sub}</Text>
                  </View>
                  {item.action !== '—' && (
                    <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 11 }}>
                      {item.action}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardShell>
  );
}
