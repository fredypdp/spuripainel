// src/app/(painel)/notas/lancar/notasDraft.ts
// Cópia de segurança (rascunho) em localStorage do lançamento de notas em
// massa em andamento, para permitir retomar o envio após uma falha parcial.
// Isolado do fluxo de cadastro de estudantes para evitar acoplamento entre
// os dois fluxos.

import type { RegistrarNotasRequest } from '@/types/api';
import type { ContextoModeloNotas } from './notasTypes';

const CHAVE_RASCUNHO_NOTAS = 'spuri:lancamento-notas:rascunho:v1';

export interface RascunhoNotas {
  criadoEm: string;
  atualizadoEm: string;
  nomeArquivo?: string;
  contexto: ContextoModeloNotas | null;
  jobIds: string[];
  itensPendentes: RegistrarNotasRequest[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function chaveNota(item: RegistrarNotasRequest): string {
  return JSON.stringify({
    codigo_estudante: (item.codigo_estudante || '').trim().toLowerCase(),
    periodo: item.periodo || '',
    materia_disciplinar_id: item.materia_disciplinar_id || '',
    categoria: item.categoria || '',
  });
}

export function lerRascunhoNotas(): RascunhoNotas | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CHAVE_RASCUNHO_NOTAS);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RascunhoNotas;
    if (!Array.isArray(draft.itensPendentes)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function salvarRascunhoNotas(draft: Omit<RascunhoNotas, 'criadoEm' | 'atualizadoEm'>): void {
  if (!isBrowser()) return;
  const anterior = lerRascunhoNotas();
  const agora = new Date().toISOString();
  window.localStorage.setItem(
    CHAVE_RASCUNHO_NOTAS,
    JSON.stringify({ ...draft, criadoEm: anterior?.criadoEm || agora, atualizadoEm: agora })
  );
}

export function removerRascunhoNotas(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CHAVE_RASCUNHO_NOTAS);
}

/**
 * Remove do rascunho as notas já lançadas com sucesso (identificadas por
 * estudante + período + matéria + categoria), mantendo apenas as pendentes.
 */
export function removerItensConcluidosNotas(itensConcluidos: unknown[]): RascunhoNotas | null {
  const draft = lerRascunhoNotas();
  if (!draft) return null;
  const concluidos = new Set(
    itensConcluidos
      .filter((item): item is RegistrarNotasRequest => !!item && typeof item === 'object')
      .map((item) => chaveNota(item))
  );
  if (concluidos.size === 0) return draft;
  const itensPendentes = draft.itensPendentes.filter((item) => !concluidos.has(chaveNota(item)));
  if (itensPendentes.length === 0) {
    removerRascunhoNotas();
    return null;
  }
  salvarRascunhoNotas({
    contexto: draft.contexto,
    nomeArquivo: draft.nomeArquivo,
    jobIds: draft.jobIds,
    itensPendentes,
  });
  return lerRascunhoNotas();
}
