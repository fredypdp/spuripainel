// src/app/(painel)/estudantes/cadastrar/massaApi.ts
import { api, tokenStorage } from '@/lib/api';
import type { AsyncBatchResponse } from '@/lib/api';
import type { CriarEstudanteRequest } from '@/types/api';

/**
 * Envia o cadastro em massa de estudantes no modo "sem arquivo"
 * (`com_arquivo: false`), conforme documentado para
 * `POST /academia/estudante/register/async`.
 *
 * Os estudantes criados por este caminho ficam com
 * `status = "pendente_documentos"` até que os documentos de cada um sejam
 * anexados individualmente na ficha do estudante.
 */
export function registrarEstudantesBatchSemArquivo(
  estudantes: CriarEstudanteRequest[],
  token?: string
): Promise<AsyncBatchResponse> {
  return api.post<AsyncBatchResponse>(
    '/academia/estudante/register/async',
    { com_arquivo: false, estudantes },
    { token: token || tokenStorage.get() || undefined }
  );
}
