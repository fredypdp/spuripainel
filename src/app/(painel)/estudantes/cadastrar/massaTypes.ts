// src/app/(painel)/estudantes/cadastrar/massaTypes.ts
import type { NivelBulk } from './massaHelpers';

/**
 * Contexto de um modelo de Excel de cadastro em massa: identifica de forma
 * inequívoca a academia, o nível, o curso (quando aplicável) e o ano
 * acadêmico para os quais o modelo foi gerado. O contexto também pode identificar uma turma fixa
 * quando o modelo for gerado no modo de cadastro por turma. Este contexto é embutido numa folha
 * oculta (`_meta`) do próprio ficheiro Excel, para que o utilizador não
 * precise de preencher curso/ano na planilha.
 */
export interface ContextoModelo {
  codigoAcademia: string;
  nomeAcademia: string;
  nivel: NivelBulk;
  cursoId?: string;
  cursoNome?: string;
  anoAcademico: string;
  anoAcademicoLabel: string;
  versaoModelo: string;
  modoCadastro: 'turma' | 'geral';
  codigoTurma?: string;
  turmaLabel?: string;
}

/**
 * Uma linha de estudante lida da folha "Estudantes" do Excel, já com os
 * valores em bruto (tal como digitados) e, quando aplicável, os valores
 * convertidos/normalizados.
 */
export interface EstudanteBulkRow {
  linha: number; // número real da linha no Excel (1-indexado)
  nome: string;
  genero: string;
  dataNascimento: string; // valor tal como está na planilha (ex: "15/05/2010")
  dataNascimentoIso?: string; // convertido para "AAAA-MM-DD", quando válido
  dataNascimentoErro?: string; // mensagem específica de erro de formato/data, quando aplicável
  email: string;
  telefone: string;
  telefoneEncarregado: string;
  bilheteIdentidade: string;
  bilheteIdentidadeEncarregado: string;
}

export interface ErroValidacao {
  linha: number; // 0 = erro geral do ficheiro (não associado a uma linha específica)
  coluna: string; // letra da coluna, ex: "A", "B" ou "-" para erros gerais
  campo: string; // nome amigável do campo
  valor: string;
  mensagem: string; // mensagem didática, explicando o erro e como corrigir
}

export interface ResultadoAnalise {
  contexto: ContextoModelo | null;
  linhas: EstudanteBulkRow[];
  erros: ErroValidacao[];
  totalLinhas: number;
}
