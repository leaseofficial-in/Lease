import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { Proof, ProofPhoto } from '../../../types';
import { formatDate, proofStatusLabel } from '../../../lib/formatters';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PhotoGrid } from '../../../components/proof/PhotoGrid';
import { PhotoViewer } from '../../../components/proof/PhotoViewer';
import { RoomTabs } from '../../../components/proof/RoomTabs';
import { StatusPill } from '../../../components/ui/StatusPill';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Cap } from '../../../components/ui/V2';
import { Colors, Fonts } from '../../../constants/theme';
import { confirmAction } from '../../../lib/confirm';
import { markNotificationsRead } from '../../../lib/notificationActions';
import { notifyUser } from '../../../lib/sendPush';
import { sendEmail } from '../../../lib/email';

export default function ReviewProofScreen() {
  const { rentalId, type: typeParam } = useLocalSearchParams<{ rentalId: string; type?: string }>();
  const proofType: 'move_in' | 'move_out' = typeParam === 'move_out' ? 'move_out' : 'move_in';
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();

  const [activeRoom, setActiveRoom] = useState('');
  const [disputeNote, setDisputeNote] = useState('');
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState(0);

  React.useEffect(() => {
    if (!profile?.id || !rentalId) return;
    supabase
      .from('notifications')
      .select('id')
      .eq('user_id', profile.id)
      .eq('read', false)
      .eq('type', 'proof_submitted')
      .contains('data', { rental_id: rentalId })
      .then(({ data }) => {
        const ids = data?.map((item) => item.id) ?? [];
        if (!ids.length) return;
        markNotificationsRead(ids).then(() => {
          void queryClient.invalidateQueries({ queryKey: ['landlord-unread-notifications', profile.id] });
          void queryClient.invalidateQueries({ queryKey: ['landlord-notifications', profile.id] });
        });
      });
  }, [profile?.id, queryClient, rentalId]);

  const { data: proof, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['proof', rentalId, proofType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select('*, photos:proof_photos(*)')
        .eq('rental_id', rentalId)
        .eq('type', proofType)
        .single();
      if (error) throw error;
      return data as Proof & { photos: ProofPhoto[] };
    },
    enabled: !!rentalId,
  });

  const rooms = proof ? [...new Set(proof.photos?.map((p) => p.room_label) ?? [])] : [];

  React.useEffect(() => {
    if (rooms.length > 0 && !activeRoom) setActiveRoom(rooms[0]);
  }, [rooms.length]);

  const filteredPhotos = proof?.photos?.filter((p) => p.room_label === activeRoom) ?? [];

  const photoCounts = proof?.photos?.reduce<Record<string, number>>((acc, p) => {
    acc[p.room_label] = (acc[p.room_label] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  const handleAction = async (action: 'approved' | 'rejected' | 'dispute') => {
    if (!proof) return;
    if (action === 'dispute' && !disputeNote.trim()) {
      showToast('Please describe the dispute', 'error');
      return;
    }

    confirmAction(
      action === 'approved' ? 'Approve Proof' : action === 'rejected' ? 'Reject Proof' : 'Raise Dispute',
      action === 'approved'
        ? 'Confirm that the move-in photos are satisfactory.'
        : action === 'rejected'
        ? 'Reject this proof submission.'
        : 'This will notify the tenant of your concern.',
      async () => {
        setActioning(true);
        try {
          const { error } = await supabase
            .from('proofs')
            .update({
              status: action,
              reviewed_by: profile!.id,
              dispute_note: action === 'dispute' ? disputeNote.trim() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', proof.id);
          if (error) throw error;
          await queryClient.invalidateQueries({ queryKey: ['proof', rentalId] });

          const label = proofType === 'move_out' ? 'move-out' : 'move-in';
          const pushMsg =
            action === 'approved'
              ? { title: 'Proof approved', body: `Your ${label} photos have been approved by your landlord.` }
              : action === 'rejected'
              ? { title: 'Proof rejected', body: `Your ${label} photos were rejected. Contact your landlord.` }
              : { title: 'Landlord raised a dispute', body: disputeNote.trim() };
          void notifyUser({ recipientId: proof.submitted_by, ...pushMsg, type: 'proof_submitted', data: { rental_id: rentalId } });
          sendEmail({
            type: 'proof_reviewed',
            recipientId: proof.submitted_by,
            referenceId: `${proof.id}_${action}`,
            variables: {
              proofType,
              propertyName: '',
              status: action,
              disputeNote: action === 'dispute' ? disputeNote.trim() : '',
            },
          });

          showToast(
            action === 'approved' ? 'Proof approved!' : action === 'rejected' ? 'Proof rejected' : 'Dispute raised',
            action === 'approved' ? 'success' : 'info',
          );
          router.back();
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to update proof status', 'error');
        } finally {
          setActioning(false);
        }
      },
    );
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
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

        <View style={{ flex: 1 }}>
          <Cap>Tenant</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
            {proofType === 'move_out' ? 'Move-out Proof' : 'Move-in Proof'}
          </Text>
        </View>

        {proof && <StatusPill kind="proof" value={proof.status} />}
      </View>

      {!proof ? (
        <EmptyState
          title="No proof submitted"
          subtitle={`The tenant hasn't uploaded ${proofType === 'move_out' ? 'move-out' : 'move-in'} photos yet.`}
          icon={<Ionicons name="camera-outline" size={36} color={Colors.muted} />}
        />
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            contentContainerStyle={{ paddingBottom: proof.status === 'pending' ? 0 : 32 }}
          >
            {/* Meta */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
              <Card padded={false}>
                <View style={{ flexDirection: 'row' }}>
                  <View
                    style={{
                      flex: 1,
                      padding: 16,
                      borderRightWidth: 1,
                      borderRightColor: Colors.border,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 10, letterSpacing: 0.6 }}>
                      SUBMITTED
                    </Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginTop: 4 }}>
                      {formatDate(proof.created_at)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 10, letterSpacing: 0.6 }}>
                      PHOTOS
                    </Text>
                    <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginTop: 4 }}>
                      {proof.photos?.length ?? 0} across {rooms.length} room{rooms.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            {/* Dispute note (if already raised) */}
            {proof.status === 'dispute' && proof.dispute_note && (
              <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                <Card style={{ backgroundColor: Colors.warningSoft, borderColor: '#F1D39B', borderWidth: 1 }}>
                  <Text style={{ color: Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.6, marginBottom: 6 }}>
                    YOUR DISPUTE NOTE
                  </Text>
                  <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 }}>
                    {proof.dispute_note}
                  </Text>
                </Card>
              </View>
            )}

            {/* Room tabs + photos */}
            {rooms.length > 0 && (
              <>
                <RoomTabs
                  rooms={rooms}
                  activeRoom={activeRoom}
                  onSelect={setActiveRoom}
                  photoCounts={photoCounts}
                />
                <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                  <PhotoGrid
                    photos={filteredPhotos}
                    onPhotoPress={(photo, index) => {
                      setViewerPhotoIndex(index);
                      setViewerVisible(true);
                    }}
                  />
                </View>
              </>
            )}

            {/* Action area for pending proofs */}
            {proof.status === 'pending' && (
              <View style={{ paddingHorizontal: 20, paddingBottom: 32, gap: 10 }}>
                <Button
                  title="Approve Proof"
                  onPress={() => void handleAction('approved')}
                  loading={actioning}
                  fullWidth
                />

                <Button
                  title={showDisputeInput ? 'Cancel Dispute' : 'Raise Dispute'}
                  variant="secondary"
                  onPress={() => setShowDisputeInput(!showDisputeInput)}
                  fullWidth
                />

                {showDisputeInput && (
                  <View style={{ gap: 10 }}>
                    <TextInput
                      value={disputeNote}
                      onChangeText={setDisputeNote}
                      placeholder="Describe what's missing or wrong in the photos…"
                      placeholderTextColor={Colors.muted}
                      multiline
                      numberOfLines={4}
                      style={{
                        borderWidth: 1,
                        borderColor: Colors.border,
                        borderRadius: 14,
                        padding: 14,
                        fontFamily: Fonts.sans,
                        fontSize: 14,
                        color: Colors.primary,
                        backgroundColor: Colors.surface,
                        textAlignVertical: 'top',
                        minHeight: 100,
                      }}
                      maxLength={500}
                    />
                    <Button
                      title="Submit Dispute"
                      variant="danger"
                      onPress={() => void handleAction('dispute')}
                      loading={actioning}
                      fullWidth
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Full-screen photo viewer (read-only for landlord) */}
          <PhotoViewer
            photos={filteredPhotos}
            initialIndex={viewerPhotoIndex}
            visible={viewerVisible}
            onClose={() => setViewerVisible(false)}
          />
        </>
      )}
    </SafeAreaView>
  );
}
