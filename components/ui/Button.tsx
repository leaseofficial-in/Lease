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
  loadingText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-white border border-border',
    text: 'text-primary',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-primary',
  },
  danger: {
    container: 'bg-danger',
    text: 'text-white',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-4 rounded-full', text: 'text-sm font-medium' },
  md: { container: 'px-6 rounded-full', text: 'text-base font-semibold' },
  lg: { container: 'px-8 rounded-full', text: 'text-base font-semibold' },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    if (isDisabled) return;
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };
  const { container, text } = variantStyles[variant];
  const { container: sizeContainer, text: sizeText } = sizeStyles[size];

  return (
    <Animated.View style={[fullWidth ? { alignSelf: 'stretch' } : undefined, animatedStyle, style]}>
      <TouchableOpacity
        className={`flex-row items-center justify-center ${container} ${sizeContainer} ${isDisabled ? 'opacity-50' : ''}`}
        style={{ minHeight: size === 'lg' ? 56 : size === 'sm' ? 38 : 50 }}
        disabled={isDisabled}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        {loading ? (
          <>
            <ActivityIndicator
              size="small"
              color={variant === 'primary' || variant === 'danger' ? '#fff' : Colors.action}
            />
            {loadingText && (
              <Text className={`${text} ${sizeText} ml-2`}>{loadingText}</Text>
            )}
          </>
        ) : (
          <>
            {leftIcon && <>{leftIcon}</>}
            <Text className={`${text} ${sizeText} ${leftIcon ? 'ml-2' : ''}`}>{title}</Text>
            {rightIcon && <View className="ml-2">{rightIcon}</View>}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};
