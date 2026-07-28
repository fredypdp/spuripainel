// src/app/(painel)/estudantes/cadastrar/massaParser.ts
// Leitura e validação, linha a linha e coluna a coluna, da planilha Excel de
// cadastro em massa. Todas as mensagens de erro são didáticas e indicam
// exatamente a linha, a coluna e a célula onde está o problema.

import * as XLSX from 'xlsx';
import type { ContextoModelo, EstudanteBulkRow, ErroValidacao, ResultadoAnalise } from './massaTypes';
import type { NivelBulk } from './massaHelpers';
import { LIMITE_ESTUDANTES_POR_LOTE } from './massaHelpers';

const REGEX_BI = /^\d{9}[A-Za-z]{2}\d{3}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTAL_COLUNAS = 8;

function celulaTexto(ws: any, r: number, c: number): string {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  if (!cell || cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

function celulaData(ws: any, r: number, c: number): { texto: string; iso?: string; erro?: string } {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
    return { texto: '' };
  }

  // Caso o Excel tenha convertido o valor digitado num "número de data" nativo,
  // convertemos de volta de forma robusta em vez de simplesmente rejeitar.
  if (cell.t === 'n' && typeof cell.v === 'number') {
    const ssf = (XLSX as any).SSF;
    const parsed = ssf && typeof ssf.parse_date_code === 'function' ? ssf.parse_date_code(cell.v) : null;
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const dd = String(parsed.d).padStart(2, '0');
      const mm = String(parsed.m).padStart(2, '0');
      const yyyy = parsed.y;
      return { texto: `${dd}/${mm}/${yyyy}`, iso: `${yyyy}-${mm}-${dd}` };
    }
  }

  const texto = String(cell.v).trim();
  const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return {
      texto,
      erro: `Formato inválido ("${texto}"). Escreva a data como texto no formato DD/MM/AAAA — por exemplo 15/05/2010.`,
    };
  }

  const [, dd, mm, yyyy] = match;
  const diaNum = Number(dd);
  const mesNum = Number(mm);
  if (mesNum < 1 || mesNum > 12 || diaNum < 1 || diaNum > 31) {
    return { texto, erro: `Data inválida ("${texto}"). Confirme o dia e o mês.` };
  }

  return { texto, iso: `${yyyy}-${mm}-${dd}` };
}

function lerContexto(wb: any): ContextoModelo | null {
  const ws = wb.Sheets ? wb.Sheets['_meta'] : undefined;
  if (!ws) return null;

  const linhas = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  const mapa: Record<string, string> = {};
  linhas.slice(1).forEach((linha) => {
    if (linha && linha[0] !== undefined && linha[0] !== '') {
      mapa[String(linha[0])] = linha[1] !== undefined ? String(linha[1]) : '';
    }
  });

  if (!mapa.codigo_academia || !mapa.nivel || !mapa.ano_academico) return null;
  if (!['fundamental', 'medio', 'superior'].includes(mapa.nivel)) return null;

  return {
    codigoAcademia: mapa.codigo_academia,
    nomeAcademia: '',
    nivel: mapa.nivel as NivelBulk,
    cursoId: mapa.curso_id || undefined,
    cursoNome: mapa.curso_nome || undefined,
    anoAcademico: mapa.ano_academico,
    anoAcademicoLabel: mapa.ano_academico,
    versaoModelo: mapa.versao_modelo || '1',
  };
}

function erroGenerico(nomeArquivo: string, mensagem: string): ResultadoAnalise {
  return {
    contexto: null,
    linhas: [],
    erros: [{ linha: 0, coluna: '-', campo: 'Ficheiro', valor: nomeArquivo, mensagem }],
    totalLinhas: 0,
  };
}

