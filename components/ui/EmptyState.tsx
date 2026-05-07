import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';
import { Colors, Fonts, Radius } from '../../constants/theme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  secondaryLabel?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  icon?: React.ReactNode;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  actionLabel,
  secondaryLabel,
  onAction,
  onSecondaryAction,
  icon,
  compact = false,
}) => {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 36,
        paddingVertical: compact ? 28 : 56,
      }}
    >
      {icon && (
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: Radius.xl,
            backgroundColor: Colors.fill2,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          {icon}
        </View>
      )}

      <Text
        style={{
          color: Colors.primary,
          fontFamily: Fonts.sansSemiBold,
          fontSize: 16,
          lineHeight: 22,
          textAlign: 'center',
          letterSpacing: -0.2,
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        {title}
      </Text>

      {subtitle && (
        <Text
          style={{
            color: Colors.muted,
            fontFamily: Fonts.sans,
            fontSize: 14,
            lineHeight: 21,
            textAlign: 'center',
            marginBottom: actionLabel ? 22 : 0,
          }}
        >
          {subtitle}
        </Text>
      )}

      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          size="md"
          variant="primary"
          fullWidth
        />
      )}

      {secondaryLabel && onSecondaryAction && (
        <Button
          title={secondaryLabel}
          onPress={onSecondaryAction}
          size="md"
          variant="ghost"
          fullWidth
          style={{ marginTop: 8 }}
        />
      )}
    </View>
  );
};
