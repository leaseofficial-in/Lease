import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';
import { BackButton } from './Icon';

interface PageHeaderProps {
  /** Main title shown in the header */
  title: string;
  /** Small uppercase caption above the title (optional) */
  caption?: string;
  /** Called when back button is pressed. Omit to hide back button. */
  onBack?: () => void;
  /** Element rendered in the trailing slot (right side) */
  right?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Shared header used by all screen-level pages (non-tab screens and pushed tabs).
 * Provides consistent back button placement, title hierarchy, and border.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  caption,
  onBack,
  right,
  style,
}) => {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          minHeight: 60,
        },
        style,
      ]}
    >
      {onBack && (
        <BackButton
          onPress={onBack}
          style={{ marginRight: 12, flexShrink: 0 }}
        />
      )}

      <View style={{ flex: 1 }}>
        {caption && (
          <Text
            style={{
              color: Colors.muted,
              fontFamily: Fonts.mono,
              fontSize: 10,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              marginBottom: 1,
            }}
          >
            {caption}
          </Text>
        )}
        <Text
          style={{
            color: Colors.primary,
            fontFamily: Fonts.sansSemiBold,
            fontSize: onBack ? 18 : 22,
            letterSpacing: -0.3,
            lineHeight: onBack ? 23 : 28,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {right && (
        <View style={{ marginLeft: 12, flexShrink: 0 }}>
          {right}
        </View>
      )}
    </View>
  );
};
