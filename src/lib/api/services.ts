// src/lib/api/services.ts

import { api, tokenStorage } from './client';
import type {
  AuthResponse,
  CriarEscolaRequest,
  CriarUniversidadeRequest,
  LoginRequest,
  AdminLoginRequest,
  CriarEstudanteRequest,
  SolicitarInscricaoEscolaRequest,
  SolicitarInscricaoUniversidadeRequest,
  RegistrarNotasRequest,
  RegistrarFaltasRequest,
  AprovarInscricaoRequest,
  ReprovarInscricaoRequest,
  CriarAdminRequest,
  DesativarRequest,
  VincularAcademiaRequest,
  AtualizarStatusRequest,
  AlterarSenhaRequest,
  SolicitarRecuperacaoRequest,
  SolicitarVerificacaoRequest,
  StatusInscricao,
  MeuPerfilResponse,
  ConsultarEstudanteResponse,
  ConsultarAcademiaResponse,
  ConsultarAdminResponse,
  BuscarUsuarioResponse,
  ConsultarAcademiasResponse,
  ConsultarEstudantesResponse,
  PrimeiroAdminResponse,
  ListarInscricoesResponse,
  InscricaoResponse,
  NotasEstudanteResponse,
  FaltasEstudanteResponse,
  HistoricoCompletoResponse,
  EventosEstudanteResponse,
  VerificarIntegridadeResponse,
  ListarInscricoesAprovadasResponse,
  VincularAcademiaResponse,
  AtualizarStatusResponse,
  CriarCursoRequest,
  AtualizarCursoRequest,
  CriarMateriaRequest,
  AtualizarMateriaRequest,
  ListarCursosResponse,
  ListarMateriasResponse,
  AtualizarDadosPessoaisEstudanteRequest,
  AtualizarDadosAcademicosEstudanteRequest,
  AtualizarDadosAcademiaRequest,
  AtualizarDadosAdminRequest,
  AtualizarRoleAdminRequest,
  RegistroCompleto,
  RegistrosPorEstudanteResponse,
  RegistrosPorAcademiaResponse,
} from '@/types/api';

// =====================
// HEALTH & SETUP
// =====================

