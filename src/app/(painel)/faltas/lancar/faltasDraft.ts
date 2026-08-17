// src/app/(painel)/faltas/lancar/faltasDraft.ts
// Cópia de segurança (rascunho) em localStorage do lançamento de faltas em
// massa em andamento, para permitir retomar o envio após uma falha parcial.
// Isolado do fluxo de cadastro de estudantes para evitar acoplamento entre
// os dois fluxos.

import type { RegistrarFaltasRequest } from '@/types/api';
import type { ContextoModeloFaltas } from './faltasTypes';

const CHAVE_RASCUNHO_FALTAS = 'spuri:lancamento-faltas:rascunho:v1';

export interface RascunhoFaltas {
  criadoEm: string;
  atualizadoEm: string;
  nomeArquivo?: string;
  contexto: ContextoModeloFaltas | null;
  jobIds: string[];
  itensPendentes: RegistrarFaltasRequest[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function chaveFalta(item: RegistrarFaltasRequest): string {
  return JSON.stringify({
    codigo_estudante: (item.codigo_estudante || '').trim().toLowerCase(),
    data: item.data || '',
    materia_disciplinar_id: item.materia_disciplinar_id || '',
    periodo: item.periodo || '',
  });
}

export function lerRascunhoFaltas(): RascunhoFaltas | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CHAVE_RASCUNHO_FALTAS);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RascunhoFaltas;
    if (!Array.isArray(draft.itensPendentes)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function salvarRascunhoFaltas(draft: Omit<RascunhoFaltas, 'criadoEm' | 'atualizadoEm'>): void {
  if (!isBrowser()) return;
  const anterior = lerRascunhoFaltas();
  const agora = new Date().toISOString();
  window.localStorage.setItem(
    CHAVE_RASCUNHO_FALTAS,
    JSON.stringify({ ...draft, criadoEm: anterior?.criadoEm || agora, atualizadoEm: agora })
  );
}

export function removerRascunhoFaltas(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CHAVE_RASCUNHO_FALTAS);
}

/**
 * Remove do rascunho as faltas já lançadas com sucesso (identificadas por
 * estudante + data + matéria + período), mantendo apenas as pendentes.
 */
export function removerItensConcluidosFaltas(itensConcluidos: unknown[]): RascunhoFaltas | null {
  const draft = lerRascunhoFaltas();
  if (!draft) return null;
  const concluidos = new Set(
    itensConcluidos
      .filter((item): item is RegistrarFaltasRequest => !!item && typeof item === 'object')
      .map((item) => chaveFalta(item))
  );
  if (concluidos.size === 0) return draft;
  const itensPendentes = draft.itensPendentes.filter((item) => !concluidos.has(chaveFalta(item)));
  if (itensPendentes.length === 0) {
    removerRascunhoFaltas();
    return null;
  }
  salvarRascunhoFaltas({
    contexto: draft.contexto,
    nomeArquivo: draft.nomeArquivo,
    jobIds: draft.jobIds,
    itensPendentes,
  });
  return lerRascunhoFaltas();
}
