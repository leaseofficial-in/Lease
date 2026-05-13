import React from 'react';
import { Text, View, TouchableOpacity, type TextProps, type ViewProps, type TouchableOpacityProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, Fonts } from '../../constants/theme';

export function Cap({ children, style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          color: Colors.muted,
          fontFamily: Fonts.mono,
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function DisplayText({ children, italic = false, style, ...props }: TextProps & { italic?: boolean }) {
  return (
    <Text
      {...props}
      style={[
        {
          color: Colors.primary,
          fontFamily: italic ? Fonts.serifItalic : Fonts.serif,
          fontSize: 44,
          letterSpacing: 0,
          lineHeight: 46,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function SerifItalic({ children, style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: Fonts.serifItalic, color: Colors.ink3 }, style]}
    >
      {children}
    </Text>
  );
}

export function InkCard({ children, style, ...props }: ViewProps) {
  return (
    <View
      {...props}
      className="bg-primary overflow-hidden"
      style={[{ borderRadius: 28, padding: 22 }, style]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -90,
          left: -70,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: 'rgba(255,255,255,0.035)',
        }}
      />
      {children}
    </View>
  );
}

type ChipTone = 'default' | 'solid' | 'good' | 'warn' | 'bad' | 'outline';

const chipTone: Record<ChipTone, { bg: string; fg: string; border?: string }> = {
  default: { bg: Colors.fill, fg: Colors.ink2 },
  solid: { bg: Colors.primary, fg: Colors.surface },
  good: { bg: Colors.successSoft, fg: Colors.success },
  warn: { bg: Colors.warningSoft, fg: Colors.warning },
  bad: { bg: Colors.dangerSoft, fg: Colors.danger },
  outline: { bg: 'transparent', fg: Colors.ink2, border: Colors.border },
};

export function Chip({
  children,
  tone = 'default',
  inverse = false,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  inverse?: boolean;
}) {
  const toneStyle = chipTone[tone];
  const surfaceStyle =
    inverse && tone === 'outline'
      ? {
          bg: 'rgba(255,255,255,0.08)',
          fg: Colors.surface,
          border: 'rgba(255,255,255,0.22)',
        }
      : toneStyle;

  return (
    <View
      className="rounded-full flex-row items-center"
      style={{
        alignSelf: 'flex-start',
        backgroundColor: surfaceStyle.bg,
        borderColor: surfaceStyle.border ?? 'transparent',
        borderWidth: surfaceStyle.border ? 1 : 0,
        minHeight: 26,
        paddingHorizontal: 10,
      }}
    >
      <Text style={{ color: surfaceStyle.fg, fontFamily: Fonts.sansMedium, fontSize: 11 }}>
        {children}
      </Text>
    </View>
  );
}

export function CollectionRing({
  value,
  label,
  sublabel,
  inverse = false,
}: {
  value: number;
  label?: string;
  sublabel?: string;
  inverse?: boolean;
}) {
  const size = 82;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(value, 100)) / 100);
  const fg = inverse ? Colors.surface : Colors.primary;
  const bg = inverse ? 'rgba(255,255,255,0.15)' : Colors.borderSoft;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={bg} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fg}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View className="absolute items-center">
        <Text style={{ color: fg, fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>
          {label ?? `${Math.round(value)}%`}
        </Text>
        {sublabel && (
          <Cap style={{ color: inverse ? 'rgba(255,255,255,0.55)' : Colors.muted }}>
            {sublabel}
          </Cap>
        )}
      </View>
    </View>
  );
}

/**
 * Section divider used throughout list screens.
 * Renders a label (left) with an optional action link (right).
 */
export function SectionHeader({
  label,
  action,
  onAction,
  style,
}: {
  label: string;
  action?: string;
  onAction?: () => void;
  style?: ViewProps['style'];
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
        style,
      ]}
    >
      <Cap>{label}</Cap>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
            {action}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * A tappable row inside a Card — icon + label + optional right element.
 * Used for settings rows, info rows, etc.
 */
export function RowItem({
  label,
  sublabel,
  left,
  right,
  onPress,
  last = false,
}: {
  label: string;
  sublabel?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const inner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: Colors.borderSoft,
      }}
    >
      {left && (
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.fill2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {left}
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 14, lineHeight: 19 }} numberOfLines={1}>
          {label}
        </Text>
        {sublabel && (
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
            {sublabel}
          </Text>
        )}
      </View>
      {right && <View style={{ flexShrink: 0 }}>{right}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

export function Sparkline({
  points = [20, 28, 18, 40, 32, 52, 46, 60],
  height = 48,
  color = Colors.primary,
}: {
  points?: number[];
  height?: number;
  color?: string;
}) {
  const width = 200;
  const max = Math.max(...points, 1);
  const step = width / Math.max(points.length - 1, 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - (p / max) * (height - 6) - 3;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Path d={fillPath} fill="rgba(8,9,10,0.06)" />
      <Path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
