import React from 'react';
import { View, Text, Image } from 'react-native';
import { getInitials } from '../../lib/formatters';
import { Colors } from '../../constants/theme';

interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
  backgroundColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  uri,
  size = 44,
  backgroundColor = Colors.action,
}) => {
  const initials = getInitials(name);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: size * 0.36,
          fontWeight: '600',
        }}
      >
        {initials}
      </Text>
    </View>
  );
};
