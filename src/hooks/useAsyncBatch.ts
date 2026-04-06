// src/hooks/useAsyncBatch.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import {
  pollJob,
  jobApiService,
  type JobSummary,
  type JobDetail,
  type AsyncBatchResponse,
  type PollOptions,
} from '@/lib/api/job-service';

export type AsyncBatchState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'polling'; jobId: string; summary: JobSummary }
  | { phase: 'done'; detail: JobDetail }
  | { phase: 'error'; message: string };

export interface UseAsyncBatchOptions extends PollOptions {
  /** Se verdadeiro, inicia polling automaticamente após submissão (padrão: true) */
  autoPoll?: boolean;
}

export interface UseAsyncBatchReturn {
  state: AsyncBatchState;
  /** Submete um array de itens para processamento assíncrono */
  submit: <T>(
    submitFn: (items: T[]) => Promise<AsyncBatchResponse>,
    items: T[]
  ) => Promise<JobDetail | null>;
  /** Cancela o polling (o job continua no servidor) */
  cancel: () => void;
  /** Reinicia o estado para idle */
  reset: () => void;
  /** Conveniência: true quando em andamento */
  isLoading: boolean;
  /** Conveniência: progresso 0..100 durante polling */
  progress: number;
}

/**
 * Hook para gerenciar operações batch assíncronas com polling.
 *
 * Fluxo:
 * 1. submit(fn, items) → POST /endpoint/async → recebe job_id → 202 Accepted
 * 2. Polling automático em GET /jobs/:id até status = done | failed
 * 3. State machine: idle → submitting → polling → done | error
 *
 * Nota sobre `JobDetail`: `pollJob` já normaliza a resposta da API
 * (`{ job, results }`) para um `JobDetail` plano com `results` incluído.
 *
 * @example
 * ```tsx
 * const { state, submit, isLoading, progress } = useAsyncBatch({
 *   onProgress: (s) => console.log(`${s.progress}%`),
 * });
 *
 * const handleSubmit = async () => {
 *   const detail = await submit(
 *     (items) => academiaService.registrarNotaBatchAsync(items),
 *     notas
 *   );
 *   if (detail) {
 *     const falhas = detail.results.filter(r => !r.sucesso);
 *     toast.success(`${detail.done_items} notas registradas, ${falhas.length} falhas`);
 *   }
 * };
 * ```
 */
export function useAsyncBatch(options: UseAsyncBatchOptions = {}): UseAsyncBatchReturn {
  const { autoPoll = true, onProgress, onComplete, onError, ...pollOpts } = options;

  const [state, setState] = useState<AsyncBatchState>({ phase: 'idle' });
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setState({ phase: 'idle' });
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState({ phase: 'idle' });
  }, []);

  const submit = useCallback(
    async <T>(
      submitFn: (items: T[]) => Promise<AsyncBatchResponse>,
      items: T[]
    ): Promise<JobDetail | null> => {
      cancelledRef.current = false;
      setState({ phase: 'submitting' });

      let response: AsyncBatchResponse;
      try {
        response = await submitFn(items);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao submeter operação';
        setState({ phase: 'error', message: msg });
        onError?.(err instanceof Error ? err : new Error(msg));
        return null;
      }

      const jobId = response.job_id;

      if (!autoPoll) {
        const summaryPlaceholder: JobSummary = {
          id: jobId,
          type: 'register_estudante_batch',
          status: response.status,
          progress: 0,
          total_items: response.total_items,
          done_items: 0,
          fail_items: 0,
          created_at: new Date().toISOString(),
        };
        setState({ phase: 'polling', jobId, summary: summaryPlaceholder });
        return null;
      }

      // Buscar summary inicial para mostrar progresso imediatamente
      try {
        const initialSummary = await jobApiService.getStatus(jobId);
        if (!cancelledRef.current) {
          setState({ phase: 'polling', jobId, summary: initialSummary });
        }
      } catch {
        // Ignorar erro no poll inicial — o job foi criado com sucesso
        if (!cancelledRef.current) {
          setState({
            phase: 'polling',
            jobId,
            summary: {
              id: jobId,
              type: 'register_estudante_batch',
              status: 'pending',
              progress: 0,
              total_items: response.total_items,
              done_items: 0,
              fail_items: 0,
              created_at: new Date().toISOString(),
            },
          });
        }
      }

      try {
        // pollJob retorna JobDetail já normalizado (com results)
        const detail = await pollJob(jobId, {
          ...pollOpts,
          onProgress: (summary) => {
            if (!cancelledRef.current) {
              setState({ phase: 'polling', jobId, summary });
              onProgress?.(summary);
            }
          },
          onComplete: (d) => {
            if (!cancelledRef.current) {
              setState({ phase: 'done', detail: d });
              onComplete?.(d);
            }
          },
          onError,
        });

        if (cancelledRef.current) return null;
        return detail;
      } catch (err) {
        if (cancelledRef.current) return null;
        const msg = err instanceof Error ? err.message : 'Erro durante processamento';
        setState({ phase: 'error', message: msg });
        onError?.(err instanceof Error ? err : new Error(msg));
        return null;
      }
    },
    [autoPoll, onProgress, onComplete, onError, pollOpts]
  );

  const progress =
    state.phase === 'polling'
      ? state.summary.progress
      : state.phase === 'done'
      ? 100
      : 0;

  const isLoading = state.phase === 'submitting' || state.phase === 'polling';

  return { state, submit, cancel, reset, isLoading, progress };
}
