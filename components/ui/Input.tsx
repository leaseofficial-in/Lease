import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Colors, Fonts, Radius } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  required = false,
  style,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? Colors.danger
    : focused
    ? Colors.action
    : Colors.border;

  const bgColor = focused ? Colors.surface : Colors.fill;

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text
          style={{
            color: Colors.muted,
            fontFamily: Fonts.mono,
            fontSize: 10,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
            marginBottom: 7,
          }}
        >
          {label}
          {required && (
            <Text style={{ color: Colors.danger }}> *</Text>
          )}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: bgColor,
          borderWidth: 1.5,
          borderColor,
          borderRadius: Radius.md,
          paddingHorizontal: 14,
          minHeight: 52,
        }}
      >
        {leftIcon && (
          <View style={{ marginRight: 10, opacity: focused ? 1 : 0.6 }}>
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[
            {
              flex: 1,
              fontFamily: Fonts.sans,
              fontSize: 15,
              color: Colors.primary,
              paddingVertical: 13,
            },
            style,
          ]}
          placeholderTextColor={Colors.muted}
          allowFontScaling={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ marginLeft: 10, padding: 2 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text
          style={{
            color: Colors.danger,
            fontFamily: Fonts.sans,
            fontSize: 12,
            marginTop: 5,
            lineHeight: 16,
          }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={{
            color: Colors.muted,
            fontFamily: Fonts.sans,
            fontSize: 12,
            marginTop: 5,
            lineHeight: 16,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
};
