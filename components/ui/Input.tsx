import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/theme';

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
    ? 'border-danger'
    : focused
    ? 'border-action'
    : 'border-border';

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-primary mb-1.5">
          {label}
          {required && <Text className="text-danger"> *</Text>}
        </Text>
      )}
      <View
        className={`flex-row items-center bg-white border rounded-xl px-3.5 ${borderColor}`}
        style={{ minHeight: 52 }}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-base text-primary py-3"
          placeholderTextColor={Colors.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={style}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} className="ml-2">
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-xs text-danger mt-1">{error}</Text>}
      {!error && hint && <Text className="text-xs text-muted mt-1">{hint}</Text>}
    </View>
  );
};
