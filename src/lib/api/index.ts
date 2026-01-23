// src/lib/api/index.ts

// Client
export { api, tokenStorage, ApiError, SpuriApiError } from './client';
export type { FetchOptions } from './client';

// Serviços
export {
  healthService,
  bootstrapService,
  academiaService,
  estudanteService,
  inscricoesService,
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
  StatusGeral,
  StatusInscricao,
  Periodo,
  LoginRequest,
  AuthResponse,
  ApiResponse,
  Inscricao,
  ListarInscricoesResponse,
  InscricaoResponse,
  Nota,
  Falta,
  NotasEstudanteResponse,
  FaltasEstudanteResponse,
  HistoricoCompletoResponse,
  Evento,
  EventosEstudanteResponse,
  VerificarIntegridadeResponse,
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
  PrimeiroAdminResponse,
  ListarInscricoesAprovadasResponse,
  VincularAcademiaResponse,
  AtualizarStatusResponse,
  CriarEscolaRequest,
  CriarUniversidadeRequest,
  CriarEstudanteRequest,
  SolicitarInscricaoEscolaRequest,
  SolicitarInscricaoUniversidadeRequest,
  RegistrarNotasRequest,
  RegistrarFaltasRequest,
  CriarAdminRequest,
  DesativarRequest,
  VincularAcademiaRequest,
  AtualizarStatusRequest,
  Provincia,
  ProvinciaNome,
  ProvinciaCodigo,
  Provincias,
} from '@/types/api';