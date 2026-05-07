import React, { useEffect } from 'react';
import {
  Modal,
  View,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, Shadow } from '../../constants/theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  scrollable?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  maxHeight = '86%',
  scrollable = false,
}) => {
  const translateY = useSharedValue(500);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 180 });
      translateY.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.8 });
    } else {
      opacity.value = withTiming(0, { duration: 140 });
      translateY.value = withTiming(500, { duration: 200 });
    }
  }, [visible, opacity, translateY]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[overlayStyle, { flex: 1, backgroundColor: 'rgba(8,9,10,0.45)' }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            sheetStyle,
            Shadow.modal,
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: maxHeight as `${number}%`,
              backgroundColor: Colors.surface,
              borderTopLeftRadius: Radius.xxl,
              borderTopRightRadius: Radius.xxl,
              overflow: 'hidden',
            },
          ]}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: Colors.fill2,
              }}
            />
          </View>

          {scrollable ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: 20, paddingBottom: 36 }}>
              {children}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
