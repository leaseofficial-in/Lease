import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
      }}
    >
      <ActivityIndicator size="large" color={Colors.action} />
      {message && (
        <Text
          style={{
            color: Colors.muted,
            fontFamily: Fonts.sans,
            fontSize: 13,
            marginTop: 12,
            letterSpacing: 0.1,
          }}
        >
          {message}
        </Text>
      )}
    </View>
  );
};
