import React from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { ProofPhoto } from '../../types';
import { PhotoTile } from './PhotoTile';

const COLUMNS = 3;
const H_PADDING = 40;
const GAP = 4;

interface PhotoGridProps {
  photos: ProofPhoto[];
  onAddPhoto?: () => void;
  onPhotoPress?: (photo: ProofPhoto, index: number) => void;
  onDeletePhoto?: (photo: ProofPhoto) => void;
  canAdd?: boolean;
  canDelete?: boolean;
  maxPhotos?: number;
  uploading?: boolean;
}

type GridItem = ProofPhoto | { id: '_uploading_' } | { id: '_add_' };

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onAddPhoto,
  onPhotoPress,
  onDeletePhoto,
  canAdd = false,
  canDelete = false,
  maxPhotos = 10,
  uploading = false,
}) => {
  const { width } = useWindowDimensions();
  const tileSize = (width - H_PADDING - GAP * (COLUMNS - 1)) / COLUMNS;

  const showAdd = canAdd && photos.length < maxPhotos && !uploading;

  const items: GridItem[] = [
    ...photos,
    ...(uploading ? [{ id: '_uploading_' as const }] : []),
    ...(showAdd ? [{ id: '_add_' as const }] : []),
  ];

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={COLUMNS}
      scrollEnabled={false}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ gap: GAP }}
      renderItem={({ item }) => {
        if (item.id === '_uploading_') {
          return <PhotoTile size={tileSize} photo={null} onPress={() => {}} isUploading />;
        }
        if (item.id === '_add_') {
          return <PhotoTile size={tileSize} photo={null} onPress={() => onAddPhoto?.()} />;
        }
        const photo = item as ProofPhoto;
        const photoIndex = photos.findIndex((p) => p.id === photo.id);
        return (
          <PhotoTile
            size={tileSize}
            photo={photo}
            onPress={() => onPhotoPress?.(photo, photoIndex)}
            onDelete={() => onDeletePhoto?.(photo)}
            canDelete={canDelete}
          />
        );
      }}
    />
  );
};
