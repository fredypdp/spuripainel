// src/hooks/useApi.ts

import { useState, useCallback } from 'react';
import { ApiError } from '@/lib/api/client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook para gerenciar requisições à API
 * 
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useApi(academiaService.login);
 * 
 * const handleLogin = async () => {
 *   const result = await execute({ usuario: 'ABC123', senha: '123', type: 'academia' });
 *   if (result) {
 *     console.log('Login bem-sucedido', result);
 *   }
 * };
 * ```
 */
export function useApi<T, Args extends any[]>(
  apiFunction: (...args: Args) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        let errorMessage = 'Ocorreu um erro desconhecido';

        if (err instanceof ApiError) {
          errorMessage = err.data?.message || err.data?.error || err.statusText;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        setState({ data: null, loading: false, error: errorMessage });
        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook para fazer uma requisição automaticamente ao montar o componente
 * 
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useApiQuery(() => 
 *   consultasService.notasEstudante('THT6782')
 * );
 * ```
 */
export function useApiQuery<T>(
  apiFunction: () => Promise<T>,
  options?: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
): UseApiReturn<T> & { refetch: () => Promise<void> } {
  const { data, loading, error, execute, reset } = useApi(apiFunction);
  const [hasExecuted, setHasExecuted] = useState(false);

  const refetch = useCallback(async () => {
    const result = await execute();
    if (result && options?.onSuccess) {
      options.onSuccess(result);
    }
    if (error && options?.onError) {
      options.onError(error);
    }
  }, [execute, error, options]);

  // Auto-execute on mount
  useState(() => {
    const enabled = options?.enabled ?? true;
    if (enabled && !hasExecuted) {
      setHasExecuted(true);
      refetch();
    }
  });

  return {
    data,
    loading,
    error,
    execute,
    reset,
    refetch,
  };
}