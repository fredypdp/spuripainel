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
  HistoricoEstudante,
  Evento,
  StatusInscricao,
  MeuPerfilResponse,
  ConsultarEstudanteResponse,
  ConsultarAcademiaResponse,
  ConsultarAdminResponse,
  BuscarUsuarioResponse,
  ConsultarAcademiasResponse,
  ConsultarEstudantesResponse,
  PrimeiroAmdminResponse,
  ListarInscricoesResponse,
  InscricaoResponse,
} from '@/types/api';

// =====================
// HEALTH & SETUP
// =====================

export const healthService = {
  check: () => api.get<{ status: string; version: string; db_stats: any }>('/health'),
};

// =====================
// BOOTSTRAP
// =====================

export const bootstrapService = {
  criarPrimeiroAdmin: (data: CriarAdminRequest) =>
    api.post<PrimeiroAmdminResponse>('/bootstrap/admin-fpp', data),
};

// =====================
// ACADEMIA
// =====================

export const academiaService = {
  criarEscola: (data: CriarEscolaRequest) =>
    api.post<{data: {codigo_academia: string, id: string}, message: string}>('/academia/register', data),

  criarUniversidade: (data: CriarUniversidadeRequest) =>
    api.post<{data: {codigo_academia: string, id: string}, message: string}>('/academia/register', data),

  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/login', data),

  aprovarInscricao: (inscricaoId: string, token?: string) =>
    api.put<{message: string; codigo_estudante: string; status_anterior: string; status_atual: string}>(
      `/academia/inscricao/${inscricaoId}/aprovar`, 
      undefined, 
      { token: token || tokenStorage.get() || undefined }
    ),

  reprovarInscricao: (inscricaoId: string, token?: string) =>
    api.put<{message: string; codigo_estudante: string; status: string}>(
      `/academia/inscricao/${inscricaoId}/reprovar`, 
      undefined, 
      { token: token || tokenStorage.get() || undefined }
    ),

  registrarNotas: (data: RegistrarNotasRequest, token?: string) =>
    api.post<{message: string; codigo_estudante: string}>('/academia/notas-aluno', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  registrarFaltas: (data: RegistrarFaltasRequest, token?: string) =>
    api.post<{message: string; codigo_estudante: string}>('/academia/faltas-aluno', data, {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// ESTUDANTE
// =====================

export const estudanteService = {
  criarFundamental: (data: CriarEstudanteFundamentalRequest) =>
    api.post<{data: {codigo_estudante: string, id: string}, message: string}>('/estudante/register', data),

  criarSuperior: (data: CriarEstudanteSuperiorRequest) =>
    api.post<{data: {codigo_estudante: string, id: string}, message: string}>('/estudante/register', data),

  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/login', data),

  solicitarInscricaoEscola: (data: SolicitarInscricaoRequest, token?: string) =>
    api.post<InscricaoResponse>('/estudante/inscricao-escola', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  solicitarInscricaoUniversidade: (data: {
    codigo_academia: string;
    ano_superior_inscricao: string;
    curso_superior: string;
  }, token?: string) =>
    api.post<InscricaoResponse>('/estudante/inscricao-universidade', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  meuHistorico: (token?: string) =>
    api.get<ApiResponse<HistoricoEstudante>>('/estudante/meu-historico', {
      token: token || tokenStorage.get() || undefined,
    }),

  // 🔥 NOVOS: Endpoints de vínculo e status
  listarInscricoesAprovadas: (token?: string) =>
    api.get<{inscricoes: any[]; total: number; mensagem: string}>('/estudante/inscricoes-aprovadas', {
      token: token || tokenStorage.get() || undefined,
    }),

  vincularAcademia: (data: { inscricao_id: string }, token?: string) =>
    api.post<{message: string; status: string}>('/estudante/vincular-academia', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  atualizarStatusEscolar: (data: { novo_status: string }, token?: string) =>
    api.put<{message: string; novo_status: string}>('/estudante/status-escolar', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  atualizarStatusSuperior: (data: { novo_status: string }, token?: string) =>
    api.put<{message: string; novo_status: string}>('/estudante/status-superior', data, {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// INSCRIÇÕES UNIFICADAS
// =====================

export const inscricoesService = {
  listarInscricoes: (params?: {
    status?: StatusInscricao;
    limit?: number;
    offset?: number;
    token?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    const url = `/inscricoes${query ? `?${query}` : ''}`;
    
    return api.get<ListarInscricoesResponse>(url, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  listarInscricoesPendentes: (params?: { token?: string }) => {
    return api.get<ListarInscricoesResponse>('/inscricoes-pendentes', {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },
};

// =====================
// CONSULTAS (CQRS)
// =====================

export const consultasService = {
  notasEstudante: (codigoEstudante: string, token?: string) =>
    api.get<{codigo_estudante: string; nome: string; notas: any[]; total: number}>(
      `/notas-estudante/${codigoEstudante}`, 
      { token: token || tokenStorage.get() || undefined }
    ),

  faltasEstudante: (codigoEstudante: string, token?: string) =>
    api.get<{codigo_estudante: string; nome: string; faltas: any[]; total: number}>(
      `/faltas-estudante/${codigoEstudante}`, 
      { token: token || tokenStorage.get() || undefined }
    ),

  historicoCompleto: (codigoEstudante: string, token?: string) =>
    api.get<{estudante: any; notas: any[]; faltas: any[]; inscricoes: any[]}>(
      `/historico-estudante/${codigoEstudante}`, 
      { token: token || tokenStorage.get() || undefined }
    ),

  listarAcademias: (token?: string) =>
    api.get<ConsultarAcademiasResponse>('/academias', {
      token: token || tokenStorage.get() || undefined,
    }),
  
  listarEstudantes: (token?: string) =>
    api.get<ConsultarEstudantesResponse>('/estudantes', {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// EVENT SOURCING
// =====================

export const eventSourcingService = {
  eventosEstudante: (codigoEstudante: string, token?: string) =>
    api.get<{codigo_estudante: string; nome: string; eventos: Evento[]; total: number; message: string}>(
      `/eventos-estudante/${codigoEstudante}`, 
      { token: token || tokenStorage.get() || undefined }
    ),

  verificarIntegridade: (codigoEstudante: string, token?: string) =>
    api.get<{codigo_estudante: string; nome: string; integro: boolean; message: string}>(
      `/verificar-integridade/${codigoEstudante}`, 
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// ADMIN
// =====================

export const adminService = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/admin/login', data),

  criar: (data: CriarAdminRequest, token?: string) =>
    api.post<{message: string; data: {id: string; nome: string; email: string; role: string}}>(
      '/admin/register', 
      data, 
      { token: token || tokenStorage.get() || undefined }
    ),

  listarAdmins: (token?: string) =>
    api.get<{admins: any[]; total: number}>('/admin/admins', {
      token: token || tokenStorage.get() || undefined,
    }),

  ativarAcademia: (id: string, token?: string) =>
    api.put<{message: string; codigo_academia: string}>(`/admin/academia/${id}/ativar`, undefined, {
      token: token || tokenStorage.get() || undefined,
    }),

  desativarAcademia: (id: string, data: DesativarRequest, token?: string) =>
    api.put<{message: string; codigo_academia: string}>(`/admin/academia/${id}/desativar`, data, {
      token: token || tokenStorage.get() || undefined,
    }),

  ativarAdmin: (id: string, token?: string) =>
    api.put<{message: string; email: string}>(`/admin/admin/${id}/ativar`, undefined, {
      token: token || tokenStorage.get() || undefined,
    }),

  desativarAdmin: (id: string, data: DesativarRequest, token?: string) =>
    api.put<{message: string; email: string}>(`/admin/admin/${id}/desativar`, data, {
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

  // Projeções
  rebuildProjection: (name: string, token?: string) =>
    api.post<{message: string; projection: string}>(`/admin/rebuild-projection/${name}`, undefined, {
      token: token || tokenStorage.get() || undefined,
    }),

  getProjectionStatus: (name: string, token?: string) =>
    api.get<any>(`/admin/projection-status/${name}`, {
      token: token || tokenStorage.get() || undefined,
    }),

  getAllProjectionStatuses: (token?: string) =>
    api.get<{projections: any[]; total: number}>('/admin/projections-status', {
      token: token || tokenStorage.get() || undefined,
    }),

  getLedgerStats: (token?: string) =>
    api.get<{ledger: any; event_types: any[]; db_stats: any}>('/admin/ledger-stats', {
      token: token || tokenStorage.get() || undefined,
    }),

  verifyAllIntegrity: (token?: string) =>
    api.get<{summary: any; aggregates: any[]}>('/admin/verify-all-integrity', {
      token: token || tokenStorage.get() || undefined,
    }),

  // 🔥 NOVOS: Registros
  listarTodosRegistros: (params?: {tipo?: 'notas' | 'faltas'; limit?: number; offset?: number; token?: string}) =>
    api.get<any>(`/admin/todos-registros?${new URLSearchParams(params as any).toString()}`, {
      token: params?.token || tokenStorage.get() || undefined,
    }),

  listarRegistrosPorEstudante: (codigo: string, token?: string) =>
    api.get<any>(`/admin/registros/estudante/${codigo}`, {
      token: token || tokenStorage.get() || undefined,
    }),

  listarRegistrosPorAcademia: (codigo: string, token?: string) =>
    api.get<any>(`/admin/registros/academia/${codigo}`, {
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