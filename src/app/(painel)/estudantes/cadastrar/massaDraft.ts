import type { CriarEstudanteRequest } from '@/types/api';
import type { ContextoModelo } from './massaTypes';

const CHAVE_RASCUNHO_MASSA = 'spuri:cadastro-estudantes-massa:rascunho:v1';

export interface RascunhoCadastroMassa {
  criadoEm: string;
  atualizadoEm: string;
  nomeArquivo?: string;
  contexto: ContextoModelo | null;
  jobIds: string[];
  estudantesPendentes: CriarEstudanteRequest[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function chaveEstudante(estudante: CriarEstudanteRequest): string {
  return JSON.stringify({
    nome: estudante.nome?.trim().toLowerCase() || '',
    genero: estudante.genero || '',
    data_nascimento: estudante.data_nascimento || '',
    email: estudante.email?.trim().toLowerCase() || '',
    telefone: estudante.telefone || '',
    telefone_encarregado: estudante.telefone_encarregado || '',
    bilhete_identidade: estudante.bilhete_identidade || '',
    bilhete_identidade_encarregado: estudante.bilhete_identidade_encarregado || '',
    ano_escolar_fundamental: estudante.ano_escolar_fundamental || '',
    ano_escolar_medio: estudante.ano_escolar_medio || '',
    ano_superior: estudante.ano_superior || '',
    curso_medio_id: estudante.curso_medio_id || '',
    curso_superior_id: estudante.curso_superior_id || '',
  });
}

export function lerRascunhoCadastroMassa(): RascunhoCadastroMassa | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CHAVE_RASCUNHO_MASSA);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RascunhoCadastroMassa;
    if (!Array.isArray(draft.estudantesPendentes)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function salvarRascunhoCadastroMassa(draft: Omit<RascunhoCadastroMassa, 'criadoEm' | 'atualizadoEm'>): void {
  if (!isBrowser()) return;
  const anterior = lerRascunhoCadastroMassa();
  const agora = new Date().toISOString();
  window.localStorage.setItem(
    CHAVE_RASCUNHO_MASSA,
    JSON.stringify({ ...draft, criadoEm: anterior?.criadoEm || agora, atualizadoEm: agora })
  );
}

export function removerRascunhoCadastroMassa(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CHAVE_RASCUNHO_MASSA);
}

export function removerEstudantesCadastradosDoRascunho(estudantesCadastrados: unknown[]): RascunhoCadastroMassa | null {
  const draft = lerRascunhoCadastroMassa();
  if (!draft) return null;
  const cadastrados = new Set(
    estudantesCadastrados
      .filter((item): item is CriarEstudanteRequest => !!item && typeof item === 'object')
      .map((item) => chaveEstudante(item))
  );
  if (cadastrados.size === 0) return draft;
  const estudantesPendentes = draft.estudantesPendentes.filter((item) => !cadastrados.has(chaveEstudante(item)));
  if (estudantesPendentes.length === 0) {
    removerRascunhoCadastroMassa();
    return null;
  }
  salvarRascunhoCadastroMassa({
    contexto: draft.contexto,
    nomeArquivo: draft.nomeArquivo,
    jobIds: draft.jobIds,
    estudantesPendentes,
  });
  return lerRascunhoCadastroMassa();
}
