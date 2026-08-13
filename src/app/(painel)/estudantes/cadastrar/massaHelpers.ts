// src/app/(painel)/estudantes/cadastrar/massaHelpers.ts
// Helpers e constantes partilhadas pelo fluxo de cadastro em massa de estudantes.
// Mantido isolado do fluxo de cadastro singular para evitar acoplamento entre os dois.

export type NivelBulk = 'fundamental' | 'medio' | 'superior';

/**
 * Tamanho máximo de cada lote enviado à API, alinhado ao limite documentado
 * para `POST /academia/estudante/register/async` no modo `com_arquivo: false`.
 *
 * Este valor NÃO limita o modelo de Excel nem a validação — o utilizador pode
 * preencher quantos estudantes precisar. Se o total ultrapassar este limite,
 * o envio é dividido automaticamente em vários lotes (ver `dividirEmLotes`).
 */
export const LIMITE_ESTUDANTES_POR_LOTE = 100;

/**
 * Número de linhas em branco pré-formatadas no modelo de Excel descarregado.
 * É apenas uma folga confortável para preencher um número grande de
 * estudantes num único ficheiro — não é um limite de cadastro.
 */
export const LINHAS_MODELO_EXCEL = 1000;

export const ANOS_FUNDAMENTAL_LIST = [
  { label: '1ª Classe', value: '1_ano_fundamental' },
  { label: '2ª Classe', value: '2_ano_fundamental' },
  { label: '3ª Classe', value: '3_ano_fundamental' },
  { label: '4ª Classe', value: '4_ano_fundamental' },
  { label: '5ª Classe', value: '5_ano_fundamental' },
  { label: '6ª Classe', value: '6_ano_fundamental' },
  { label: '7ª Classe', value: '7_ano_fundamental' },
  { label: '8ª Classe', value: '8_ano_fundamental' },
  { label: '9ª Classe', value: '9_ano_fundamental' },
];

export function isAnoFundamental(v?: string | null): boolean {
  return !!v && /^\d+_ano_fundamental$/.test(v);
}

export function isAnoMedioValue(v?: string | null): boolean {
  return !!v && /^\d+_ano_medio$/.test(v);
}

export function isAnoSuperiorValue(v?: string | null): boolean {
  return !!v && /^\d+_ano_superior$/.test(v);
}

export function anoOrder(value: string): number {
  const match = value.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  const nivel = match?.[2] === 'fundamental' ? 0 : match?.[2] === 'medio' ? 1 : 2;
  return nivel * 100 + Number(match?.[1] ?? 0);
}

export function getAnoLabel(value?: string | null): string {
  if (!value) return '-';
  const match = value.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return value.replace(/_/g, ' ');
  if (match[2] === 'fundamental') return `${match[1]}ª Classe`;
  const nivel = match[2] === 'medio' ? 'Médio' : 'Superior';
  return `${match[1]}º Ano ${nivel}`;
}

export function labelNivel(nivel: NivelBulk): string {
  if (nivel === 'medio') return 'Ensino Médio';
  if (nivel === 'superior') return 'Ensino Superior';
  return 'Ensino Fundamental (1ª-9ª Classe)';
}

/**
 * Divide um array em sub-arrays (lotes) de tamanho máximo `tamanho`.
 * Usado para respeitar o limite de itens por requisição da API, mantendo o
 * modelo de Excel e a validação livres de qualquer limite artificial.
 */
export function dividirEmLotes<T>(items: T[], tamanho: number): T[][] {
  if (tamanho <= 0) return [items];
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamanho) {
    lotes.push(items.slice(i, i + tamanho));
  }
  return lotes;
}
