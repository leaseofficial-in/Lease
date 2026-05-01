import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '../../stores/uiStore';

const toastStyles = {
  success: 'bg-emerald-600',
  error: 'bg-danger',
  info: 'bg-primary',
} as const;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const { toasts, dismissToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 px-4"
      style={{ top: Math.max(insets.top, 12) + 8, zIndex: 999 }}
    >
      {toasts.map((toast) => (
        <TouchableOpacity
          key={toast.id}
          activeOpacity={0.9}
          onPress={() => dismissToast(toast.id)}
          className={`${toastStyles[toast.type]} rounded-xl px-4 py-3 mb-2`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text className="text-white text-sm font-semibold">{toast.message}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
