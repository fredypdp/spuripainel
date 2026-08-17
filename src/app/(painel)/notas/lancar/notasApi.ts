import { academiaService } from '@/lib/api';
import type { AsyncBatchResponse } from '@/lib/api';
import type { RegistrarNotasRequest } from '@/types/api';
export function registrarNotasBatch(notas: RegistrarNotasRequest[], token?: string): Promise<AsyncBatchResponse> { return academiaService.registrarNotaBatchAsync(notas, token); }
