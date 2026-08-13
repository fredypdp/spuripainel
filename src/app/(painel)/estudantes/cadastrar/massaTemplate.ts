// src/app/(painel)/estudantes/cadastrar/massaTemplate.ts
// Geração do modelo de Excel (.xlsx) para cadastro em massa de estudantes.
//
// O modelo tem 3 folhas:
// - "Instruções": texto de apoio, apenas leitura.
// - "Estudantes": folha a preencher pelo utilizador (única folha lida na importação).
// - "_meta": folha OCULTA com o identificador do modelo (academia, nível, curso,
//   ano acadêmico). Graças a este identificador, o utilizador nunca precisa de
//   preencher curso ou ano acadêmico na planilha — o código já sabe, a partir
//   do modelo descarregado.
//
// O número de linhas do modelo (LINHAS_MODELO_EXCEL) é apenas uma folga
// confortável para preencher — não está ligado ao limite de itens por
// requisição da API (LIMITE_ESTUDANTES_POR_LOTE), que é tratado depois, no
// envio, dividindo os estudantes em vários lotes quando necessário.

import * as XLSX from 'xlsx';
import type { ContextoModelo } from './massaTypes';
import { labelNivel, LINHAS_MODELO_EXCEL } from './massaHelpers';

export const COLUNAS_MODELO_MASSA = [
  'Nome Completo',
  'Género (masculino ou feminino)',
  'Data de Nascimento (DD/MM/AAAA)',
  'BI do Estudante',
  'BI do Encarregado',
  'Telefone do Estudante',
  'Telefone do Encarregado',
  'Email (opcional)',
];

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function gerarNomeArquivoModelo(contexto: ContextoModelo): string {
  const partes = ['modelo-cadastro-estudantes', contexto.nivel];
  if (contexto.cursoNome) partes.push(slugify(contexto.cursoNome));
  partes.push(contexto.anoAcademico);
  return `${partes.join('-')}.xlsx`;
}

function montarLinhasInstrucoes(contexto: ContextoModelo): (string | undefined)[][] {
  const linhas: (string | undefined)[][] = [
    ['Modelo de Cadastro em Massa de Estudantes — Spuri'],
    [],
    ['Academia', contexto.nomeAcademia],
    ['Nível', labelNivel(contexto.nivel)],
  ];

  if (contexto.cursoNome) linhas.push(['Curso', contexto.cursoNome]);
  linhas.push(['Ano Acadêmico', contexto.anoAcademicoLabel]);
  linhas.push(['Gerado em', new Date().toLocaleString('pt-PT')]);
  linhas.push([]);
  linhas.push(['Instruções']);
  linhas.push(['1. Preencha os dados na folha "Estudantes", a partir da linha 2.']);
  linhas.push(['2. Não altere os cabeçalhos, nem o nome ou a ordem das folhas.']);
  linhas.push(['3. Não é preciso indicar curso ou ano acadêmico: este modelo já está definido para o contexto acima.']);
  linhas.push([
    '4. Pode preencher quantos estudantes precisar neste ficheiro. Se houver mais de 100 estudantes, o sistema envia automaticamente em grupos de até 100; não precisa separar o ficheiro.',
  ]);
  linhas.push(['5. A Data de Nascimento deve ser escrita como texto no formato DD/MM/AAAA. Exemplo: 15/05/2010.']);
  linhas.push(['6. O Género deve ser escrito exatamente como "masculino" ou "feminino".']);
  linhas.push(['7. Os telefones devem ter exatamente 9 dígitos, sem +244, espaços ou traços. Exemplo: 923456789.']);
  linhas.push(['8. O Bilhete de Identidade segue o formato 123456789LA041 (9 números, 2 letras, 3 números).']);
  linhas.push([
    '9. Os documentos (BI, cédula, certificados) e a atribuição de turma são feitos depois, individualmente, na ficha de cada estudante.',
  ]);

  if (contexto.anoAcademico === '1_ano_fundamental') {
    linhas.push([
      '10. Para o 1ª Classe, deixe o Bilhete de Identidade do Estudante em branco — este ano usa Cédula, anexada depois.',
    ]);
  }

  return linhas;
}

export function gerarModeloExcel(contexto: ContextoModelo): void {
  const wb = XLSX.utils.book_new();

  // Folha "Instruções"
  const wsInstrucoes = XLSX.utils.aoa_to_sheet(montarLinhasInstrucoes(contexto) as any[][]);
  wsInstrucoes['!cols'] = [{ wch: 34 }, { wch: 64 }];
  XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'Instruções');

  // Folha "Estudantes" — cabeçalho + linhas em branco pré-formatadas como texto
  // (para não perder zeros à esquerda em telefones/BI, nem deixar o Excel
  // converter a data digitada automaticamente para um valor de data nativo).
  // O número de linhas (LINHAS_MODELO_EXCEL) é só uma folga generosa para
  // preencher — o envio à API é dividido em lotes automaticamente depois.
  const wsDados: any = XLSX.utils.aoa_to_sheet([COLUNAS_MODELO_MASSA]);
  wsDados['!cols'] = [
    { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 24 }, { wch: 28 },
  ];

  for (let c = 0; c < COLUNAS_MODELO_MASSA.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    wsDados[addr] = {
      ...(wsDados[addr] || { t: 's', v: COLUNAS_MODELO_MASSA[c] }),
      s: {
        fill: { patternType: 'solid', fgColor: { rgb: 'ABDBE3' } },
        font: { bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      },
    };
  }
  wsDados['!rows'] = [{ hpt: 30 }];
  wsDados['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(COLUNAS_MODELO_MASSA.length - 1)}1` };

  for (let r = 1; r <= LINHAS_MODELO_EXCEL; r++) {
    for (let c = 0; c < COLUNAS_MODELO_MASSA.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      wsDados[addr] = { t: 's', v: '', z: '@' };
    }
  }
  wsDados['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: LINHAS_MODELO_EXCEL, c: COLUNAS_MODELO_MASSA.length - 1 },
  });
  XLSX.utils.book_append_sheet(wb, wsDados, 'Estudantes');

  // Folha oculta "_meta" — identificador do modelo
  const linhasMeta = [
    ['chave', 'valor'],
    ['versao_modelo', contexto.versaoModelo],
    ['codigo_academia', contexto.codigoAcademia],
    ['nivel', contexto.nivel],
    ['curso_id', contexto.cursoId || ''],
    ['curso_nome', contexto.cursoNome || ''],
    ['ano_academico', contexto.anoAcademico],
    ['gerado_em', new Date().toISOString()],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(linhasMeta);
  XLSX.utils.book_append_sheet(wb, wsMeta, '_meta');

  const idxMeta = wb.SheetNames.indexOf('_meta');
  (wb as any).Workbook = {
    Sheets: wb.SheetNames.map((_: string, i: number) => (i === idxMeta ? { Hidden: 1 } : {})),
  };

  XLSX.writeFile(wb, gerarNomeArquivoModelo(contexto));
}
