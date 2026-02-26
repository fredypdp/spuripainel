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
  RegistrarAprovacaoAnoRequest,
  AprovacoesEstudanteResponse,
  ListarAdminsResponse,
  Inscricao,
  AlterarCursoRequest,
  GetInscricoesPorCodigoResponse,
  AlterarCursoResponse,
  DefinirAnoLetivoRequest,
  DefinirAnoLetivoResponse,
  AnoLetivoResponse,
  AtualizarNotaRequest,
  CriarCategoriaNotaRequest,
  ListarCategoriasNotaResponse,
} from '@/types/api';

export interface ErrorResponse {
  error: string;
  message?: string;
  request_id?: string;
}

export const academiaService = {
  criarEscola: (data: CriarEscolaRequest, token?: string) =>
    api.post<{ message: string; data: { codigo_academia: string; id: string } }>(
      '/admin/academia/register',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  criarUniversidade: (data: CriarUniversidadeRequest, token?: string) =>
    api.post<{ message: string; data: { codigo_academia: string; id: string } }>(
      '/admin/academia/register',
      data,
      { token: token || tokenStorage.get() || undefined }
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

  /**
   * Registrar nota de um estudante
   * POST /academia/registrar-nota
   * tipo e categoria agora são obrigatórios
   */
  registrarNotas: (data: RegistrarNotasRequest, token?: string) =>
    api.post<{
      message: string;
      estudante: string;
      materia: string;
      tipo: string;
      categoria: string;
      nota: number;
    }>(
      '/academia/registrar-nota',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Atualizar nota já registrada (observacao obrigatória)
   * PUT /academia/atualizar-nota
   */
  atualizarNota: (data: AtualizarNotaRequest, token?: string) =>
    api.put<{
      message: string;
      estudante: string;
      tipo: string;
      categoria: string;
      nota_anterior: number;
      nota_nova: number;
    }>(
      '/academia/atualizar-nota',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Criar categoria adicional de nota (apenas academias tipo "superior")
   * POST /academia/categorias-nota
   */
  criarCategoriaNotaSuperior: (data: CriarCategoriaNotaRequest, token?: string) =>
    api.post<{ message: string; nome: string; descricao?: string }>(
      '/academia/categorias-nota',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Listar categorias adicionais de nota (apenas academias tipo "superior")
   * GET /academia/categorias-nota
   */
  listarCategoriasNota: (token?: string) =>
    api.get<ListarCategoriasNotaResponse>(
      '/academia/categorias-nota',
      { token: token || tokenStorage.get() || undefined }
    ),

  registrarFaltas: (data: RegistrarFaltasRequest, token?: string) =>
    api.post<{ message: string; estudante: string; materia: string; quantidade: number }>(
      '/academia/faltas-aluno',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  registrarAprovacaoAno: (data: RegistrarAprovacaoAnoRequest, token?: string) =>
    api.post<{ message: string; estudante: string; ano_lectivo: string; avancar_ano: boolean }>(
      '/academia/aprovacao-ano',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarDados: (data: AtualizarDadosAcademiaRequest, token?: string) =>
    api.put<{ message: string; aviso?: string; email_verificado?: boolean }>(
      '/academia/dados',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // 🔥 NOVO: Cadastrar estudante já vinculado
  cadastrarEstudante: (data: CriarEstudanteRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; codigo_estudante: string; codigo_academia: string; status: string } }>(
      '/academia/estudante/register',
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
  
  /**
   * Criar nova matéria disciplinar
  */
  criarMateria: (data: CriarMateriaRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; nome: string; type: string } }>(
      '/academia/materias',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Listar matérias da academia
  */
  listarMaterias: (token?: string) =>
    api.get<ListarMateriasResponse>(
      '/academia/materias',
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Atualizar dados de uma matéria
  */
  atualizarMateria: (materiaId: string, data: AtualizarMateriaRequest, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/materias/${materiaId}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
  
  /**
   * Ativar matéria
  */
  ativarMateria: (materiaId: string, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/materias/${materiaId}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Desativar matéria
  */
  desativarMateria: (materiaId: string, token?: string) =>
  api.put<{ message: string; nome: string }>(
    `/academia/materias/${materiaId}/desativar`,
    undefined,
    { token: token || tokenStorage.get() || undefined }
  ),

  /**
   * Alterar curso do estudante (médio ou superior)
   * Acesso: academia
  */
  alterarCursoEstudante: (codigoEstudante: string, data: AlterarCursoRequest, token?: string) =>
    api.put<AlterarCursoResponse>(
      `/academia/estudante/${codigoEstudante}/curso`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Buscar inscrições de um estudante pelo código
   * Acesso: academia
  */
  getInscricoesPorCodigoEstudante: (codigoEstudante: string, token?: string) =>
    api.get<GetInscricoesPorCodigoResponse>(
      `/academia/inscricoes/estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// ESTUDANTE
// =====================

export const estudanteService = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/login', data),

  solicitarInscricaoEscola: (data: SolicitarInscricaoEscolaRequest, token?: string) =>
    api.post<{ message: string; inscricao_id: string; academia: string; tipo: string }>(
      '/estudante/inscricao-escola',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  solicitarInscricaoUniversidade: (data: SolicitarInscricaoUniversidadeRequest, token?: string) =>
    api.post<{ message: string; inscricao_id: string; academia: string; tipo: string }>(
      '/estudante/inscricao-universidade',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarInscricoes: (token?: string) =>
    api.get<ListarInscricoesResponse>('/estudante/minhas-inscricoes', {
      token: token || tokenStorage.get() || undefined,
    }),

  listarInscricoesAprovadas: (token?: string) =>
    api.get<ListarInscricoesAprovadasResponse>('/estudante/inscricoes-aprovadas', {
      token: token || tokenStorage.get() || undefined,
    }),

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
    api.put<{ message: string; aviso?: string }>(
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

  meuHistorico: (token?: string) =>
    api.get<HistoricoCompletoResponse>('/estudante/meu-historico', {
      token: token || tokenStorage.get() || undefined,
    }),

  minhasAprovacoes: (token?: string) =>
    api.get<AprovacoesEstudanteResponse>('/estudante/minhas-aprovacoes', {
      token: token || tokenStorage.get() || undefined,
    }),

  /**
   * Buscar inscrições do próprio estudante
   * Acesso: estudante
  */
  getMinhasInscricoesPorCodigo: (codigoEstudante: string, token?: string) =>
    api.get<GetInscricoesPorCodigoResponse>(
      `/estudante/inscricoes/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// INSCRIÇÕES (comum)
// =====================

export const inscricoesService = {
  listar: (params?: { status?: StatusInscricao; limit?: number; offset?: number; token?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.limit)  qs.append('limit',  params.limit.toString());
    if (params?.offset) qs.append('offset', params.offset.toString());
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarInscricoesResponse>(`/inscricoes${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  listarPendentes: (token?: string) =>
    api.get<ListarInscricoesResponse>('/inscricoes-pendentes', {
      token: token || tokenStorage.get() || undefined,
    }),

  detalhes: (inscricaoId: string, token?: string) =>
    api.get<InscricaoResponse>(`/inscricoes/${inscricaoId}`, {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// CONSULTAS (rotas compartilhadas)
// =====================

export const consultasService = {
  estudante: (codigoEstudante: string, token?: string) =>
    api.get<ConsultarEstudanteResponse>(
      `/consultar-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  academia: (codigoAcademia: string, token?: string) =>
    api.get<ConsultarAcademiaResponse>(
      `/consultar-academia/${codigoAcademia}`,
      { token: token || tokenStorage.get() || undefined }
    ),

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

  aprovacoesEstudante: (codigoEstudante: string, token?: string) =>
    api.get<AprovacoesEstudanteResponse>(
      `/aprovacoes-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  historicoCompleto: (codigoEstudante: string, token?: string) =>
    api.get<HistoricoCompletoResponse>(
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

  /**
   * Buscar inscrições de um estudante pelo código
   * Acesso: estudante (próprio), academia, admin
  */
  getInscricoesPorCodigoEstudante: (codigoEstudante: string, token?: string) =>
    api.get<GetInscricoesPorCodigoResponse>(
      `/inscricoes/estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),
  
  /**
   * Retorna o ano letivo atual configurado pelo admin
   * GET /ano-letivo-atual
   */
  getAnoLetivoAtual: (token?: string) =>
    api.get<{ ano_letivo: string }>(
      '/ano-letivo-atual',
      { token: token || tokenStorage.get() || undefined }
    ),
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
    api.get<ListarAdminsResponse>(
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
  
  /**
   * Define o ano letivo atual do sistema.
   * Exclusivo para admins FPP.
   * POST /admin/definir-ano-letivo
   */
  definirAnoLetivo: (data: DefinirAnoLetivoRequest, token?: string) =>
    api.post<DefinirAnoLetivoResponse>(
      '/admin/definir-ano-letivo',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Retorna o ano letivo atual configurado no sistema.
   * Acessível por qualquer usuário autenticado.
   * GET /ano-letivo-atual
   */
  getAnoLetivoAtual: (token?: string) =>
    api.get<AnoLetivoResponse>(
      '/ano-letivo-atual',
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

  alterarSenha: (data: AlterarSenhaRequest, token?: string) =>
  api.put<{ message: string }>(
    '/alterar-senha',
    data,
    { token: token || tokenStorage.get() || undefined }
  ),
};