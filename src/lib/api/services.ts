// src/lib/api/services.ts
// Rotas baseadas em: cmd/server/main.go — revisado em 2026-03

import { api, tokenStorage } from './client';
import type {
  AuthResponse,
  CriarEscolaRequest,
  CriarUniversidadeRequest,
  LoginRequest,
  CriarEstudanteRequest,
  RegistrarNotasRequest,
  RegistrarFaltasRequest,
  AtualizarFaltaRequest,
  RegistrarAprovacaoAnoRequest,
  RegistrarAvaliacaoFinalRequest,
  CriarAdminRequest,
  DesativarRequest,
  AtualizarStatusRequest,
  AlterarSenhaRequest,
  SolicitarRecuperacaoRequest,
  MeuPerfilResponse,
  ConsultarEstudanteResponse,
  ConsultarAcademiaResponse,
  ConsultarAcademiasResponse,
  ConsultarEstudantesResponse,
  NotasEstudanteResponse,
  FaltasEstudanteResponse,
  EventosEstudanteResponse,
  VerificarIntegridadeResponse,
  AtualizarStatusResponse,
  CriarCursoRequest,
  AtualizarCursoRequest,
  CriarMateriaRequest,
  AtualizarMateriaRequest,
  ListarCursosResponse,
  ListarMateriasResponse,
  AtualizarDadosPessoaisEstudanteRequest,
  AtualizarDadosAcademiaRequest,
  AtualizarDadosAdminRequest,
  AtualizarRoleAdminRequest,
  RegistroCompleto,
  ListarAdminsResponse,
  DefinirAnoLetivoAcademiaRequest,
  AnoLetivoAcademiaResponse,
  DefinirAnoLetivoResponse,
  AtualizarNotaRequest,
  CriarCategoriaNotaRequest,
  ListarCategoriasNotaResponse,
  ListarTurmasResponse,
  CriarTurmaRequest,
  AtualizarTurmaRequest,
  AdicionarEstudanteTurmaRequest,
  ListarAvaliacoesResponse,
  AvaliacoesEstudanteResponse,
  ListarAprovacoesResponse,
  ListarReprovacoesResponse,
  DefinirPeriodoMateriaRequest,
  DeletarTurmaResponse,
  DeletarCursoResponse,
  Turma,
  AdminDetalhado,
  Curso,
  Materia,
} from '@/types/api';

export interface ErrorResponse {
  error: string;
  message?: string;
  request_id?: string;
}

// =====================
// AUTH (rotas públicas)
// =====================

/**
 * Único endpoint de login para todos os tipos de usuário (estudante, academia, admin).
 * POST /login
 */
export const authService = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/login', data),
};

// =====================
// EMAIL (rotas públicas com rate limit)
// =====================

export const emailService = {
  /**
   * Verificar email via token
   * POST /email/verificar-email/:token
   */
  verificarEmail: (token: string) =>
    api.post<{ message: string }>(`/email/verificar-email/${token}`, {}),

  /**
   * Solicitar (re)envio de email de verificação
   * POST /email/verificar-email/solicitar
   */
  solicitarVerificacaoEmail: (data: { email: string }) =>
    api.post<{ message: string }>('/email/verificar-email/solicitar', data),

  /**
   * Solicitar email de recuperação de senha
   * POST /email/recuperar-senha/solicitar
   */
  solicitarRecuperacaoSenha: (data: SolicitarRecuperacaoRequest) =>
    api.post<{ message: string }>('/email/recuperar-senha/solicitar', data),

  /**
   * Resetar senha via token
   * POST /email/recuperar-senha/:token
   */
  resetarSenha: (token: string, data: { nova_senha: string }) =>
    api.post<{ message: string }>(`/email/recuperar-senha/${token}`, data),

  /**
   * Gerar token de verificação de email
   * POST /email/gerar-token/verificacao
   */
  gerarTokenVerificacao: (data: { email: string }) =>
    api.post<{ message: string }>('/email/gerar-token/verificacao', data),

  /**
   * Gerar token de recuperação de senha
   * POST /email/gerar-token/recuperacao
   */
  gerarTokenRecuperacao: (data: { email: string }) =>
    api.post<{ message: string }>('/email/gerar-token/recuperacao', data),
};

