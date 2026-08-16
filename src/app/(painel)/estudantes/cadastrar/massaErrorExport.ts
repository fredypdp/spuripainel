// src/app/(painel)/estudantes/cadastrar/massaErrorExport.ts
// Geração de planilhas Excel contendo apenas as linhas/estudantes com erro,
// para que o utilizador possa corrigir e reenviar rapidamente.

import * as XLSX from 'xlsx';
import { formatDataNascimento } from '@/types/api';
import type { ContextoModelo, EstudanteBulkRow, ErroValidacao } from './massaTypes';

const CABECALHO_BASE = [
  'Nome Completo',
  'Género (masculino ou feminino)',
  'Data de Nascimento (DD/MM/AAAA)',
  'BI do Estudante',
  'BI do Encarregado',
  'Telefone do Estudante',
  'Telefone do Encarregado',
  'Email (opcional)',
];

function montarMetaLinhas(contexto: ContextoModelo) {
  return [
    ['chave', 'valor'],
    ['versao_modelo', contexto.versaoModelo || '1'],
    ['codigo_academia', contexto.codigoAcademia || ''],
    ['nome_academia', contexto.nomeAcademia || ''],
    ['nivel', contexto.nivel || ''],
    ['curso_id', contexto.cursoId || ''],
    ['curso_nome', contexto.cursoNome || ''],
    ['ano_academico', contexto.anoAcademico || ''],
    ['ano_academico_label', contexto.anoAcademicoLabel || ''],
    ['codigo_turma', contexto.codigoTurma || ''],
    ['turma_label', contexto.turmaLabel || ''],
    ['modo_cadastro', contexto.modoCadastro || 'geral'],
    ['gerado_em', new Date().toISOString()],
  ];
}

function escreverPlanilhaComErros(nomeArquivo: string, contexto: ContextoModelo | null, linhas: (string | number)[][]) {
  const wb = XLSX.utils.book_new();

  const dados = [[...CABECALHO_BASE, 'Erro(s) encontrados'], ...linhas];
  const ws: any = XLSX.utils.aoa_to_sheet(dados);
  ws['!cols'] = [
    { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 24 }, { wch: 28 }, { wch: 60 },
  ];
  // Mantém o nome "Estudantes" para que este ficheiro possa ser corrigido e
  // reenviado diretamente, sem precisar de descarregar um novo modelo — a
  // coluna extra de erro é simplesmente ignorada na leitura.
  XLSX.utils.book_append_sheet(wb, ws, 'Estudantes');

  if (contexto) {
    const wsMeta = XLSX.utils.aoa_to_sheet(montarMetaLinhas(contexto));
    XLSX.utils.book_append_sheet(wb, wsMeta, '_meta');
    const idx = wb.SheetNames.indexOf('_meta');
    (wb as any).Workbook = {
      Sheets: wb.SheetNames.map((_: string, i: number) => (i === idx ? { Hidden: 1 } : {})),
    };
  }

  XLSX.writeFile(wb, nomeArquivo);
}

/**
 * Descarrega um Excel apenas com as linhas que falharam na validação
 * client-side (antes de qualquer envio ao servidor).
 */
export function baixarLinhasComErro(
  contexto: ContextoModelo,
  linhas: EstudanteBulkRow[],
  erros: ErroValidacao[],
  nomeArquivoOriginal: string
) {
  const errosPorLinha = new Map<number, string[]>();
  erros.forEach((e) => {
    if (!errosPorLinha.has(e.linha)) errosPorLinha.set(e.linha, []);
    errosPorLinha.get(e.linha)!.push(`${e.campo}: ${e.mensagem}`);
  });

  const linhasComErro = linhas.filter((l) => errosPorLinha.has(l.linha));
  if (linhasComErro.length === 0) return;

  const dados = linhasComErro.map((l) => [
    l.nome,
    l.genero,
    l.dataNascimento,
    l.bilheteIdentidade,
    l.bilheteIdentidadeEncarregado,
    l.telefone,
    l.telefoneEncarregado,
    l.email,
    (errosPorLinha.get(l.linha) || []).join(' | '),
  ]);

  const nomeBase = nomeArquivoOriginal.replace(/\.xlsx$/i, '');
  escreverPlanilhaComErros(`erros-${nomeBase}.xlsx`, contexto, dados);
}

interface ResultadoFalhaJob {
  payload: any;
  erro?: string;
}

/**
 * Descarrega um Excel apenas com os estudantes que falharam no cadastro em
 * massa já submetido ao servidor, incluindo o motivo de cada falha.
 */
export function baixarEstudantesComFalha(contexto: ContextoModelo | null, resultados: ResultadoFalhaJob[], nomeBase: string) {
  if (resultados.length === 0) return;

  const dados = resultados.map(({ payload, erro }) => {
    const p = payload || {};
    const dataBr = p.data_nascimento ? formatDataNascimento(p.data_nascimento) : '';
    return [
      p.nome || '',
      p.genero || '',
      dataBr,
      p.bilhete_identidade || '',
      p.bilhete_identidade_encarregado || '',
      p.telefone || '',
      p.telefone_encarregado || '',
      p.email || '',
      erro || 'Não foi possível identificar o motivo da falha.',
    ];
  });

  escreverPlanilhaComErros(`falhas-${nomeBase}.xlsx`, contexto, dados);
}


export function baixarRascunhoEstudantesPendentes(contexto: ContextoModelo | null, estudantes: any[], nomeBase: string) {
  const resultados = estudantes.map((payload) => ({
    payload,
    erro: 'Ainda não foi cadastrado. Use esta cópia para corrigir e tentar novamente.',
  }));
  baixarEstudantesComFalha(contexto, resultados, `rascunho-${nomeBase}`);
}
