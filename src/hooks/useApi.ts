// src/hooks/useApi.ts

import { useState, useCallback, useEffect } from 'react';
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
 * ✅ Simplesmente usa error.message - a extração já foi feita na API
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
        // ✅ SIMPLIFICADO: error.message já contém a melhor mensagem disponível
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido';
        
        setState({ data: null, loading: false, error: errorMessage });
        throw err;
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
 *   consultasService.notasEstudante('THT6782'),
 *   { enabled: !!tokenStorage.get() }
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
  
  // Estabilizar refetch para evitar loops infinitos
  const refetch = useCallback(async () => {
    try {
      const result = await execute();
      if (result && options?.onSuccess) {
        options.onSuccess(result);
      }
    } catch (err) {
      // Error já foi tratado no execute
    }
  }, [execute, options?.onSuccess]);

  // Auto-execute on mount if enabled (apenas uma vez)
  useEffect(() => {
    const enabled = options?.enabled ?? true;
    if (enabled) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.enabled]); // Apenas re-executa se 'enabled' mudar

  return {
    data,
    loading,
    error,
    execute,
    reset,
    refetch,
  };
}