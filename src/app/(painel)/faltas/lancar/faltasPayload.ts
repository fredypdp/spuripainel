import type { RegistrarFaltasRequest } from '@/types/api';
import type { ContextoModeloFaltas, FaltaBulkRow } from './faltasTypes';
export function construirPayloadFalta(linha: FaltaBulkRow, contexto: ContextoModeloFaltas): RegistrarFaltasRequest { return { codigo_estudante: linha.codigoEstudante.trim(), data: linha.dataIso as any, materia_disciplinar_id: contexto.materiaId, periodo: contexto.periodo as RegistrarFaltasRequest['periodo'], quantidade: linha.quantidade as number, ...(contexto.sumarioId ? { sumario_id: contexto.sumarioId } : {}) }; }
