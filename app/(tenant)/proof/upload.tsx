import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { uploadProofPhoto, pickPhoto, takePhoto } from '../../../lib/storage';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { Proof, ProofPhoto } from '../../../types';
import { Config } from '../../../constants/config';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PhotoGrid } from '../../../components/proof/PhotoGrid';
import { RoomTabs } from '../../../components/proof/RoomTabs';
import { AnnotationModal } from '../../../components/proof/AnnotationModal';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { StatusPill } from '../../../components/ui/StatusPill';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';

export default function UploadProofScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();

  const [activeRoom, setActiveRoom] = useState<string>(Config.defaultRooms[0]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProofPhoto | null>(null);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [showPhotoSource, setShowPhotoSource] = useState(false);

  // Fetch current tenant rental
  const { data: rental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('tenant_id', profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch existing proof
  const { data: proof, isLoading } = useQuery({
    queryKey: ['proof', rental?.id, 'move_in'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select(`*, photos:proof_photos(*)`)
        .eq('rental_id', rental!.id)
        .eq('type', 'move_in')
        .maybeSingle();
      if (error) throw error;
      return data as (Proof & { photos: ProofPhoto[] }) | null;
    },
    enabled: !!rental?.id,
  });

  const photoCounts = proof?.photos?.reduce<Record<string, number>>((acc, p) => {
    acc[p.room_label] = (acc[p.room_label] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  const activeRoomPhotos = proof?.photos?.filter((p) => p.room_label === activeRoom) ?? [];

  const ensureProof = useCallback(async (): Promise<string> => {
    if (proof?.id) return proof.id;
    const { data, error } = await supabase
      .from('proofs')
      .insert({
        rental_id: rental!.id,
        type: 'move_in',
        submitted_by: profile!.id,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['proof', rental?.id] });
    return data.id;
  }, [proof, rental, profile, queryClient]);

  const handlePickPhoto = async (source: 'camera' | 'gallery') => {
    setShowPhotoSource(false);
    if (!rental) return;

    const uri = source === 'camera' ? await takePhoto() : await pickPhoto();
    if (!uri) return;

    setUploading(true);
    try {
      const proofId = await ensureProof();
      const { storagePath, publicUrl } = await uploadProofPhoto(uri, rental.id, proofId, profile!.id);

      const { error } = await supabase.from('proof_photos').insert({
        proof_id: proofId,
        room_label: activeRoom,
        storage_path: storagePath,
        public_url: publicUrl,
        uploaded_by: profile!.id,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['proof', rental.id] });
      showToast('Photo added!', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAnnotation = async (annotation: string) => {
    if (!selectedPhoto) return;
    const { error } = await supabase
      .from('proof_photos')
      .update({ annotation: annotation || null })
      .eq('id', selectedPhoto.id);
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ['proof', rental?.id] });
    }
    setSelectedPhoto(null);
  };

  const handleSubmitProof = async () => {
    const total = Object.values(photoCounts).reduce((a, b) => a + b, 0);
    if (total < 3) {
      Alert.alert('Add more photos', 'Please add at least 3 photos before submitting.');
      return;
    }
    Alert.alert(
      'Submit Proof',
      'Once submitted, your landlord will review the photos. You won\'t be able to add more.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await supabase
                .from('proofs')
                .update({ status: 'pending', updated_at: new Date().toISOString() })
                .eq('id', proof!.id);
              await queryClient.invalidateQueries({ queryKey: ['proof', rental?.id] });
              showToast('Proof submitted! Your landlord will review it.', 'success');
              router.back();
            } catch {
              showToast('Failed to submit proof', 'error');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading) return <LoadingScreen />;

  const totalPhotos = Object.values(photoCounts).reduce((a, b) => a + b, 0);
  const isSubmitted = proof?.status !== undefined && proof.status !== 'pending';

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
        <View className="flex-1">
          <Text className="text-lg font-bold text-primary">Move-in Proof</Text>
          <Text className="text-xs text-muted">{totalPhotos} photos across {Config.defaultRooms.length} rooms</Text>
        </View>
        {proof && <StatusPill kind="proof" value={proof.status} />}
      </View>

      {isSubmitted && proof ? (
        <EmptyState
          title={proof.status === 'approved' ? 'Proof Approved ✓' : 'Proof Submitted'}
          subtitle={
            proof.status === 'approved'
              ? 'Your landlord has approved the move-in photos.'
              : proof.status === 'dispute'
              ? `Dispute: ${proof.dispute_note}`
              : 'Your landlord is reviewing the photos.'
          }
          icon={<Text style={{ fontSize: 48 }}>{proof.status === 'approved' ? '✅' : '📷'}</Text>}
        />
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Instructions */}
            {!proof && (
              <Card className="mx-5 mt-4">
                <Text className="text-sm font-medium text-primary mb-1">📸 Tips for good proof photos</Text>
                <Text className="text-xs text-muted leading-4">
                  • Take wide shots of each room{'\n'}
                  • Document any existing damage or marks{'\n'}
                  • Tap a photo to add a note about what you see{'\n'}
                  • Cover all rooms before submitting
                </Text>
              </Card>
            )}

            {/* Room tabs */}
            <RoomTabs
              rooms={[...Config.defaultRooms]}
              activeRoom={activeRoom}
              onSelect={setActiveRoom}
              photoCounts={photoCounts}
            />

            <View className="px-5 pb-4">
              {uploading && (
                <View className="items-center py-4">
                  <ActivityIndicator color="#1A56FF" />
                  <Text className="text-sm text-muted mt-2">Uploading…</Text>
                </View>
              )}

              <PhotoGrid
                photos={activeRoomPhotos}
                canAdd={!uploading}
                onAddPhoto={() => setShowPhotoSource(true)}
                onPhotoPress={(photo) => {
                  setSelectedPhoto(photo);
                  setShowAnnotation(true);
                }}
                maxPhotos={Config.maxPhotosPerRoom}
              />
            </View>
          </ScrollView>

          {/* Submit bar */}
          <View className="px-5 py-4 bg-white border-t border-border">
            <Button
              title={totalPhotos === 0 ? 'Add photos to submit' : `Submit ${totalPhotos} Photos`}
              onPress={handleSubmitProof}
              loading={submitting}
              disabled={totalPhotos === 0}
              fullWidth
              size="lg"
            />
          </View>
        </>
      )}

      {/* Photo source bottom sheet */}
      <BottomSheet visible={showPhotoSource} onClose={() => setShowPhotoSource(false)}>
        <Text className="text-lg font-semibold text-primary mb-4 pt-2">Add Photo</Text>
        <View className="gap-3 pb-2">
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              onPress={() => handlePickPhoto('camera')}
              className="flex-row items-center p-4 rounded-xl border border-border bg-white"
            >
              <Text style={{ fontSize: 24 }} className="mr-3">📷</Text>
              <Text className="text-base font-medium text-primary">Take Photo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => handlePickPhoto('gallery')}
            className="flex-row items-center p-4 rounded-xl border border-border bg-white"
          >
            <Text style={{ fontSize: 24 }} className="mr-3">🖼️</Text>
            <Text className="text-base font-medium text-primary">Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Annotation modal */}
      {selectedPhoto && (
        <AnnotationModal
          visible={showAnnotation}
          photoUri={selectedPhoto.public_url}
          existingAnnotation={selectedPhoto.annotation ?? ''}
          onSave={handleSaveAnnotation}
          onClose={() => { setShowAnnotation(false); setSelectedPhoto(null); }}
        />
      )}
    </SafeAreaView>
  );
}
