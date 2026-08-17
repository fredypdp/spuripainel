// src/app/(painel)/faltas/lancar/faltasErrorExport.ts
// Geração de planilhas Excel contendo apenas as linhas/faltas com erro ou que
// falharam no envio, para que a academia possa corrigir e reenviar rapidamente.

import * as XLSX from 'xlsx';
import type { ContextoModeloFaltas, FaltaBulkRow, ErroValidacao } from './faltasTypes';

const CABECALHO_BASE = ['Nome do Estudante', 'Código do Estudante', 'Data da Falta', 'Quantidade'];

function montarMetaLinhas(contexto: ContextoModeloFaltas) {
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
    ['periodo', contexto.periodo || ''],
    ['periodo_label', contexto.periodoLabel || ''],
    ['materia_disciplinar_id', contexto.materiaId || ''],
    ['materia_nome', contexto.materiaNome || ''],
    ['gerado_em', new Date().toISOString()],
  ];
}

function escreverPlanilhaComErros(nomeArquivo: string, contexto: ContextoModeloFaltas | null, linhas: (string | number)[][]) {
  const wb = XLSX.utils.book_new();

  const dados = [[...CABECALHO_BASE, 'Erro(s) encontrados'], ...linhas];
  const ws: any = XLSX.utils.aoa_to_sheet(dados);
  ws['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Faltas');

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
export function baixarLinhasComErroFaltas(
  contexto: ContextoModeloFaltas,
  linhas: FaltaBulkRow[],
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
    l.codigoEstudante,
    l.dataTexto,
    l.quantidadeTexto,
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
 * Descarrega um Excel apenas com as faltas que falharam no lançamento em
 * massa já submetido ao servidor, incluindo o motivo de cada falha.
 * `nomesPorCodigo` é opcional e permite mostrar o nome do estudante (extraído
 * da própria planilha enviada) em vez de apenas o código.
 */
export function baixarFaltasComFalha(
  contexto: ContextoModeloFaltas | null,
  resultados: ResultadoFalhaJob[],
  nomeBase: string,
  nomesPorCodigo: Record<string, string> = {}
) {
  if (resultados.length === 0) return;

  const dados = resultados.map(({ payload, erro }) => {
    const p = payload || {};
    const codigo = p.codigo_estudante || '';
    const nome = nomesPorCodigo[String(codigo).trim().toLowerCase()] || '';
    return [
      nome,
      codigo,
      p.data || '',
      p.quantidade ?? '',
      erro || 'Não foi possível identificar o motivo da falha.',
    ];
  });

  escreverPlanilhaComErros(`falhas-${nomeBase}.xlsx`, contexto, dados);
}

export function baixarRascunhoFaltasPendentes(
  contexto: ContextoModeloFaltas | null,
  itens: any[],
  nomeBase: string,
  nomesPorCodigo: Record<string, string> = {}
) {
  const resultados = itens.map((payload) => ({
    payload,
    erro: 'Ainda não foi lançada. Use esta cópia para corrigir e tentar novamente.',
  }));
  baixarFaltasComFalha(contexto, resultados, `rascunho-${nomeBase}`, nomesPorCodigo);
}
