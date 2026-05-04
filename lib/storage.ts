import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Config } from '../constants/config';

export type UploadResult = {
  storagePath: string;
  publicUrl: string;
};

// Compress and resize a photo before upload
const compressPhoto = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: Config.photoQuality, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
};

// Convert a local file URI to a Blob
const uriToBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  return response.blob();
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

    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      resolve(file ? URL.createObjectURL(file) : null);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
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

    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      document.body.removeChild(input);
      resolve(files.map((f) => URL.createObjectURL(f)));
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve([]);
    };

    input.click();
  });
};

export const pickPhoto = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return pickWebFile(false);
  }

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
  if (Platform.OS === 'web') {
    return pickWebFile(true);
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
};

export const uploadProofPhoto = async (
  uri: string,
  rentalId: string,
  proofId: string,
  userId: string,
): Promise<UploadResult> => {
  const compressed = Platform.OS === 'web' ? uri : await compressPhoto(uri);
  const blob = await uriToBlob(compressed);
  const filename = `${rentalId}/${proofId}/${userId}_${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('proof-photos')
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from('proof-photos').getPublicUrl(filename);
  return { storagePath: filename, publicUrl: data.publicUrl };
};

export const uploadAvatar = async (uri: string, userId: string): Promise<UploadResult> => {
  const compressed = Platform.OS === 'web' ? uri : await compressPhoto(uri);
  const blob = await uriToBlob(compressed);
  const filename = `avatars/${userId}.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: true });

  if (error) throw new Error(`Avatar upload failed: ${error.message}`);

  const { data } = supabase.storage.from('avatars').getPublicUrl(filename);
  return { storagePath: filename, publicUrl: data.publicUrl };
};

export const pickMultiplePhotos = async (): Promise<string[]> => {
  if (Platform.OS === 'web') {
    return pickWebFiles();
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
    allowsMultipleSelection: true,
    selectionLimit: 10,
  });

  if (result.canceled || result.assets.length === 0) return [];
  return result.assets.map((a) => a.uri);
};

export const deleteProofPhoto = async (storagePath: string): Promise<void> => {
  const { error } = await supabase.storage.from('proof-photos').remove([storagePath]);
  if (error) throw new Error(`Failed to delete photo: ${error.message}`);
};

export const uploadRepairPhoto = async (
  uri: string,
  rentalId: string,
  repairId: string,
): Promise<UploadResult> => {
  const compressed = Platform.OS === 'web' ? uri : await compressPhoto(uri);
  const blob = await uriToBlob(compressed);
  const filename = `repairs/${rentalId}/${repairId}_${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('repair-photos')
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });

  if (error) throw new Error(`Repair photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from('repair-photos').getPublicUrl(filename);
  return { storagePath: filename, publicUrl: data.publicUrl };
};
