import React from 'react';
import { View, type ViewProps } from 'react-native';
import { Colors, Radius, Shadow } from '../../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  elevated?: boolean;
  variant?: 'default' | 'fill' | 'ink';
}

export const Card: React.FC<CardProps> = ({
  children,
  padded = true,
  elevated = true,
  variant = 'default',
  style,
  className,
  ...props
}) => {
  const variantClass = variant === 'ink' ? 'bg-primary' : variant === 'fill' ? 'bg-fill' : 'bg-white';

  return (
    <View
      style={[
        elevated && variant !== 'ink' ? Shadow.card : undefined,
        {
          backgroundColor:
            variant === 'ink' ? Colors.primary : variant === 'fill' ? Colors.fill : Colors.surface,
          borderColor: variant === 'default' ? Colors.border : 'transparent',
          borderRadius: Radius.xl,
          borderWidth: variant === 'default' ? 1 : 0,
          padding: padded ? 18 : 0,
        },
        style,
      ]}
      className={`${variantClass} ${className ?? ''}`}
      {...props}
    >
      {children}
    </View>
  );
};
