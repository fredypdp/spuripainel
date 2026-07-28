// src/app/(painel)/estudantes/cadastrar/massaHelpers.ts
// Helpers e constantes partilhadas pelo fluxo de cadastro em massa de estudantes.
// Mantido isolado do fluxo de cadastro singular para evitar acoplamento entre os dois.

export type NivelBulk = 'fundamental' | 'medio' | 'superior';

/**
 * Limite máximo de estudantes por envio, alinhado ao limite documentado da API
 * para `POST /academia/estudante/register/async` no modo `com_arquivo: false`.
 */
export const LIMITE_ESTUDANTES_POR_LOTE = 100;

export const ANOS_FUNDAMENTAL_LIST = [
  { label: '1º Ano Fundamental', value: '1_ano_fundamental' },
  { label: '2º Ano Fundamental', value: '2_ano_fundamental' },
  { label: '3º Ano Fundamental', value: '3_ano_fundamental' },
  { label: '4º Ano Fundamental', value: '4_ano_fundamental' },
  { label: '5º Ano Fundamental', value: '5_ano_fundamental' },
  { label: '6º Ano Fundamental', value: '6_ano_fundamental' },
  { label: '7º Ano Fundamental', value: '7_ano_fundamental' },
  { label: '8º Ano Fundamental', value: '8_ano_fundamental' },
  { label: '9º Ano Fundamental', value: '9_ano_fundamental' },
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
  const nivel = match[2] === 'medio' ? 'Médio' : match[2] === 'superior' ? 'Superior' : 'Fundamental';
  return `${match[1]}º Ano ${nivel}`;
}

export function labelNivel(nivel: NivelBulk): string {
  if (nivel === 'medio') return 'Ensino Médio';
  if (nivel === 'superior') return 'Ensino Superior';
  return 'Ensino Fundamental';
}
