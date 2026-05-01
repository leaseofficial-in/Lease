import React from 'react';
import { View, type ViewProps } from 'react-native';
import { Shadow } from '../../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padded = true,
  elevated = true,
  style,
  className,
  ...props
}) => {
  return (
    <View
      style={[elevated ? Shadow.card : undefined, style]}
      className={`bg-white rounded-2xl ${padded ? 'p-4' : ''} ${className ?? ''}`}
      {...props}
    >
      {children}
    </View>
  );
};
