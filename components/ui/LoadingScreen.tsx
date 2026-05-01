import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../../constants/theme';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color={Colors.action} />
      {message && (
        <Text className="text-sm text-muted mt-3">{message}</Text>
      )}
    </View>
  );
};
