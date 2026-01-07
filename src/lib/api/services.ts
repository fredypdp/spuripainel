// src/lib/api/services.ts

import { api, tokenStorage } from './client';
import type {
  ApiResponse,
  AuthResponse,
  CriarEscolaRequest,
  CriarUniversidadeRequest,
  LoginRequest,
  CriarEstudanteFundamentalRequest,
  CriarEstudanteSuperiorRequest,
  SolicitarInscricaoRequest,
  RegistrarNotasRequest,
  RegistrarFaltasRequest,
  CriarAdminRequest,
  DesativarRequest,
  Inscricao,
  HistoricoEstudante,
  Evento,
  StatusInscricao,
  MeuPerfilResponse,
  ConsultarEstudanteResponse,
  ConsultarAcademiaResponse,
  ConsultarAdminResponse,
  BuscarUsuarioResponse,
  ConsultarAcademiasResponse,
} from '@/types/api';

// =====================
// HEALTH & SETUP
// =====================

export const healthService = {
  check: () => api.get<{ status: string }>('/health'),
};

// =====================
// ACADEMIA
// =====================

export const academiaService = {
  criarEscola: (data: CriarEscolaRequest) =>
    api.post<ApiResponse<AuthResponse>>('/academia/register', data),

  criarUniversidade: (data: CriarUniversidadeRequest) =>
    api.post<ApiResponse<AuthResponse>>('/academia/register', data),

  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/login', data),

  listarInscricoesPendentes: (token?: string) =>
    api.get<ApiResponse<Inscricao[]>>('/academia/inscricoes-pendentes', {
      token: token || tokenStorage.get() || undefined,
    }),

  aprovarInscricao: (inscricaoId: string, token?: string) =>
    api.put<ApiResponse>(`/academia/inscricao/${inscricaoId}/aprovar`, undefined, {
      token: token || tokenStorage.get() || undefined,
    }),

  reprovarInscricao: (inscricaoId: string, token?: string) =>
    api.put<ApiResponse>(`/academia/inscricao/${inscricaoId}/reprovar`, undefined, {
      token: token || tokenStorage.get() || undefined,
    }),

  registrarNotas: (data: RegistrarNotasRequest, token?: string) =>
    api.post<ApiResponse>('/academia/notas-aluno', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  registrarFaltas: (data: RegistrarFaltasRequest, token?: string) =>
    api.post<ApiResponse>('/academia/faltas-aluno', data, {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// ESTUDANTE
// =====================

export const estudanteService = {
  criarFundamental: (data: CriarEstudanteFundamentalRequest) =>
    api.post<ApiResponse<AuthResponse>>('/estudante/register', data),

  criarSuperior: (data: CriarEstudanteSuperiorRequest) =>
    api.post<ApiResponse<AuthResponse>>('/estudante/register', data),

  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/login', data),

  solicitarInscricao: (data: SolicitarInscricaoRequest, token?: string) =>
    api.post<ApiResponse>('/estudante/inscricao-escola', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  minhasInscricoes: (token?: string) =>
    api.get<ApiResponse<Inscricao[]>>('/estudante/minhas-inscricoes', {
      token: token || tokenStorage.get() || undefined,
    }),

  meuHistorico: (token?: string) =>
    api.get<ApiResponse<HistoricoEstudante>>('/estudante/meu-historico', {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// CONSULTAS (CQRS)
// =====================

export const consultasService = {
  notasEstudante: (codigoEstudante: string, token?: string) =>
    api.get<ApiResponse>(`/notas-estudante/${codigoEstudante}`, {
      token: token || tokenStorage.get() || undefined,
    }),

  faltasEstudante: (codigoEstudante: string, token?: string) =>
    api.get<ApiResponse>(`/faltas-estudante/${codigoEstudante}`, {
      token: token || tokenStorage.get() || undefined,
    }),

  historicoCompleto: (codigoEstudante: string, token?: string) =>
    api.get<ApiResponse<HistoricoEstudante>>(`/historico-estudante/${codigoEstudante}`, {
      token: token || tokenStorage.get() || undefined,
    }),

  listarInscricoes: (status?: StatusInscricao, token?: string) => {
    const query = status ? `?status=${status}` : '';
    return api.get<ApiResponse<Inscricao[]>>(`/inscricoes${query}`, {
      token: token || tokenStorage.get() || undefined,
    });
  },

  listarAcademias: (token?: string) =>
    api.get<ConsultarAcademiasResponse>('/academias', {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// EVENT SOURCING
// =====================

export const eventSourcingService = {
  eventosEstudante: (codigoEstudante: string, token?: string) =>
    api.get<ApiResponse<Evento[]>>(`/eventos-estudante/${codigoEstudante}`, {
      token: token || tokenStorage.get() || undefined,
    }),

  verificarIntegridade: (codigoEstudante: string, token?: string) =>
    api.get<ApiResponse>(`/verificar-integridade/${codigoEstudante}`, {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// ADMIN
// =====================

export const adminService = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/admin/login', data),

  criar: (data: CriarAdminRequest, token?: string) =>
    api.post<ApiResponse>('/admin/register', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  listarEstudantes: (token?: string) =>
    api.get<ApiResponse>('/admin/estudantes', {
      token: token || tokenStorage.get() || undefined,
    }),

  listarInscricoes: (status?: StatusInscricao, token?: string) => {
    const query = status ? `?status=${status}` : '';
    return api.get<ApiResponse<Inscricao[]>>(`/admin/inscricoes${query}`, {
      token: token || tokenStorage.get() || undefined,
    });
  },

  listarAdmins: (token?: string) =>
    api.get<ApiResponse>('/admin/admins', {
      token: token || tokenStorage.get() || undefined,
    }),

  ativarAcademia: (id: string, token?: string) =>
    api.put<ApiResponse>(`/admin/academia/${id}/ativar`, undefined, {
      token: token || tokenStorage.get() || undefined,
    }),

  desativarAcademia: (id: string, data: DesativarRequest, token?: string) =>
    api.put<ApiResponse>(`/admin/academia/${id}/desativar`, data, {
      token: token || tokenStorage.get() || undefined,
    }),

  ativarAdmin: (id: string, token?: string) =>
    api.put<ApiResponse>(`/admin/admin/${id}/ativar`, undefined, {
      token: token || tokenStorage.get() || undefined,
    }),

  desativarAdmin: (id: string, data: DesativarRequest, token?: string) =>
    api.put<ApiResponse>(`/admin/admin/${id}/desativar`, data, {
      token: token || tokenStorage.get() || undefined,
    }),

  consultarAdminPorEmail: (email: string, token?: string) =>
    api.get<ConsultarAdminResponse>(`/admin/consultar-admin/${email}`, {
      token: token || tokenStorage.get() || undefined,
    }),

  buscarUsuario: (tipo: 'estudante' | 'academia' | 'admin', id: string, token?: string) =>
    api.get<BuscarUsuarioResponse>(`/admin/buscar-usuario?tipo=${tipo}&id=${id}`, {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// PERFIL E CONSULTAS PÚBLICAS
// =====================

export const perfilService = {
  meuPerfil: (token?: string) =>
    api.get<MeuPerfilResponse>('/meu-perfil', {
      token: token || tokenStorage.get() || undefined,
    }),

  consultarEstudante: (codigoEstudante: string, token?: string) =>
    api.get<ConsultarEstudanteResponse>(`/consultar-estudante/${codigoEstudante}`, {
      token: token || tokenStorage.get() || undefined,
    }),

  consultarAcademia: (codigoAcademia: string, token?: string) =>
    api.get<ConsultarAcademiaResponse>(`/consultar-academia/${codigoAcademia}`, {
      token: token || tokenStorage.get() || undefined,
    }),
};