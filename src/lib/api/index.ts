// src/lib/api/index.ts

// Exportar tudo do client
export { api, tokenStorage, ApiError } from './client';
export type { FetchOptions } from './client';

// Exportar todos os serviços
export {
  healthService,
  academiaService,
  estudanteService,
  consultasService,
  eventSourcingService,
  adminService,
} from './services';

// Exportar hooks
export { useApi, useApiQuery } from '@/hooks/useApi';

// Re-exportar tipos importantes
export type {
  UserType,
  AcademiaType,
  LoginRequest,
  AuthResponse,
  ApiResponse,
  Inscricao,
  HistoricoEstudante,
  StatusInscricao,
} from '@/types/api';