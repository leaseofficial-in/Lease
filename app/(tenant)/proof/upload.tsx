import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { uploadProofPhoto, pickMultiplePhotos, takePhoto, deleteProofPhoto } from '../../../lib/storage';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { Proof, ProofPhoto } from '../../../types';
import { Config } from '../../../constants/config';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PhotoGrid } from '../../../components/proof/PhotoGrid';
import { PhotoViewer } from '../../../components/proof/PhotoViewer';
import { RoomTabs } from '../../../components/proof/RoomTabs';
import { AnnotationModal } from '../../../components/proof/AnnotationModal';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { StatusPill } from '../../../components/ui/StatusPill';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { Cap } from '../../../components/ui/V2';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../../constants/theme';
import { confirmAction } from '../../../lib/confirm';
import { notifyUser } from '../../../lib/sendPush';

export default function UploadProofScreen() {
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();
  const proofType: 'move_in' | 'move_out' = typeParam === 'move_out' ? 'move_out' : 'move_in';
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();

  const [activeRoom, setActiveRoom] = useState<string>(Config.defaultRooms[0]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showPhotoSource, setShowPhotoSource] = useState(false);

  // Viewer + annotation state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState(0);
  const [annotationPhoto, setAnnotationPhoto] = useState<ProofPhoto | null>(null);
  const [annotationVisible, setAnnotationVisible] = useState(false);

  const { data: rental, isLoading: isRentalLoading, error: rentalError, refetch: refetchRental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('tenant_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: proof, isLoading, error: proofError, refetch: refetchProof } = useQuery({
    queryKey: ['proof', rental?.id, proofType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select('*, photos:proof_photos(*)')
        .eq('rental_id', rental!.id)
        .eq('type', proofType)
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
  const totalPhotos = Object.values(photoCounts).reduce((a, b) => a + b, 0);
  const roomsCovered = Object.keys(photoCounts).length;
  const MIN_ROOMS = 2;
  const isReviewed = proof?.status !== undefined && proof.status !== 'pending';
  const uploading = uploadingCount > 0;

  const refreshAll = async () => {
    await refetchRental();
    if (rental?.id) await refetchProof();
  };

  const ensureProof = useCallback(async (): Promise<string> => {
    if (proof?.id) return proof.id;
    if (!rental?.id || !profile?.id) throw new Error('Join a rental before adding proof photos.');
    const { data, error } = await supabase
      .from('proofs')
      .insert({ rental_id: rental.id, type: proofType, submitted_by: profile.id, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    void queryClient.invalidateQueries({ queryKey: ['proof', rental.id] });
    return data.id;
  }, [proof, rental, profile, queryClient]);

  const handlePickPhotos = async (source: 'camera' | 'gallery') => {
    setShowPhotoSource(false);
    if (!rental) return;

    const uris: string[] = source === 'camera'
      ? await takePhoto().then((u) => (u ? [u] : []))
      : await pickMultiplePhotos();

    if (uris.length === 0) return;

    setUploadingCount(uris.length);
    let successCount = 0;
    try {
      const proofId = await ensureProof();
      for (const uri of uris) {
        try {
          const { storagePath, publicUrl } = await uploadProofPhoto(uri, rental.id, proofId, profile!.id);
          const { error } = await supabase.from('proof_photos').insert({
            proof_id: proofId,
            room_label: activeRoom,
            storage_path: storagePath,
            public_url: publicUrl,
            uploaded_by: profile!.id,
          });
          if (error) throw error;
          successCount++;
        } catch {
          // continue with remaining photos
        } finally {
          setUploadingCount((prev) => Math.max(0, prev - 1));
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['proof', rental.id] });
      if (successCount > 0) {
        showToast(successCount === 1 ? 'Photo added!' : `${successCount} photos added!`, 'success');
      }
      if (successCount < uris.length) {
        showToast(`${uris.length - successCount} photo(s) failed to upload`, 'error');
      }
    } catch (e) {
      setUploadingCount(0);
      showToast(e instanceof Error ? e.message : 'Upload failed', 'error');
    }
  };

  const handlePhotoPress = (photo: ProofPhoto, index: number) => {
    setViewerPhotoIndex(index);
    setViewerVisible(true);
  };

  const handleEditNote = (photo: ProofPhoto) => {
    setViewerVisible(false);
    setAnnotationPhoto(photo);
    setAnnotationVisible(true);
  };

  const handleDeletePhoto = (photo: ProofPhoto) => {
    setViewerVisible(false);
    confirmAction(
      'Delete Photo',
      'This photo will be permanently removed from your proof.',
      async () => {
        try {
          await deleteProofPhoto(photo.storage_path);
          const { error } = await supabase.from('proof_photos').delete().eq('id', photo.id);
          if (error) throw error;
          void queryClient.invalidateQueries({ queryKey: ['proof', rental?.id] });
          showToast('Photo removed', 'info');
        } catch (e) {
          showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
        }
      },
      'Delete',
    );
  };

  const handleSaveAnnotation = async (annotation: string) => {
    if (!annotationPhoto) return;
    const { error } = await supabase
      .from('proof_photos')
      .update({ annotation: annotation || null })
      .eq('id', annotationPhoto.id);
    if (error) {
      showToast(error.message, 'error');
    } else {
      void queryClient.invalidateQueries({ queryKey: ['proof', rental?.id] });
    }
  };

  const handleSubmitProof = async () => {
    if (totalPhotos < 3) {
      showToast('Add at least 3 photos before submitting.', 'error');
      return;
    }
    if (roomsCovered < MIN_ROOMS) {
      showToast(`Cover at least ${MIN_ROOMS} rooms — add photos to another room first.`, 'error');
      return;
    }
    if (!proof?.id) {
      showToast('Add photos before submitting proof.', 'error');
      return;
    }
    confirmAction(
      'Submit Proof',
      'Your landlord will be notified to review the photos.',
      async () => {
        setSubmitting(true);
        try {
          const { error } = await supabase
            .from('proofs')
            .update({ status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', proof.id);
          if (error) throw error;
          void queryClient.invalidateQueries({ queryKey: ['proof', rental?.id] });
          if (rental.landlord_id) {
            const label = proofType === 'move_out' ? 'move-out' : 'move-in';
            void notifyUser({
              recipientId: rental.landlord_id,
              title: `${label === 'move-out' ? 'Move-out' : 'Move-in'} photos submitted`,
              body: `Your tenant has submitted ${label} proof photos for review.`,
              type: 'proof_submitted',
              data: { rental_id: rental.id },
            });
          }
          showToast('Proof submitted! Your landlord will review it.', 'success');
          router.back();
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to submit proof', 'error');
        } finally {
          setSubmitting(false);
        }
      },
      'Submit',
    );
  };

  if (isRentalLoading || (!!rental?.id && isLoading)) return <LoadingScreen />;

  if (rentalError || proofError) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
        <EmptyState
          title="Could not load proof"
          subtitle={(rentalError ?? proofError) instanceof Error ? (rentalError ?? proofError)!.message : 'Please try again.'}
          actionLabel="Retry"
          onAction={() => { void refetchRental(); if (rental?.id) void refetchProof(); }}
          icon={<Text style={{ fontSize: 48, color: Colors.danger }}>!</Text>}
        />
      </SafeAreaView>
    );
  }

  if (!rental) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
        <EmptyState
          title="No rental found"
          subtitle="Join a rental before uploading move-in proof."
          actionLabel="Go Back"
          onAction={() => router.back()}
          icon={<Text style={{ fontSize: 48 }}>🏠</Text>}
        />
      </SafeAreaView>
    );
  }

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
          <Cap>{proofType === 'move_out' ? 'Move-out' : 'Move-in'}</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
            Proof Photos
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {totalPhotos > 0 && (
            <View style={{
              backgroundColor: Colors.actionSoft,
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
            }}>
              <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
                {totalPhotos} photos
              </Text>
            </View>
          )}
          {proof && <StatusPill kind="proof" value={proof.status} />}
        </View>
      </View>

      {/* Reviewed state */}
      {isReviewed && proof ? (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 32,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor:
                  proof.status === 'approved' ? Colors.successSoft
                  : proof.status === 'dispute' ? Colors.warningSoft
                  : Colors.dangerSoft,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 32 }}>
                {proof.status === 'approved' ? '✓' : proof.status === 'dispute' ? '⚠' : '✗'}
              </Text>
            </View>

            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>
              {proof.status === 'approved' ? 'Proof Approved'
                : proof.status === 'dispute' ? 'Dispute Raised'
                : 'Proof Rejected'}
            </Text>

            {proof.status === 'approved' && (
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 }}>
                Your landlord has confirmed your move-in photos.
              </Text>
            )}
          </View>

          {proof.status === 'dispute' && proof.dispute_note && (
            <Card style={{ backgroundColor: Colors.warningSoft, borderColor: '#F1D39B', borderWidth: 1 }}>
              <Text style={{ color: Colors.warning, fontFamily: Fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.6, marginBottom: 6 }}>
                LANDLORD'S NOTE
              </Text>
              <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 }}>
                {proof.dispute_note}
              </Text>
            </Card>
          )}

          {/* Show submitted photos read-only */}
          {proof.photos && proof.photos.length > 0 && (
            <>
              <RoomTabs
                rooms={[...new Set(proof.photos.map((p) => p.room_label))]}
                activeRoom={activeRoom}
                onSelect={setActiveRoom}
                photoCounts={photoCounts}
              />
              <PhotoGrid
                photos={activeRoomPhotos}
                onPhotoPress={(photo, index) => { setViewerPhotoIndex(index); setViewerVisible(true); }}
              />
            </>
          )}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRentalLoading || (!!rental?.id && isLoading)} onRefresh={refreshAll} />}
          >
            {/* Tips — shown until first photo uploaded */}
            {totalPhotos === 0 && (
              <Card style={{ marginHorizontal: 20, marginTop: 16 }}>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 13, marginBottom: 8 }}>
                  📸 Tips for good proof photos
                </Text>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 }}>
                  {'• Wide shots of each full room\n• Close-ups of any existing damage or marks\n• Tap a photo to add a note about what you see\n• Cover all rooms before submitting'}
                </Text>
              </Card>
            )}

            <RoomTabs
              rooms={[...Config.defaultRooms]}
              activeRoom={activeRoom}
              onSelect={setActiveRoom}
              photoCounts={photoCounts}
            />

            <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <PhotoGrid
                photos={activeRoomPhotos}
                canAdd
                canDelete
                uploading={uploading}
                maxPhotos={Config.maxPhotosPerRoom}
                onAddPhoto={() => setShowPhotoSource(true)}
                onPhotoPress={handlePhotoPress}
                onDeletePhoto={handleDeletePhoto}
              />
            </View>
          </ScrollView>

          {/* Submit bar */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 16,
              backgroundColor: Colors.surface,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              gap: 6,
            }}
          >
            {totalPhotos > 0 && (totalPhotos < 3 || roomsCovered < MIN_ROOMS) && (
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, textAlign: 'center' }}>
                {totalPhotos < 3
                  ? `Add ${3 - totalPhotos} more photo${3 - totalPhotos === 1 ? '' : 's'}`
                  : `Add photos to ${MIN_ROOMS - roomsCovered} more room${MIN_ROOMS - roomsCovered === 1 ? '' : 's'}`}
                {' '}to submit
              </Text>
            )}
            {totalPhotos > 0 && totalPhotos >= 3 && roomsCovered >= MIN_ROOMS && (
              <Text style={{ color: Colors.success, fontFamily: Fonts.sans, fontSize: 12, textAlign: 'center' }}>
                {roomsCovered} room{roomsCovered === 1 ? '' : 's'} covered · {totalPhotos} photo{totalPhotos === 1 ? '' : 's'} ready
              </Text>
            )}
            <Button
              title={totalPhotos === 0 ? 'Add photos to submit' : `Submit ${totalPhotos} Photo${totalPhotos === 1 ? '' : 's'}`}
              onPress={handleSubmitProof}
              loading={submitting}
              disabled={totalPhotos === 0 || totalPhotos < 3 || roomsCovered < MIN_ROOMS}
              fullWidth
              size="lg"
            />
          </View>
        </>
      )}

      {/* Photo source picker */}
      <BottomSheet visible={showPhotoSource} onClose={() => setShowPhotoSource(false)}>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 16, marginBottom: 16, paddingTop: 4 }}>
          Add Photo
        </Text>
        <View style={{ gap: 10, paddingBottom: 4 }}>
          <TouchableOpacity
            onPress={() => void handlePickPhotos('camera')}
            style={{
              flexDirection: 'row', alignItems: 'center',
              padding: 16, borderRadius: 14,
              borderWidth: 1, borderColor: Colors.border,
              backgroundColor: Colors.surface, gap: 14,
            }}
            activeOpacity={0.78}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.fill2, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera-outline" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>Take Photo</Text>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 1 }}>Use your camera</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void handlePickPhotos('gallery')}
            style={{
              flexDirection: 'row', alignItems: 'center',
              padding: 16, borderRadius: 14,
              borderWidth: 1, borderColor: Colors.border,
              backgroundColor: Colors.surface, gap: 14,
            }}
            activeOpacity={0.78}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.fill2, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="images-outline" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>Choose from Gallery</Text>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 1 }}>Select multiple photos</Text>
            </View>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Full-screen photo viewer */}
      <PhotoViewer
        photos={activeRoomPhotos}
        initialIndex={viewerPhotoIndex}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        onEditNote={handleEditNote}
        onDelete={handleDeletePhoto}
      />

      {/* Annotation editor */}
      {annotationPhoto && (
        <AnnotationModal
          visible={annotationVisible}
          photoUri={annotationPhoto.public_url}
          existingAnnotation={annotationPhoto.annotation ?? ''}
          onSave={handleSaveAnnotation}
          onClose={() => { setAnnotationVisible(false); setAnnotationPhoto(null); }}
        />
      )}
    </SafeAreaView>
  );
}
