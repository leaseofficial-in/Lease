import React from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, Fonts } from '../../constants/theme';

type LogoVariant = 'full' | 'symbol' | 'wordmark';

interface LogoProps {
  variant?: LogoVariant;
  color?: string;
  size?: number;
  inverse?: boolean;
  style?: StyleProp<ViewStyle | TextStyle>;
}

export function Logo({
  variant = 'full',
  color,
  size = 40,
  inverse = false,
  style,
}: LogoProps) {
  const markColor = color ?? (inverse ? Colors.surface : Colors.primary);
  const dotColor = inverse ? 'rgba(255,255,255,0.62)' : Colors.ink3;

  if (variant === 'wordmark') {
    return <Wordmark color={markColor} dotColor={dotColor} size={size} style={style as StyleProp<TextStyle>} />;
  }

  if (variant === 'symbol') {
    return <Symbol color={markColor} size={size} style={style as StyleProp<ViewStyle>} />;
  }

  return (
    <View className="flex-row items-center" style={[{ gap: 10 }, style as StyleProp<ViewStyle>]}>
      <Symbol color={markColor} size={size} />
      <Wordmark color={markColor} dotColor={dotColor} size={Math.round(size * 0.88)} />
    </View>
  );
}

function Symbol({ color, size, style }: { color: string; size: number; style?: StyleProp<ViewStyle> }) {
  const strokeWidth = size <= 24 ? 5.5 : size <= 40 ? 4.8 : 4.5;

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
        <Path
          d="M14 62 V30 L36 12 L58 30 V62"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d="M28 62 V44 a8 8 0 0 1 16 0 V62"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={36} cy={40} r={3} fill={color} />
      </Svg>
    </View>
  );
}

function Wordmark({
  color,
  dotColor,
  size,
  style,
}: {
  color: string;
  dotColor: string;
  size: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        {
          color,
          fontFamily: Fonts.serif,
          fontSize: size,
          lineHeight: Math.round(size * 1.08),
        },
        style,
      ]}
    >
      RentyBase
      <Text style={{ color: dotColor, fontFamily: Fonts.serifItalic }}>.</Text>
    </Text>
  );
}
