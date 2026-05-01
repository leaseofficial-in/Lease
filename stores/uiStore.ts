import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  toasts: Toast[];
  isBottomSheetOpen: boolean;
  bottomSheetContent: React.ReactNode | null;

  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;
  openBottomSheet: (content: React.ReactNode) => void;
  closeBottomSheet: () => void;
}

// React import for typing only — store itself is UI-agnostic
import type React from 'react';

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  isBottomSheetOpen: false,
  bottomSheetContent: null,

  showToast: (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  openBottomSheet: (content) =>
    set({ isBottomSheetOpen: true, bottomSheetContent: content }),

  closeBottomSheet: () =>
    set({ isBottomSheetOpen: false, bottomSheetContent: null }),
}));
