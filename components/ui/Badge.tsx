import React from 'react';
import { View, Text } from 'react-native';

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

interface BadgeProps {
  label: string;
  color?: BadgeColor;
  size?: 'sm' | 'md';
}

const colorMap: Record<BadgeColor, { bg: string; text: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-action' },
  green:  { bg: 'bg-emerald-50', text: 'text-success' },
  yellow: { bg: 'bg-amber-50',  text: 'text-warning' },
  red:    { bg: 'bg-red-50',    text: 'text-danger' },
  gray:   { bg: 'bg-gray-100',  text: 'text-muted' },
};

export const Badge: React.FC<BadgeProps> = ({ label, color = 'blue', size = 'md' }) => {
  const { bg, text } = colorMap[color];
  return (
    <View className={`${bg} rounded-full ${size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'}`}>
      <Text className={`${text} ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium`}>
        {label}
      </Text>
    </View>
  );
};
