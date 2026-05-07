import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Fonts } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'action' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

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

const VARIANT: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: Colors.primary,  text: Colors.surface },
  action:    { bg: Colors.action,   text: Colors.surface },
  secondary: { bg: Colors.surface,  text: Colors.primary, border: Colors.border },
  ghost:     { bg: 'transparent',   text: Colors.primary },
  danger:    { bg: Colors.danger,   text: Colors.surface },
};

const SIZE: Record<ButtonSize, { height: number; px: number; fontSize: number; radius: number }> = {
  sm: { height: 36, px: 14, fontSize: 13, radius: 9999 },
  md: { height: 50, px: 22, fontSize: 15, radius: 9999 },
  lg: { height: 56, px: 28, fontSize: 16, radius: 16 },
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
  const v = VARIANT[variant];
  const s = SIZE[size];

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    if (isDisabled) return;
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  return (
    <Animated.View
      style={[fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, animatedStyle, style]}
    >
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: s.height,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border ?? 'transparent',
          opacity: isDisabled ? 0.45 : 1,
        }}
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
              color={variant === 'secondary' || variant === 'ghost' ? Colors.action : '#fff'}
            />
            {loadingText && (
              <Text
                style={{
                  color: v.text,
                  fontFamily: Fonts.sansSemiBold,
                  fontSize: s.fontSize,
                  marginLeft: 8,
                }}
              >
                {loadingText}
              </Text>
            )}
          </>
        ) : (
          <>
            {leftIcon && <View style={{ marginRight: 7 }}>{leftIcon}</View>}
            <Text
              style={{
                color: v.text,
                fontFamily: Fonts.sansSemiBold,
                fontSize: s.fontSize,
                letterSpacing: size === 'lg' ? -0.2 : 0,
              }}
            >
              {title}
            </Text>
            {rightIcon && <View style={{ marginLeft: 7 }}>{rightIcon}</View>}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};
