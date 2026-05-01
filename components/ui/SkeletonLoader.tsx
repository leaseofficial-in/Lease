import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  className,
}) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.9]),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        { width: width as number, height, borderRadius, backgroundColor: '#E8E8E8' },
      ]}
      className={className}
    />
  );
};

export const RentalCardSkeleton: React.FC = () => (
  <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 3 }}>
    <View className="flex-row items-center mb-3">
      <Skeleton width={44} height={44} borderRadius={22} />
      <View className="ml-3 flex-1">
        <Skeleton width="60%" height={14} />
        <View className="mt-1.5">
          <Skeleton width="40%" height={11} />
        </View>
      </View>
      <Skeleton width={60} height={22} borderRadius={11} />
    </View>
    <View className="h-px bg-border mb-3" />
    <View className="flex-row justify-between">
      <Skeleton width="30%" height={12} />
      <Skeleton width="25%" height={12} />
      <Skeleton width="20%" height={12} />
    </View>
  </View>
);

export const PaymentRowSkeleton: React.FC = () => (
  <View className="flex-row items-center py-3 border-b border-border">
    <Skeleton width={40} height={40} borderRadius={20} />
    <View className="ml-3 flex-1">
      <Skeleton width="50%" height={13} />
      <View className="mt-1">
        <Skeleton width="35%" height={11} />
      </View>
    </View>
    <Skeleton width={70} height={13} />
  </View>
);
