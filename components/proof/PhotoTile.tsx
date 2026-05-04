import React from 'react';
import { TouchableOpacity, Image, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProofPhoto } from '../../types';
import { Colors } from '../../constants/theme';

interface PhotoTileProps {
  photo: ProofPhoto | null;
  size: number;
  onPress: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  isUploading?: boolean;
}

export const PhotoTile: React.FC<PhotoTileProps> = ({
  photo,
  size,
  onPress,
  onDelete,
  canDelete = false,
  isUploading = false,
}) => {
  const tileBase = {
    width: size,
    height: size,
    borderRadius: 14,
  };

  if (!photo) {
    if (isUploading) {
      return (
        <View
          style={{
            ...tileBase,
            backgroundColor: Colors.fill,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderStyle: 'dashed' as const,
            borderColor: Colors.border,
          }}
        >
          <ActivityIndicator color={Colors.action} size="small" />
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          ...tileBase,
          backgroundColor: Colors.fill,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderStyle: 'dashed' as const,
          borderColor: Colors.border,
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={24} color={Colors.muted} />
        <Text style={{ color: Colors.muted, fontSize: 10, marginTop: 2 }}>Add</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ ...tileBase, overflow: 'hidden' }}>
      <TouchableOpacity onPress={onPress} style={{ flex: 1 }} activeOpacity={0.85}>
        <Image
          source={{ uri: photo.public_url }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
        {photo.annotation ? (
          <View
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              backgroundColor: 'rgba(0,0,0,0.52)',
              paddingHorizontal: 6,
              paddingVertical: 3,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10 }} numberOfLines={1}>
              {photo.annotation}
            </Text>
          </View>
        ) : (
          <View
            style={{
              position: 'absolute',
              bottom: 5, right: 5,
              width: 18, height: 18, borderRadius: 9,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="create-outline" size={10} color="rgba(255,255,255,0.75)" />
          </View>
        )}
      </TouchableOpacity>

      {canDelete && onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          style={{
            position: 'absolute',
            top: 4, right: 4,
            width: 22, height: 22, borderRadius: 11,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center', justifyContent: 'center',
          }}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={12} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};
