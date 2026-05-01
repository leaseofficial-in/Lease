import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { Proof, ProofPhoto } from '../../../types';
import { formatDate, proofStatusLabel } from '../../../lib/formatters';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PhotoGrid } from '../../../components/proof/PhotoGrid';
import { RoomTabs } from '../../../components/proof/RoomTabs';
import { StatusPill } from '../../../components/ui/StatusPill';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors } from '../../../constants/theme';
import { confirmAction } from '../../../lib/confirm';
import { markNotificationsRead } from '../../../lib/notificationActions';

export default function ReviewProofScreen() {
  const { rentalId } = useLocalSearchParams<{ rentalId: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [activeRoom, setActiveRoom] = useState('');
  const [disputeNote, setDisputeNote] = useState('');
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [actioning, setActioning] = useState(false);

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
    queryKey: ['proof', rentalId, 'move_in'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select(`*, photos:proof_photos(*)`)
        .eq('rental_id', rentalId)
        .eq('type', 'move_in')
        .single();
      if (error) throw error;
      return data as Proof & { photos: ProofPhoto[] };
    },
    enabled: !!rentalId,
  });

  const rooms = proof
    ? [...new Set(proof.photos?.map((p) => p.room_label) ?? [])]
    : [];

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
        ? 'Confirm that the move-in photos are satisfactory?'
        : action === 'rejected'
        ? 'Reject this proof submission?'
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
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center bg-white border-b border-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <Text className="text-primary">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-primary flex-1">Move-in Proof</Text>
        {proof && <StatusPill kind="proof" value={proof.status} />}
      </View>

      {!proof ? (
        <EmptyState
          title="No proof submitted"
          subtitle="The tenant hasn't uploaded move-in photos yet."
          icon={<Text style={{ fontSize: 48 }}>📷</Text>}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {/* Meta */}
          <Card className="mx-5 mt-4">
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Submitted</Text>
              <Text className="text-sm font-medium text-primary">
                {formatDate(proof.created_at)}
              </Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-sm text-muted">Photos</Text>
              <Text className="text-sm font-medium text-primary">
                {proof.photos?.length ?? 0} across {rooms.length} rooms
              </Text>
            </View>
          </Card>

          {/* Room tabs */}
          {rooms.length > 0 && (
            <>
              <RoomTabs
                rooms={rooms}
                activeRoom={activeRoom}
                onSelect={setActiveRoom}
                photoCounts={photoCounts}
              />
              <View className="px-5 pb-4">
                <PhotoGrid photos={filteredPhotos} onPhotoPress={() => {}} />
              </View>
            </>
          )}

          {/* Actions for pending proofs */}
          {proof.status === 'pending' && (
            <View className="px-5 pb-8 gap-3">
              <Button
                title="Approve Proof ✓"
                onPress={() => handleAction('approved')}
                loading={actioning}
                fullWidth
              />
              <Button
                title="Raise Dispute"
                variant="secondary"
                onPress={() => setShowDisputeInput(!showDisputeInput)}
                fullWidth
              />

              {showDisputeInput && (
                <View>
                  <TextInput
                    value={disputeNote}
                    onChangeText={setDisputeNote}
                    placeholder="Describe what's missing or wrong in the photos…"
                    placeholderTextColor={Colors.muted}
                    multiline
                    numberOfLines={4}
                    className="border border-border rounded-xl p-3 text-sm text-primary"
                    style={{ textAlignVertical: 'top', minHeight: 96 }}
                    maxLength={500}
                  />
                  <Button
                    title="Submit Dispute"
                    variant="danger"
                    onPress={() => handleAction('dispute')}
                    loading={actioning}
                    fullWidth
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
