'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useToast as useToastHook } from '@/lib/hooks';
import { ToastContainer } from '@/components/Toast';

interface ToastContextType {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toastHook = useToastHook();

  // Memoize toast functions to prevent infinite re-renders
  const toastFunctions = {
    success: useCallback((message: string, duration?: number) => {
      toastHook.success(message, duration);
    }, [toastHook.success]),
    error: useCallback((message: string, duration?: number) => {
      toastHook.error(message, duration);
    }, [toastHook.error]),
    info: useCallback((message: string, duration?: number) => {
      toastHook.info(message, duration);
    }, [toastHook.info]),
    warning: useCallback((message: string, duration?: number) => {
      toastHook.warning(message, duration);
    }, [toastHook.warning]),
  };

  return (
    <ToastContext.Provider value={toastFunctions}>
      {children}
      <ToastContainer toasts={toastHook.toasts} onClose={toastHook.removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
