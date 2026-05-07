import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Config } from '../constants/config';

export type UploadResult = {
  storagePath: string;
  publicUrl: string;
};

// ─── Private helpers ──────────────────────────────────────────────────────────

const compressPhoto = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: Config.photoQuality, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
};

const uriToBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  return response.blob();
};

// Track object URLs created for web file pickers so callers can revoke them.
// Call revokeWebPhotoUrl(uri) once you're done displaying the image.
export const revokeWebPhotoUrl = (uri: string): void => {
  if (typeof URL !== 'undefined' && uri.startsWith('blob:')) {
    URL.revokeObjectURL(uri);
  }
};

const pickWebFile = async (capture = false): Promise<string | null> => {
  if (typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      if (document.body.contains(input)) document.body.removeChild(input);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      cleanup();
      resolve(file ? URL.createObjectURL(file) : null);
    };
    input.oncancel = () => {
      cleanup();
      resolve(null);
    };
    input.click();
  });
};

const pickWebFiles = async (): Promise<string[]> => {
  if (typeof document === 'undefined') return [];

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      if (document.body.contains(input)) document.body.removeChild(input);
    };

    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      cleanup();
      resolve(files.map((f) => URL.createObjectURL(f)));
    };
    input.oncancel = () => {
      cleanup();
      resolve([]);
    };
    input.click();
  });
};

// ─── Shared upload core ───────────────────────────────────────────────────────

const uploadPhotoToStorage = async (
  uri: string,
  bucket: string,
  filename: string,
  upsert = false,
): Promise<UploadResult> => {
  const compressed = Platform.OS === 'web' ? uri : await compressPhoto(uri);
  const blob = await uriToBlob(compressed);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, blob, { contentType: 'image/jpeg', upsert });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return { storagePath: filename, publicUrl: data.publicUrl };
};

// ─── Public pickers ───────────────────────────────────────────────────────────

export const pickPhoto = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return pickWebFile(false);

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
};

export const takePhoto = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return pickWebFile(true);

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
};

export const pickMultiplePhotos = async (): Promise<string[]> => {
  if (Platform.OS === 'web') return pickWebFiles();

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
    allowsMultipleSelection: true,
    selectionLimit: Config.maxPhotosPerRoom,
  });

  if (result.canceled || result.assets.length === 0) return [];
  return result.assets.map((a) => a.uri);
};

// ─── Domain-specific uploads ──────────────────────────────────────────────────

export const uploadProofPhoto = async (
  uri: string,
  rentalId: string,
  proofId: string,
  userId: string,
): Promise<UploadResult> => {
  const filename = `${rentalId}/${proofId}/${userId}_${Date.now()}.jpg`;
  return uploadPhotoToStorage(uri, 'proof-photos', filename);
};

export const uploadRepairPhoto = async (
  uri: string,
  rentalId: string,
  repairId: string,
): Promise<UploadResult> => {
  const filename = `repairs/${rentalId}/${repairId}_${Date.now()}.jpg`;
  return uploadPhotoToStorage(uri, 'repair-photos', filename);
};

export const uploadPaymentProof = async (
  uri: string,
  rentalId: string,
  paymentId: string,
): Promise<UploadResult> => {
  const filename = `payment-proofs/${rentalId}/${paymentId}_${Date.now()}.jpg`;
  return uploadPhotoToStorage(uri, 'proof-photos', filename);
};

export const uploadAvatar = async (uri: string, userId: string): Promise<UploadResult> => {
  const filename = `avatars/${userId}.jpg`;
  return uploadPhotoToStorage(uri, 'avatars', filename, true);
};

export const deleteProofPhoto = async (storagePath: string): Promise<void> => {
  const { error } = await supabase.storage.from('proof-photos').remove([storagePath]);
  if (error) throw new Error(error.message);
};
