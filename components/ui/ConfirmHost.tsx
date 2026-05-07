import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { useUIStore } from '../../stores/uiStore';
import { Colors, Fonts } from '../../constants/theme';

export function ConfirmHost() {
  const { confirmOptions, closeConfirm, showToast } = useUIStore();
  const [working, setWorking] = useState(false);

  const handleClose = () => {
    if (working) return;
    confirmOptions?.onCancel?.();
    closeConfirm();
  };

  const handleConfirm = async () => {
    if (!confirmOptions) return;
    setWorking(true);
    try {
      await confirmOptions.onConfirm();
      closeConfirm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed. Please try again.', 'error');
      closeConfirm();
    } finally {
      setWorking(false);
    }
  };

  return (
    <BottomSheet visible={!!confirmOptions} onClose={handleClose}>
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20, marginBottom: 8 }}>
        {confirmOptions?.title}
      </Text>
      <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21, marginBottom: 18 }}>
        {confirmOptions?.message}
      </Text>
      <View className="gap-3">
        <Button
          title={confirmOptions?.confirmText ?? 'Confirm'}
          variant={confirmOptions?.destructive ? 'danger' : 'primary'}
          onPress={handleConfirm}
          loading={working}
          fullWidth
          size="lg"
        />
        <Button
          title={confirmOptions?.cancelText ?? 'Cancel'}
          variant="secondary"
          onPress={handleClose}
          disabled={working}
          fullWidth
        />
      </View>
    </BottomSheet>
  );
}