function validarLinha(linha: EstudanteBulkRow, contexto: ContextoModelo): ErroValidacao[] {
  const erros: ErroValidacao[] = [];
  const add = (coluna: string, campo: string, valor: string, mensagem: string) => {
    erros.push({ linha: linha.linha, coluna, campo, valor, mensagem });
  };

  if (!linha.nome) {
    add('A', 'Nome Completo', linha.nome, 'O nome completo do estudante é obrigatório.');
  }

  const generoNormalizado = linha.genero.toLowerCase();
  if (!linha.genero) {
    add('B', 'Género', linha.genero, 'Preencha o género com "masculino" ou "feminino".');
  } else if (!['masculino', 'feminino'].includes(generoNormalizado)) {
    add('B', 'Género', linha.genero, `Valor "${linha.genero}" inválido. Escreva exatamente "masculino" ou "feminino".`);
  }

  if (!linha.dataNascimento) {
    add('C', 'Data de Nascimento', linha.dataNascimento, 'A data de nascimento é obrigatória, no formato DD/MM/AAAA.');
  } else if (linha.dataNascimentoErro) {
    add('C', 'Data de Nascimento', linha.dataNascimento, linha.dataNascimentoErro);
  } else if (!linha.dataNascimentoIso) {
    add(
      'C',
      'Data de Nascimento',
      linha.dataNascimento,
      'Formato inválido. Escreva a data como texto no formato DD/MM/AAAA — por exemplo 15/05/2010.'
    );
  } else {
    const data = new Date(`${linha.dataNascimentoIso}T00:00:00`);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (Number.isNaN(data.getTime())) {
      add('C', 'Data de Nascimento', linha.dataNascimento, 'Data inválida. Confirme o dia, o mês e o ano.');
    } else if (data >= hoje) {
      add('C', 'Data de Nascimento', linha.dataNascimento, 'A data de nascimento deve ser anterior à data de hoje.');
    }
  }

  if (linha.email && !REGEX_EMAIL.test(linha.email)) {
    add('D', 'Email', linha.email, `O email "${linha.email}" não é válido. Exemplo: nome@exemplo.com`);
  }

  const isSuperior = contexto.nivel === 'superior';
  const telefoneDigitos = linha.telefone.replace(/\D/g, '');
  const telefoneEncDigitos = linha.telefoneEncarregado.replace(/\D/g, '');

  if (isSuperior && !linha.telefone) {
    add('E', 'Telefone do Estudante', linha.telefone, 'No ensino superior, o telefone do estudante é obrigatório.');
  } else if (linha.telefone && telefoneDigitos.length !== 9) {
    add(
      'E',
      'Telefone do Estudante',
      linha.telefone,
      'O telefone deve ter exatamente 9 dígitos, sem +244, espaços ou traços. Exemplo: 923456789.'
    );
  }

  if (!isSuperior && !linha.telefoneEncarregado) {
    add(
      'F',
      'Telefone do Encarregado de Educação',
      linha.telefoneEncarregado,
      'Para o ensino fundamental/médio, o telefone do encarregado de educação é obrigatório.'
    );
  } else if (linha.telefoneEncarregado && telefoneEncDigitos.length !== 9) {
    add(
      'F',
      'Telefone do Encarregado de Educação',
      linha.telefoneEncarregado,
      'O telefone deve ter exatamente 9 dígitos, sem +244, espaços ou traços. Exemplo: 924000000.'
    );
  }

  if (linha.telefone && linha.telefoneEncarregado && telefoneDigitos && telefoneDigitos === telefoneEncDigitos) {
    add(
      'F',
      'Telefone do Encarregado de Educação',
      linha.telefoneEncarregado,
      'O telefone do encarregado de educação não pode ser igual ao telefone do estudante.'
    );
  }

  const primeiroAnoFundamental = contexto.anoAcademico === '1_ano_fundamental';
  const biEstudante = linha.bilheteIdentidade.toUpperCase();
  const biEncarregado = linha.bilheteIdentidadeEncarregado.toUpperCase();

  if (primeiroAnoFundamental && linha.bilheteIdentidade) {
    add(
      'G',
      'Bilhete de Identidade do Estudante',
      linha.bilheteIdentidade,
      'Para o 1º Ano Fundamental, deixe este campo em branco. Este ano usa Cédula, anexada depois na ficha do estudante.'
    );
  } else if (isSuperior && !linha.bilheteIdentidade) {
    add(
      'G',
      'Bilhete de Identidade do Estudante',
      linha.bilheteIdentidade,
      'No ensino superior, o Bilhete de Identidade do estudante é obrigatório.'
    );
  } else if (linha.bilheteIdentidade && !REGEX_BI.test(biEstudante)) {
    add(
      'G',
      'Bilhete de Identidade do Estudante',
      linha.bilheteIdentidade,
      'Formato inválido. Use o padrão 123456789LA041 (9 números, 2 letras, 3 números).'
    );
  }

  if (!isSuperior && !primeiroAnoFundamental && !linha.bilheteIdentidadeEncarregado) {
    add(
      'H',
      'Bilhete de Identidade do Encarregado de Educação',
      linha.bilheteIdentidadeEncarregado,
      'O Bilhete de Identidade do encarregado de educação é obrigatório para o ensino fundamental/médio.'
    );
  } else if (linha.bilheteIdentidadeEncarregado && !REGEX_BI.test(biEncarregado)) {
    add(
      'H',
      'Bilhete de Identidade do Encarregado de Educação',
      linha.bilheteIdentidadeEncarregado,
      'Formato inválido. Use o padrão 123456789LA041 (9 números, 2 letras, 3 números).'
    );
  }

  if (linha.bilheteIdentidade && linha.bilheteIdentidadeEncarregado && biEstudante === biEncarregado) {
    add(
      'H',
      'Bilhete de Identidade do Encarregado de Educação',
      linha.bilheteIdentidadeEncarregado,
      'O BI do encarregado de educação não pode ser igual ao BI do estudante.'
    );
  }

  return erros;
}

