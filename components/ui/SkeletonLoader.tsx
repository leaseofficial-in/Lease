import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Colors, Radius } from '../../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 14,
  borderRadius = Radius.sm,
}) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        { width: width as number, height, borderRadius, backgroundColor: Colors.fill2 },
      ]}
    />
  );
};

export const RentalCardSkeleton: React.FC = () => (
  <View
    style={{
      backgroundColor: Colors.surface,
      borderRadius: Radius.xl,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 }}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, gap: 7 }}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="38%" height={11} />
      </View>
      <Skeleton width={64} height={24} borderRadius={12} />
    </View>
    <View style={{ height: 1, backgroundColor: Colors.border, marginBottom: 14 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Skeleton width="28%" height={12} />
      <Skeleton width="22%" height={12} />
      <Skeleton width="18%" height={12} />
    </View>
  </View>
);

export const PaymentRowSkeleton: React.FC = () => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      gap: 12,
    }}
  >
    <Skeleton width={40} height={40} borderRadius={20} />
    <View style={{ flex: 1, gap: 7 }}>
      <Skeleton width="48%" height={13} />
      <Skeleton width="32%" height={11} />
    </View>
    <Skeleton width={72} height={13} />
  </View>
);
