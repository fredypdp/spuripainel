// src/app/(painel)/estudantes/cadastrar/massaPayload.ts
import type { CriarEstudanteRequest } from '@/types/api';
import type { ContextoModelo, EstudanteBulkRow } from './massaTypes';

/**
 * Converte uma linha da planilha (já validada) e o contexto do modelo
 * (nível, curso, ano acadêmico) no payload textual esperado pela API de
 * cadastro em massa sem arquivos (`com_arquivo: false`).
 */
export function construirPayloadEstudante(linha: EstudanteBulkRow, contexto: ContextoModelo): CriarEstudanteRequest {
  const isSuperior = contexto.nivel === 'superior';
  const isMedio = contexto.nivel === 'medio';
  const isFundamental = contexto.nivel === 'fundamental';

  return {
    nome: linha.nome.trim(),
    genero: linha.genero.trim().toLowerCase() as CriarEstudanteRequest['genero'],
    data_nascimento: linha.dataNascimentoIso as string,
    email: linha.email.trim() || undefined,
    telefone: linha.telefone.replace(/\D/g, '') || undefined,
    telefone_encarregado: linha.telefoneEncarregado.replace(/\D/g, '') || undefined,
    bilhete_identidade: linha.bilheteIdentidade.trim() ? linha.bilheteIdentidade.trim().toUpperCase() : undefined,
    bilhete_identidade_encarregado: linha.bilheteIdentidadeEncarregado.trim()
      ? linha.bilheteIdentidadeEncarregado.trim().toUpperCase()
      : undefined,
    ano_escolar_fundamental: isFundamental ? contexto.anoAcademico : undefined,
    ano_escolar_medio: isMedio ? contexto.anoAcademico : undefined,
    curso_medio_id: isMedio ? contexto.cursoId : undefined,
    ano_superior: isSuperior ? contexto.anoAcademico : undefined,
    curso_superior_id: isSuperior ? contexto.cursoId : undefined,
  };
}