export const healthService = {
  check: () => 
    api.get<{ status: string; database: string; service: string; version: string }>('/health'),
  
  checkDetailed: (token?: string) =>
    api.get<any>('/health/detailed', {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// BOOTSTRAP
// =====================

export const bootstrapService = {
  criarPrimeiroAdmin: (data?: CriarAdminRequest) =>
    api.post<PrimeiroAdminResponse>('/bootstrap/admin-fpp', data),
};

// =====================
// ACADEMIA
// =====================

export const academiaService = {
  criarEscola: (data: CriarEscolaRequest) =>
    api.post<{ message: string; data: { codigo_academia: string; id: string } }>(
      '/academia/register',
      data
    ),

  criarUniversidade: (data: CriarUniversidadeRequest) =>
    api.post<{ message: string; data: { codigo_academia: string; id: string } }>(
      '/academia/register',
      data
    ),

  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/login', data),

  aprovarInscricao: (inscricaoId: string, data: AprovarInscricaoRequest, token?: string) =>
    api.put<{ message: string; estudante: string; tipo: string }>(
      `/academia/inscricao/${inscricaoId}/aprovar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  reprovarInscricao: (inscricaoId: string, data: ReprovarInscricaoRequest, token?: string) =>
    api.put<{ message: string; estudante: string; motivo: string }>(
      `/academia/inscricao/${inscricaoId}/reprovar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  registrarNotas: (data: RegistrarNotasRequest, token?: string) =>
    api.post<{ message: string; estudante: string; materia: string; nota: number }>(
      '/academia/notas-aluno',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  registrarFaltas: (data: RegistrarFaltasRequest, token?: string) =>
    api.post<{ message: string; estudante: string; materia: string; quantidade: number }>(
      '/academia/faltas-aluno',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarDados: (data: AtualizarDadosAcademiaRequest, token?: string) =>
    api.put<{ message: string; aviso?: string; email_verificado?: boolean }>(
      '/academia/dados',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // Cursos
  criarCurso: (data: CriarCursoRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; nome: string; type: string } }>(
      '/academia/cursos',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarCursos: (token?: string) =>
    api.get<ListarCursosResponse>(
      '/academia/cursos',
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarCurso: (cursoId: string, data: AtualizarCursoRequest, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/cursos/${cursoId}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarCurso: (cursoId: string, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/cursos/${cursoId}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarCurso: (cursoId: string, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/cursos/${cursoId}/desativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  // Matérias
  criarMateria: (data: CriarMateriaRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; nome: string; type: string } }>(
      '/academia/materias',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarMaterias: (token?: string) =>
    api.get<ListarMateriasResponse>(
      '/academia/materias',
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarMateria: (materiaId: string, data: AtualizarMateriaRequest, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/materias/${materiaId}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// ESTUDANTE
// =====================

export const estudanteService = {
  criar: (data: CriarEstudanteRequest) =>
    api.post<{ message: string; data: { codigo_estudante: string; id: string } }>(
      '/estudante/register',
      data
    ),

  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/login', data),

  solicitarInscricaoEscola: (data: SolicitarInscricaoEscolaRequest, token?: string) =>
    api.post<InscricaoResponse>(
      '/estudante/inscricao-escola',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  solicitarInscricaoUniversidade: (data: SolicitarInscricaoUniversidadeRequest, token?: string) =>
    api.post<InscricaoResponse>(
      '/estudante/inscricao-universidade',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  meuHistorico: (token?: string) =>
    api.get<HistoricoCompletoResponse>(
      '/estudante/meu-historico',
      { token: token || tokenStorage.get() || undefined }
    ),

  minhasInscricoes: (token?: string) =>
    api.get<{ inscricoes: any[]; total: number }>(
      '/estudante/minhas-inscricoes',
      { token: token || tokenStorage.get() || undefined }
    ),

  listarInscricoesAprovadas: (token?: string) =>
    api.get<ListarInscricoesAprovadasResponse>(
      '/estudante/inscricoes-aprovadas',
      { token: token || tokenStorage.get() || undefined }
    ),

  vincularAcademia: (data: VincularAcademiaRequest, token?: string) =>
    api.post<VincularAcademiaResponse>(
      '/estudante/vincular-academia',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarStatusEscolar: (data: AtualizarStatusRequest, token?: string) =>
    api.put<AtualizarStatusResponse>(
      '/estudante/status-escolar',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarStatusSuperior: (data: AtualizarStatusRequest, token?: string) =>
    api.put<AtualizarStatusResponse>(
      '/estudante/status-superior',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarDadosPessoais: (data: AtualizarDadosPessoaisEstudanteRequest, token?: string) =>
    api.put<{ message: string; aviso?: string; email_verificado?: boolean }>(
      '/estudante/dados-pessoais',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarDadosAcademicos: (data: AtualizarDadosAcademicosEstudanteRequest, token?: string) =>
    api.put<{ message: string }>(
      '/estudante/dados-academicos',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
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

  listarInscricoesPendentes: (params?: {
    limit?: number;
    offset?: number;
    token?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    const url = `/inscricoes-pendentes${query ? `?${query}` : ''}`;

    return api.get<ListarInscricoesResponse>(url, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },
};

// =====================
// CONSULTAS (CQRS)
// =====================

export const consultasService = {
  notasEstudante: (codigoEstudante: string, token?: string) =>
    api.get<NotasEstudanteResponse>(
      `/notas-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  faltasEstudante: (codigoEstudante: string, token?: string) =>
    api.get<FaltasEstudanteResponse>(
      `/faltas-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  historicoCompleto: (codigoEstudante: string, token?: string) =>
    api.get<HistoricoCompletoResponse>(
      `/historico-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ✅ CORRIGIDO: Removida paginação e ajustado response type
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
    api.get<EventosEstudanteResponse>(
      `/eventos-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  verificarIntegridade: (codigoEstudante: string, token?: string) =>
    api.get<VerificarIntegridadeResponse>(
      `/verificar-integridade/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// ADMIN
// =====================

export const adminService = {
  login: (data: AdminLoginRequest) =>
    api.post<AuthResponse>('/admin/login', data),

  criar: (data: CriarAdminRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; nome: string; email: string; role: string } }>(
      '/admin/register',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarAdmins: (token?: string) =>
    api.get<{ admins: any[]; total: number }>(
      '/admin/admins',
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarDados: (adminId: string, data: AtualizarDadosAdminRequest, token?: string) =>
    api.put<{ message: string }>(
      `/admin/dados/${adminId}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarRole: (adminId: string, data: AtualizarRoleAdminRequest, token?: string) =>
    api.put<{ message: string; role_anterior: string; novo_role: string }>(
      `/admin/role/${adminId}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarAcademia: (codigo: string, token?: string) =>
    api.put<{ message: string; codigo_academia: string; nome: string }>(
      `/admin/academia/${codigo}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarAcademia: (codigo: string, data: DesativarRequest, token?: string) =>
    api.put<{ message: string; codigo_academia: string; nome: string; motivo: string }>(
      `/admin/academia/${codigo}/desativar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarAdmin: (id: string, token?: string) =>
    api.put<{ message: string; email: string }>(
      `/admin/admin/${id}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarAdmin: (id: string, data: DesativarRequest, token?: string) =>
    api.put<{ message: string; email: string }>(
      `/admin/admin/${id}/desativar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  consultarAdminPorEmail: (email: string, token?: string) =>
    api.get<ConsultarAdminResponse>(
      `/admin/consultar-admin/${email}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  buscarUsuario: (tipo: 'estudante' | 'academia' | 'admin', id: string, token?: string) =>
    api.get<BuscarUsuarioResponse>(
      `/admin/buscar-usuario?tipo=${tipo}&id=${id}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // Projeções
  rebuildProjection: (name: string, token?: string) =>
    api.post<{ message: string; projection: string }>(
      `/admin/rebuild-projection/${name}`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  getProjectionStatus: (name: string, token?: string) =>
    api.get<any>(
      `/admin/projection-status/${name}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  getAllProjectionStatuses: (token?: string) =>
    api.get<{ projections: any[]; total: number }>(
      '/admin/projections-status',
      { token: token || tokenStorage.get() || undefined }
    ),

  getLedgerStats: (token?: string) =>
    api.get<any>(
      '/admin/ledger-stats',
      { token: token || tokenStorage.get() || undefined }
    ),

  verifyAllIntegrity: (token?: string) =>
    api.get<any>(
      '/admin/verify-all-integrity',
      { token: token || tokenStorage.get() || undefined }
    ),

  // Registros
  listarTodosRegistros: (params?: {
    tipo?: 'notas' | 'faltas';
    limit?: number;
    offset?: number;
    token?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    const url = `/admin/todos-registros${query ? `?${query}` : ''}`;

    return api.get<RegistroCompleto>(url, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  listarRegistrosPorEstudante: (codigo: string, token?: string) =>
    api.get<RegistrosPorEstudanteResponse>(
      `/admin/registros/estudante/${codigo}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarRegistrosPorAcademia: (codigo: string, token?: string) =>
    api.get<RegistrosPorAcademiaResponse>(
      `/admin/registros/academia/${codigo}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // Métricas
  getMetrics: (token?: string) =>
    api.get<any>(
      '/admin/metrics',
      { token: token || tokenStorage.get() || undefined }
    ),

  getSystemStats: (token?: string) =>
    api.get<any>(
      '/admin/system-stats',
      { token: token || tokenStorage.get() || undefined }
    ),

  resetMetrics: (token?: string) =>
    api.post<{ message: string }>(
      '/admin/metrics/reset',
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),
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
    api.get<ConsultarEstudanteResponse>(
      `/consultar-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  consultarAcademia: (codigoAcademia: string, token?: string) =>
    api.get<ConsultarAcademiaResponse>(
      `/consultar-academia/${codigoAcademia}`,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// EMAIL (Verificação e Recuperação)
// =====================

export const emailService = {
  solicitarVerificacao: (data: SolicitarVerificacaoRequest) =>
    api.post<{ message: string; email: string }>(
      '/verificar-email/solicitar',
      data
    ),

  verificarEmail: (token: string) =>
    api.post<{ message: string; email: string }>(
      `/verificar-email/${token}`,
      undefined
    ),

  solicitarRecuperacao: (data: SolicitarRecuperacaoRequest) =>
    api.post<{ message: string; email: string }>(
      '/recuperar-senha/solicitar',
      data
    ),

  resetarSenha: (token: string) =>
    api.post<{ message: string; senha_padrao: string; email: string; proximos_passos: string }>(
      `/recuperar-senha/${token}`,
      undefined
    ),

  alterarSenha: (data: AlterarSenhaRequest, token?: string) =>
    api.put<{ message: string }>(
      '/alterar-senha',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
};