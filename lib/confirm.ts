import { useUIStore } from '../stores/uiStore';

export const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText = 'Confirm',
  destructive = false,
  onCancel?: () => void,
) => {
  useUIStore.getState().openConfirm({
    title,
    message,
    confirmText,
    destructive,
    onConfirm,
    onCancel,
  });
};
