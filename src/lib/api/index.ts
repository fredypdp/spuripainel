// src/lib/api/index.ts

// Client
export { api, tokenStorage, ApiError, SpuriApiError } from './client';
export type { FetchOptions } from './client';

// Serviços
export {
  healthService,
  bootstrapService, // 🔥 Novo
  academiaService,
  estudanteService,
  inscricoesService, // 🔥 Atualizado
  consultasService,
  eventSourcingService,
  adminService,
  perfilService,
} from './services';

// Hooks
export { useApi, useApiQuery } from '@/hooks/useApi';

// Tipos principais
export type {
  UserType,
  AdminType,
  AcademiaType,
  NivelEscolar,
  AnoEscolar,
  AnoSuperior,
  StatusEscolar,
  StatusSuperior,
  StatusGeral, // 🔥 Novo
  StatusInscricao,
  Periodo,
  LoginRequest,
  AuthResponse,
  ApiResponse,
  Inscricao,
  ListarInscricoesResponse, // 🔥 Novo
  InscricaoResponse,
  HistoricoEstudante,
  Evento,
  EstudanteDetalhado,
  AcademiaSimples,
  AcademiaDetalhada,
  AdminDetalhado,
  MeuPerfilResponse,
  ConsultarEstudanteResponse,
  ConsultarAcademiaResponse,
  ConsultarAdminResponse,
  BuscarUsuarioResponse,
  ConsultarAcademiasResponse,
  ConsultarEstudantesResponse,
  PrimeiroAmdminResponse,
  CriarEscolaRequest,
  CriarUniversidadeRequest,
  CriarEstudanteFundamentalRequest,
  CriarEstudanteSuperiorRequest,
  SolicitarInscricaoRequest,
  RegistrarNotasRequest,
  RegistrarFaltasRequest,
  CriarAdminRequest,
  DesativarRequest,
  Materia,
  Provincia,
  ProvinciaNome,
  ProvinciaCodigo,
  Provincias,
} from '@/types/api';