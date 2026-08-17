import type { RegistrarNotasRequest } from '@/types/api';
import type { ContextoModeloNotas, NotaBulkRow } from './notasTypes';
export function construirPayloadNota(linha: NotaBulkRow, contexto: ContextoModeloNotas): RegistrarNotasRequest { return { codigo_estudante: linha.codigoEstudante.trim(), periodo: contexto.periodo as RegistrarNotasRequest['periodo'], materia_disciplinar_id: contexto.materiaId, tipo: contexto.tipoNota, categoria: contexto.categoria, nota: linha.valorNota as number }; }
