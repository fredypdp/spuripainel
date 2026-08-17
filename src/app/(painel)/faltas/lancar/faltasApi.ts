import { academiaService } from '@/lib/api';
import type { AsyncBatchResponse } from '@/lib/api';
import type { RegistrarFaltasRequest } from '@/types/api';
export function registrarFaltasBatch(faltas: RegistrarFaltasRequest[], token?: string): Promise<AsyncBatchResponse> { return academiaService.registrarFaltasBatchAsync(faltas, token); }
