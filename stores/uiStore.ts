import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface UIState {
  toasts: Toast[];
  isBottomSheetOpen: boolean;
  bottomSheetContent: React.ReactNode | null;
  confirmOptions: ConfirmOptions | null;

  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  dismissToast: (id: string) => void;
  openBottomSheet: (content: React.ReactNode) => void;
  closeBottomSheet: () => void;
  openConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
}

// React import for typing only — store itself is UI-agnostic
import type React from 'react';

const TOAST_DURATION: Record<Toast['type'], number> = {
  error: 5000,
  success: 3000,
  info: 3500,
};

const MAX_TOASTS = 3;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  isBottomSheetOpen: false,
  bottomSheetContent: null,
  confirmOptions: null,

  showToast: (message, type = 'info', duration) => {
    const id = `${Date.now()}-${Math.random()}`;
    const ms = duration ?? TOAST_DURATION[type];
    // Evict oldest if already at cap
    set((state) => ({
      toasts: [...state.toasts.slice(-(MAX_TOASTS - 1)), { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, ms);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  openBottomSheet: (content) =>
    set({ isBottomSheetOpen: true, bottomSheetContent: content }),

  closeBottomSheet: () =>
    set({ isBottomSheetOpen: false, bottomSheetContent: null }),

  openConfirm: (options) =>
    set({ confirmOptions: options }),

  closeConfirm: () =>
    set({ confirmOptions: null }),
}));