/**
 * Lê e valida um ficheiro Excel de cadastro em massa.
 *
 * @param file Ficheiro .xlsx selecionado pelo utilizador.
 * @param codigoAcademiaAtual Código da academia autenticada — usado para
 *   confirmar que o modelo foi gerado para a academia certa.
 */
export async function analisarPlanilha(file: File, codigoAcademiaAtual?: string): Promise<ResultadoAnalise> {
  let wb: any;
  try {
    const buffer = await file.arrayBuffer();
    wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  } catch {
    return erroGenerico(
      file.name,
      'Não foi possível abrir este ficheiro. Confirme que é um Excel (.xlsx) válido e que não está corrompido.'
    );
  }

  const contexto = lerContexto(wb);
  if (!contexto) {
    return erroGenerico(
      file.name,
      'Este ficheiro não foi reconhecido como um modelo do Spuri (identificador em falta ou inválido). Descarregue novamente o modelo correspondente ao nível/curso/ano pretendido e não altere as folhas nem os cabeçalhos.'
    );
  }

  if (codigoAcademiaAtual && contexto.codigoAcademia !== codigoAcademiaAtual) {
    return erroGenerico(
      file.name,
      'Este modelo foi gerado para outra academia. Descarregue novamente o modelo a partir desta conta antes de preencher os dados.'
    );
  }

  const ws = wb.Sheets ? wb.Sheets['Estudantes'] : undefined;
  if (!ws) {
    return erroGenerico(
      file.name,
      'A folha "Estudantes" não foi encontrada neste ficheiro. Não renomeie nem remova as folhas do modelo.'
    );
  }

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H1');
  const linhas: EstudanteBulkRow[] = [];
  const erros: ErroValidacao[] = [];

  for (let r = 1; r <= range.e.r; r++) {
    const valores = Array.from({ length: TOTAL_COLUNAS }, (_, c) => celulaTexto(ws, r, c));
    const dataCell = celulaData(ws, r, 2);
    const tudoVazio = valores.every((v) => !v) && !dataCell.texto;
    if (tudoVazio) continue;

    const linhaExcel = r + 1;
    const linha: EstudanteBulkRow = {
      linha: linhaExcel,
      nome: valores[0],
      genero: valores[1],
      dataNascimento: dataCell.texto,
      dataNascimentoIso: dataCell.iso,
      dataNascimentoErro: dataCell.erro,
      email: valores[3],
      telefone: valores[4],
      telefoneEncarregado: valores[5],
      bilheteIdentidade: valores[6],
      bilheteIdentidadeEncarregado: valores[7],
    };

    linhas.push(linha);
    erros.push(...validarLinha(linha, contexto));
  }

  if (linhas.length > LIMITE_ESTUDANTES_POR_LOTE) {
    erros.unshift({
      linha: 0,
      coluna: '-',
      campo: 'Planilha',
      valor: String(linhas.length),
      mensagem: `Esta planilha tem ${linhas.length} estudante(s), mas o limite é de ${LIMITE_ESTUDANTES_POR_LOTE} estudantes por envio. Divida os dados em vários ficheiros de até ${LIMITE_ESTUDANTES_POR_LOTE} estudantes cada e envie um de cada vez.`,
    });
  }

  return { contexto, linhas, erros, totalLinhas: linhas.length };
}
