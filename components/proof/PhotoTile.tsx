import React from 'react';
import { TouchableOpacity, Image, View, Text } from 'react-native';
import { ProofPhoto } from '../../types';

interface PhotoTileProps {
  photo: ProofPhoto | null;
  size: number;
  onPress: () => void;
}

export const PhotoTile: React.FC<PhotoTileProps> = ({ photo, size, onPress }) => {
  if (!photo) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{ width: size, height: size }}
        className="bg-gray-100 rounded-xl items-center justify-center border-2 border-dashed border-border"
        activeOpacity={0.7}
      >
        <Text className="text-2xl text-muted">+</Text>
        <Text className="text-xs text-muted mt-1">Add</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: size, height: size }}
      className="rounded-xl overflow-hidden"
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: photo.public_url }}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
      {photo.annotation && (
        <View className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
          <Text className="text-white text-xs" numberOfLines={1}>
            {photo.annotation}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
