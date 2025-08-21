import { useState, useCallback } from 'react';

export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>
): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction(...args);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Async operation failed:', err);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

// Custom hook for deployment operations
export function useDeployments() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDeployment = useCallback((deploymentId: string, updates: Partial<any>) => {
    setDeployments(prev => 
      prev.map(dep => 
        dep.deploymentId === deploymentId 
          ? { ...dep, ...updates } 
          : dep
      )
    );
  }, []);

  const removeDeployment = useCallback((deploymentId: string) => {
    setDeployments(prev => 
      prev.filter(dep => dep.deploymentId !== deploymentId)
    );
  }, []);

  const addDeployment = useCallback((deployment: any) => {
    setDeployments(prev => [deployment, ...prev]);
  }, []);

  return {
    deployments,
    setDeployments,
    loading,
    setLoading,
    error,
    setError,
    updateDeployment,
    removeDeployment,
    addDeployment,
  };
}

// Loading states enum
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

// Toast notification hook
export function useToast() {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
  }>>([]);

  const addToast = useCallback((
    type: 'success' | 'error' | 'info' | 'warning',
    message: string,
    duration = 5000
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => 
    addToast('success', message, duration), [addToast]);
  
  const error = useCallback((message: string, duration?: number) => 
    addToast('error', message, duration), [addToast]);
  
  const info = useCallback((message: string, duration?: number) => 
    addToast('info', message, duration), [addToast]);
  
  const warning = useCallback((message: string, duration?: number) => 
    addToast('warning', message, duration), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}
