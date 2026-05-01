import React from 'react';
import { View, FlatList, Dimensions } from 'react-native';
import { ProofPhoto } from '../../types';
import { PhotoTile } from './PhotoTile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

interface PhotoGridProps {
  photos: ProofPhoto[];
  onAddPhoto?: () => void;
  onPhotoPress?: (photo: ProofPhoto) => void;
  canAdd?: boolean;
  maxPhotos?: number;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onAddPhoto,
  onPhotoPress,
  canAdd = false,
  maxPhotos = 10,
}) => {
  const showAddButton = canAdd && photos.length < maxPhotos;

  const items: Array<ProofPhoto | { id: '__add__' }> = showAddButton
    ? [...photos, { id: '__add__' }]
    : photos;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false}
      columnWrapperStyle={{ gap: 4 }}
      contentContainerStyle={{ gap: 4 }}
      renderItem={({ item }) => (
        <PhotoTile
          size={TILE_SIZE}
          photo={item.id === '__add__' ? null : (item as ProofPhoto)}
          onPress={() => {
            if (item.id === '__add__') {
              onAddPhoto?.();
            } else {
              onPhotoPress?.(item as ProofPhoto);
            }
          }}
        />
      )}
    />
  );
};