// =====================
// PERFIL (rotas autenticadas — qualquer role)
// =====================

export const perfilService = {
  /**
   * GET /meu-perfil
   */
  meuPerfil: (token?: string) =>
    api.get<MeuPerfilResponse>('/meu-perfil', {
      token: token || tokenStorage.get() || undefined,
    }),

  /**
   * PUT /alterar-senha
   */
  alterarSenha: (data: AlterarSenhaRequest, token?: string) =>
    api.put<{ message: string }>(
      '/alterar-senha',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Adicionar um número de telefone extra ao perfil do utilizador autenticado.
   * Disponível para qualquer tipo de utilizador (estudante, academia, admin).
   * Regras:
   *   - O número não pode já estar verificado por outro utilizador.
   *   - O mesmo utilizador não pode cadastrar o mesmo número duas vezes.
   *   - O número retornado já está normalizado (espaços e hífens removidos).
   * POST /adicionar-telefone-extra
   */
  adicionarTelefoneExtra: (
    data: { numero_telefone: string },
    token?: string
  ) =>
    api.post<{
      message: string;
      id: string;
      numero_telefone: string;
      verificado: boolean;
    }>(
      '/adicionar-telefone-extra',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// CONSULTAS (rotas autenticadas — qualquer role)
// =====================

export const consultasService = {
  /** GET /consultar-estudante/:codigo */
  estudante: (codigoEstudante: string, token?: string) =>
    api.get<ConsultarEstudanteResponse>(
      `/consultar-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET /consultar-academia/:codigo */
  academia: (codigoAcademia: string, token?: string) =>
    api.get<ConsultarAcademiaResponse>(
      `/consultar-academia/${codigoAcademia}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET /academias */
  listarAcademias: (token?: string) =>
    api.get<ConsultarAcademiasResponse>('/academias', {
      token: token || tokenStorage.get() || undefined,
    }),

  /** GET /estudantes */
  listarEstudantes: (token?: string) =>
    api.get<ConsultarEstudantesResponse>('/estudantes', {
      token: token || tokenStorage.get() || undefined,
    }),

  /** GET /avaliacoes */
  listarAvaliacoes: (token?: string) =>
    api.get<ListarAvaliacoesResponse>('/avaliacoes', {
      token: token || tokenStorage.get() || undefined,
    }),

  /** GET /aprovacoes */
  listarAprovacoes: (token?: string) =>
    api.get<ListarAprovacoesResponse>('/aprovacoes', {
      token: token || tokenStorage.get() || undefined,
    }),

  /** GET /reprovacoes */
  listarReprovacoes: (token?: string) =>
    api.get<ListarReprovacoesResponse>('/reprovacoes', {
      token: token || tokenStorage.get() || undefined,
    }),

  /**
   * Notas de um estudante (requer role academia ou admin)
   * GET /notas-estudante/:codigo
   */
  notasEstudante: (codigoEstudante: string, token?: string) =>
    api.get<NotasEstudanteResponse>(
      `/notas-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Faltas de um estudante (requer role academia ou admin)
   * GET /faltas-estudante/:codigo
   */
  faltasEstudante: (codigoEstudante: string, token?: string) =>
    api.get<FaltasEstudanteResponse>(
      `/faltas-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Avaliações finais de um estudante (requer role academia ou admin)
   * GET /avaliacoes-estudante/:codigo
   */
  avaliacoesEstudante: (codigoEstudante: string, token?: string) =>
    api.get<AvaliacoesEstudanteResponse>(
      `/avaliacoes-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// EVENT SOURCING (rotas autenticadas — qualquer role)
// =====================

export const eventSourcingService = {
  /** GET /eventos-estudante/:codigo */
  eventosEstudante: (codigoEstudante: string, token?: string) =>
    api.get<EventosEstudanteResponse>(
      `/eventos-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET /verificar-integridade/:codigo */
  verificarIntegridade: (codigoEstudante: string, token?: string) =>
    api.get<VerificarIntegridadeResponse>(
      `/verificar-integridade/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// ESTUDANTE (rotas exclusivas — role estudante)
// =====================

export const estudanteService = {
  /** PUT /estudante/dados-pessoais */
  atualizarDadosPessoais: (data: AtualizarDadosPessoaisEstudanteRequest, token?: string) =>
    api.put<{ message: string }>(
      '/estudante/dados-pessoais',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET /estudante/minhas-avaliacoes */
  minhasAvaliacoes: (token?: string) =>
    api.get<AvaliacoesEstudanteResponse>('/estudante/minhas-avaliacoes', {
      token: token || tokenStorage.get() || undefined,
    }),

  /** GET /estudante/minhas-notas */
  minhasNotas: (token?: string) =>
    api.get<NotasEstudanteResponse>('/estudante/minhas-notas', {
      token: token || tokenStorage.get() || undefined,
    }),

  /** GET /estudante/minhas-faltas */
  minhasFaltas: (token?: string) =>
    api.get<FaltasEstudanteResponse>('/estudante/minhas-faltas', {
      token: token || tokenStorage.get() || undefined,
    }),
};

// =====================
// ACADEMIA (rotas exclusivas — role academia)
// =====================

export const academiaService = {
  /** PUT /academia/dados */
  atualizarDados: (data: AtualizarDadosAcademiaRequest, token?: string) =>
    api.put<{ message: string; aviso?: string; email_verificado?: boolean }>(
      '/academia/dados',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Cadastrar estudante já vinculado à academia
   * POST /academia/estudante/register
   */
  cadastrarEstudante: (data: CriarEstudanteRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; codigo_estudante: string; codigo_academia: string; status: string } }>(
      '/academia/estudante/register',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Notas ──────────────────────────────────────────────────────────

  /** POST /academia/notas-aluno */
  registrarNota: (data: RegistrarNotasRequest, token?: string) =>
    api.post<{ message: string; codigo_estudante: string; materia: string; nota: number }>(
      '/academia/notas-aluno',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/atualizar-nota */
  atualizarNota: (data: AtualizarNotaRequest, token?: string) =>
    api.put<{ message: string; codigo_estudante: string }>(
      '/academia/atualizar-nota',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** DELETE /academia/nota/:id */
  deletarNota: (notaId: string, token?: string) =>
    api.delete<{ message: string }>(
      `/academia/nota/${notaId}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Faltas ──────────────────────────────────────────────────────────

  /** POST /academia/faltas-aluno */
  registrarFaltas: (data: RegistrarFaltasRequest, token?: string) =>
    api.post<{ message: string; estudante: string; materia: string; quantidade: number; ano_academico: string }>(
      '/academia/faltas-aluno',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/atualizar-falta */
  atualizarFalta: (data: AtualizarFaltaRequest, token?: string) =>
    api.put<{ message: string; id: string; codigo_estudante: string }>(
      '/academia/atualizar-falta',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** DELETE /academia/falta/:id */
  deletarFalta: (faltaId: string, token?: string) =>
    api.delete<{ message: string }>(
      `/academia/falta/${faltaId}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Aprovação / Avaliação ──────────────────────────────────────────

  /** POST /academia/aprovacao-ano */
  registrarAprovacaoAno: (data: RegistrarAprovacaoAnoRequest, token?: string) =>
    api.post<{
      message: string;
      estudante: string;
      tipo_ensino: string;
      nivel_atual: string;
      proximo_nivel?: string;
      resultado: string;
    }>(
      '/academia/aprovacao-ano',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** POST /academia/avaliacao-final */
  registrarAvaliacaoFinal: (data: RegistrarAvaliacaoFinalRequest, token?: string) =>
    api.post<{
      message: string;
      codigo_estudante: string;
      resultado: string;
      codigo_turma?: string;
      turmas_removidas: string[];
    }>(
      '/academia/avaliacao-final',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Ano letivo ────────────────────────────────────────────────────

  /**
   * Define ou atualiza o ano letivo ativo desta academia.
   * Sem ano letivo ativo, registros de nota/falta/avaliação/aprovação são bloqueados.
   * POST /academia/ano-letivo
   */
  definirAnoLetivo: (data: DefinirAnoLetivoAcademiaRequest, token?: string) =>
    api.post<DefinirAnoLetivoResponse>(
      '/academia/ano-letivo',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Consulta o ano letivo ativo da academia autenticada.
   * GET /academia/ano-letivo
   */
  getAnoLetivo: (token?: string) =>
    api.get<AnoLetivoAcademiaResponse>(
      '/academia/ano-letivo',
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Categorias de nota ────────────────────────────────────────────

  /** POST /academia/categorias-nota */
  criarCategoriaNota: (data: CriarCategoriaNotaRequest, token?: string) =>
    api.post<{ message: string; categoria: string }>(
      '/academia/categorias-nota',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET /academia/categorias-nota */
  listarCategoriasNota: (token?: string) =>
    api.get<ListarCategoriasNotaResponse>(
      '/academia/categorias-nota',
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Status escolar ────────────────────────────────────────────────

  /** PUT /academia/estudante/:codigo/status-escolar-fundamental */
  atualizarStatusEscolarFundamental: (codigoEstudante: string, data: AtualizarStatusRequest, token?: string) =>
    api.put<AtualizarStatusResponse>(
      `/academia/estudante/${codigoEstudante}/status-escolar-fundamental`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/estudante/:codigo/status-escolar-medio */
  atualizarStatusEscolarMedio: (codigoEstudante: string, data: AtualizarStatusRequest, token?: string) =>
    api.put<AtualizarStatusResponse>(
      `/academia/estudante/${codigoEstudante}/status-escolar-medio`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/estudante/:codigo/status-superior */
  atualizarStatusSuperior: (codigoEstudante: string, data: AtualizarStatusRequest, token?: string) =>
    api.put<AtualizarStatusResponse>(
      `/academia/estudante/${codigoEstudante}/status-superior`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Cursos ────────────────────────────────────────────────────────

  /** POST /academia/curso */
  criarCurso: (data: CriarCursoRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; nome: string; type: string; periodos?: string[] } }>(
      '/academia/curso',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET /academia/cursos */
  listarCursos: (token?: string) =>
    api.get<ListarCursosResponse>('/academia/cursos', {
      token: token || tokenStorage.get() || undefined,
    }),

  /** GET /academia/curso/:id */
  getCurso: (cursoId: string, token?: string) =>
    api.get<Curso>(
      `/academia/curso/${cursoId}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/curso/:id/ativar */
  ativarCurso: (cursoId: string, token?: string) =>
    api.put<{ message: string }>(
      `/academia/curso/${cursoId}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/curso/:id/desativar */
  desativarCurso: (cursoId: string, token?: string) =>
    api.put<{ message: string }>(
      `/academia/curso/${cursoId}/desativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/curso/:id/dados */
  atualizarCurso: (cursoId: string, data: AtualizarCursoRequest, token?: string) =>
    api.put<{ message: string }>(
      `/academia/curso/${cursoId}/dados`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** DELETE /academia/curso/:id */
  deletarCurso: (cursoId: string, token?: string) =>
    api.delete<DeletarCursoResponse>(
      `/academia/curso/${cursoId}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Matérias ────────────────────────────────────────────────────────

  /** POST /academia/materia */
  criarMateria: (data: CriarMateriaRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; nome: string } }>(
      '/academia/materia',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET /academia/materias */
  listarMaterias: (token?: string) =>
    api.get<ListarMateriasResponse>('/academia/materias', {
      token: token || tokenStorage.get() || undefined,
    }),

  /** GET /academia/materia/:id */
  getMateria: (materiaId: string, token?: string) =>
    api.get<Materia>(
      `/academia/materia/${materiaId}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/materia/:id/ativar */
  ativarMateria: (materiaId: string, token?: string) =>
    api.put<{ message: string }>(
      `/academia/materia/${materiaId}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/materia/:id/desativar */
  desativarMateria: (materiaId: string, token?: string) =>
    api.put<{ message: string }>(
      `/academia/materia/${materiaId}/desativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/materia/:id/periodo */
  definirPeriodoMateria: (materiaId: string, data: DefinirPeriodoMateriaRequest, token?: string) =>
    api.put<{ message: string }>(
      `/academia/materia/${materiaId}/periodo`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/materia/:id/dados */
  atualizarMateria: (materiaId: string, data: AtualizarMateriaRequest, token?: string) =>
    api.put<{ message: string }>(
      `/academia/materia/${materiaId}/dados`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** DELETE /academia/materia/:id */
  deletarMateria: (materiaId: string, token?: string) =>
    api.delete<{ message: string }>(
      `/academia/materia/${materiaId}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Turmas ────────────────────────────────────────────────────────

  /** POST /academia/turma */
  criarTurma: (data: CriarTurmaRequest, token?: string) =>
    api.post<{ message: string; data: { codigo_turma: string } }>(
      '/academia/turma',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET /academia/turmas */
  listarTurmas: (token?: string) =>
    api.get<ListarTurmasResponse>('/academia/turmas', {
      token: token || tokenStorage.get() || undefined,
    }),

  /** GET /academia/turma/:codigo */
  getTurma: (codigoTurma: string, token?: string) =>
    api.get<Turma>(
      `/academia/turma/${codigoTurma}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/turma/:codigo/ativar */
  ativarTurma: (codigoTurma: string, token?: string) =>
    api.put<{ message: string; codigo_turma: string }>(
      `/academia/turma/${codigoTurma}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/turma/:codigo/desativar */
  desativarTurma: (codigoTurma: string, token?: string) =>
    api.put<{ message: string; codigo_turma: string }>(
      `/academia/turma/${codigoTurma}/desativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** PUT /academia/turma/:codigo/dados */
  atualizarTurma: (codigoTurma: string, data: AtualizarTurmaRequest, token?: string) =>
    api.put<{ message: string }>(
      `/academia/turma/${codigoTurma}/dados`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** DELETE /academia/turma/:codigo */
  deletarTurma: (codigoTurma: string, token?: string) =>
    api.delete<DeletarTurmaResponse>(
      `/academia/turma/${codigoTurma}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** POST /academia/turma/:codigo/estudante */
  adicionarEstudanteATurma: (codigoTurma: string, data: AdicionarEstudanteTurmaRequest, token?: string) =>
    api.post<{ message: string; codigo_turma: string; codigo_estudante: string }>(
      `/academia/turma/${codigoTurma}/estudante`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /** DELETE /academia/turma/:codigo/estudantes/:codigo_estudante */
  removerEstudanteDaTurma: (codigoTurma: string, codigoEstudante: string, token?: string) =>
    api.delete<{ message: string; codigo_turma: string; codigo_estudante: string }>(
      `/academia/turma/${codigoTurma}/estudantes/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// ADMIN — grupo /dominis (rotas exclusivas — role admin)
// =====================

export const adminService = {
  /**
   * Criar novo admin
   * POST /dominis/register
   */
  criarAdmin: (data: CriarAdminRequest, token?: string) =>
    api.post<{ message: string; data: AdminDetalhado; aviso?: string }>(
      '/dominis/register',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Registrar nova academia
   * POST /dominis/academia/register
   */
  registrarAcademia: (data: CriarEscolaRequest | CriarUniversidadeRequest, token?: string) =>
    api.post<{ message: string; data: { codigo_academia: string; id: string } }>(
      '/dominis/academia/register',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Ativar academia (requer role adm)
   * PUT /dominis/academia/:codigo/ativar
   */
  ativarAcademia: (codigoAcademia: string, token?: string) =>
    api.put<{ message: string }>(
      `/dominis/academia/${codigoAcademia}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Desativar academia (requer role adm)
   * PUT /dominis/academia/:codigo/desativar
   */
  desativarAcademia: (codigoAcademia: string, data: DesativarRequest, token?: string) =>
    api.put<{ message: string }>(
      `/dominis/academia/${codigoAcademia}/desativar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Ativar admin (requer role adm)
   * PUT /dominis/admin/:id/ativar
   */
  ativarAdmin: (adminId: string, token?: string) =>
    api.put<{ message: string }>(
      `/dominis/admin/${adminId}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Desativar admin (requer role adm)
   * PUT /dominis/admin/:id/desativar
   */
  desativarAdmin: (adminId: string, token?: string) =>
    api.put<{ message: string }>(
      `/dominis/admin/${adminId}/desativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Listar todos os admins
   * GET /dominis/admin-lista
   */
  listarAdmins: (token?: string) =>
    api.get<ListarAdminsResponse>('/dominis/admin-lista', {
      token: token || tokenStorage.get() || undefined,
    }),

  /**
   * Métricas do sistema
   * GET /dominis/metrics
   */
  getMetrics: (token?: string) =>
    api.get<{ metrics: Record<string, unknown> }>('/dominis/metrics', {
      token: token || tokenStorage.get() || undefined,
    }),

  /**
   * Rebuild de projeção individual (requer role FPP)
   * POST /dominis/projections/rebuild/:name
   */
  rebuildProjection: (name: string, token?: string) =>
    api.post<{ message: string }>(
      `/dominis/projections/rebuild/${name}`,
      {},
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Consultar admin por email
   * GET /dominis/consultar-admin/:email
   */
  consultarAdminPorEmail: (email: string, token?: string) =>
    api.get<AdminDetalhado>(
      `/dominis/consultar-admin/${encodeURIComponent(email)}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Listar todos os registros (notas + faltas)
   * GET /dominis/registros
   */
  listarTodosRegistros: (params?: { limit?: number; offset?: number; tipo?: string; token?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit)  qs.append('limit',  params.limit.toString());
    if (params?.offset) qs.append('offset', params.offset.toString());
    if (params?.tipo)   qs.append('tipo',   params.tipo);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<RegistroCompleto>(`/dominis/registros${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  /**
   * Listar registros de um estudante específico
   * GET /dominis/registros/:codigo
   */
  registrosPorEstudante: (codigoEstudante: string, params?: { limit?: number; offset?: number; token?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit)  qs.append('limit',  params.limit.toString());
    if (params?.offset) qs.append('offset', params.offset.toString());
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<RegistroCompleto>(`/dominis/registros/${codigoEstudante}${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  /**
   * Atualizar role do admin (requer role FPP)
   * PUT /dominis/admin/:id/role
   */
  atualizarRoleAdmin: (adminId: string, data: AtualizarRoleAdminRequest, token?: string) =>
    api.put<{ message: string }>(
      `/dominis/admin/${adminId}/role`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * Atualizar dados do admin
   * PUT /dominis/admin/:id/dados
   */
  atualizarDadosAdmin: (adminId: string, data: AtualizarDadosAdminRequest, token?: string) =>
    api.put<{ message: string }>(
      `/dominis/admin/${adminId}/dados`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
};