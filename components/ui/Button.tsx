import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-action',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-white border border-border',
    text: 'text-primary',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-action',
  },
  danger: {
    container: 'bg-danger',
    text: 'text-white',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-4 py-2 rounded-lg', text: 'text-sm font-medium' },
  md: { container: 'px-6 py-3.5 rounded-xl', text: 'text-base font-semibold' },
  lg: { container: 'px-8 py-4 rounded-2xl', text: 'text-lg font-semibold' },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  disabled,
  style,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const isDisabled = disabled || loading;
  const { container, text } = variantStyles[variant];
  const { container: sizeContainer, text: sizeText } = sizeStyles[size];

  return (
    <Animated.View style={[fullWidth ? { alignSelf: 'stretch' } : undefined, animatedStyle, style]}>
      <TouchableOpacity
        className={`flex-row items-center justify-center ${container} ${sizeContainer} ${isDisabled ? 'opacity-50' : ''}`}
        disabled={isDisabled}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'danger' ? '#fff' : Colors.action}
          />
        ) : (
          <>
            {leftIcon && <>{leftIcon}</>}
            <Text className={`${text} ${sizeText} ${leftIcon ? 'ml-2' : ''}`}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};
