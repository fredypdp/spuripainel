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
  RegistrarAprovacaoAnoRequest,
  RegistrarAvaliacaoFinalRequest,
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
  ListarTurmasResponse,
  CriarTurmaRequest,
  AtualizarTurmaRequest,
  AdicionarEstudanteTurmaRequest,
  // 🔥 NOVO
  ListarAvaliacoesResponse,
  AvaliacoesEstudanteResponse,
  ListarAprovacoesResponse,
  ListarReprovacoesResponse,
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

  /**
   * 🔥 NOVO: Registrar avaliação final anual do estudante (aprovação/reprovação)
   * POST /academia/avaliacao-final
   *
   * Inclui validação de notas obrigatórias, validação de níveis, remoção de turmas
   * e geração do evento AprovacaoAnoRegistrada.
   */
  registrarAvaliacaoFinal: (data: RegistrarAvaliacaoFinalRequest, token?: string) =>
    api.post<{
      message: string;
      codigo_estudante: string;
      resultado: string; // "reprovado" | "aprovado → <nivel>" | "aprovado (ciclo finalizado)"
      codigo_turma?: string;
      turmas_removidas: string[];
    }>(
      '/academia/avaliacao-final',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * @deprecated Use registrarAvaliacaoFinal (POST /academia/avaliacao-final)
   * Mantido para compatibilidade com código existente
   */
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
    api.post<{ message: string; data: { id: string; nome: string; type: string; periodos?: string[] } }>(
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

  atualizarMateria: (materiaId: string, data: AtualizarMateriaRequest, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/materias/${materiaId}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarMateria: (materiaId: string, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/materias/${materiaId}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarMateria: (materiaId: string, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/materias/${materiaId}/desativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  // Turmas
  criarTurma: (data: CriarTurmaRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; codigo_turma: string } }>(
      '/academia/turmas',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarTurmas: (token?: string) =>
    api.get<ListarTurmasResponse>(
      '/academia/turmas',
      { token: token || tokenStorage.get() || undefined }
    ),

  getTurma: (codigoTurma: string, token?: string) =>
    api.get<{ turma: import('@/types/api').Turma }>(
      `/academia/turmas/${codigoTurma}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarTurma: (codigoTurma: string, data: AtualizarTurmaRequest, token?: string) =>
    api.put<{ message: string }>(
      `/academia/turmas/${codigoTurma}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  adicionarEstudanteATurma: (codigoTurma: string, data: AdicionarEstudanteTurmaRequest, token?: string) =>
    api.post<{ message: string }>(
      `/academia/turmas/${codigoTurma}/estudantes`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  removerEstudanteDaTurma: (codigoTurma: string, codigoEstudante: string, token?: string) =>
    api.delete<{ message: string }>(
      `/academia/turmas/${codigoTurma}/estudantes/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  alterarCursoEstudante: (codigoEstudante: string, data: AlterarCursoRequest, token?: string) =>
    api.put<AlterarCursoResponse>(
      `/academia/estudante/${codigoEstudante}/curso`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

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
    api.post<{ message: string; inscricao_id: string }>(
      '/estudante/inscricao-escola',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  solicitarInscricaoUniversidade: (data: SolicitarInscricaoUniversidadeRequest, token?: string) =>
    api.post<{ message: string; inscricao_id: string }>(
      '/estudante/inscricao-universidade',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  vincularAcademia: (data: VincularAcademiaRequest, token?: string) =>
    api.post<VincularAcademiaResponse>(
      '/estudante/vincular-academia',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarInscricoesAprovadas: (token?: string) =>
    api.get<ListarInscricoesAprovadasResponse>('/estudante/inscricoes-aprovadas', {
      token: token || tokenStorage.get() || undefined,
    }),

  atualizarStatusEscolarFundamental: (data: AtualizarStatusRequest, token?: string) =>
    api.put<AtualizarStatusResponse>(
      '/estudante/status-escolar-fundamental',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarStatusEscolarMedio: (data: AtualizarStatusRequest, token?: string) =>
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
   * 🔥 NOVO: Avaliações finais do próprio estudante
   * GET /estudante/minhas-avaliacoes
   */
  minhasAvaliacoes: (token?: string) =>
    api.get<ListarAvaliacoesResponse>('/estudante/minhas-avaliacoes', {
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

  /**
   * 🔥 NOVO: Listar avaliações finais (resolve por tipo de utilizador)
   * GET /avaliacoes?tipo_ensino=fundamental|medio|superior
   * Estudante → suas avaliações
   * Academia  → todas da academia
   * Admin     → todas do sistema
   */
  listarAvaliacoes: (params?: { tipoEnsino?: string; token?: string }) => {
    const qs = new URLSearchParams();
    if (params?.tipoEnsino) qs.append('tipo_ensino', params.tipoEnsino);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarAvaliacoesResponse>(`/avaliacoes${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  /**
   * 🔥 NOVO: Avaliações finais de um estudante específico
   * GET /avaliacoes-estudante/:codigo
   * Acesso: academia (verifica pertença) e admin
   */
  avaliacoesEstudante: (codigoEstudante: string, token?: string) =>
    api.get<AvaliacoesEstudanteResponse>(
      `/avaliacoes-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * 🔥 NOVO: Listar aprovações (resolve por tipo de utilizador)
   * GET /aprovacoes
   * Estudante → suas aprovações
   * Academia  → aprovações dos estudantes da academia
   * Admin     → todas do sistema
   */
  listarAprovacoes: (token?: string) =>
    api.get<ListarAprovacoesResponse>('/aprovacoes', {
      token: token || tokenStorage.get() || undefined,
    }),

  /**
   * 🔥 NOVO: Listar reprovações (resolve por tipo de utilizador)
   * GET /reprovacoes
   * Estudante → suas reprovações
   * Academia  → reprovações dos estudantes da academia
   * Admin     → todas do sistema
   */
  listarReprovacoes: (token?: string) =>
    api.get<ListarReprovacoesResponse>('/reprovacoes', {
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

  listarAdmins: (token?: string) =>
    api.get<ListarAdminsResponse>('/admin/listar-admins', {
      token: token || tokenStorage.get() || undefined,
    }),

  criarAdmin: (data: CriarAdminRequest, token?: string) =>
    api.post<{ message: string; data: AdminDetalhado }>(
      '/admin/criar-admin',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarEstudante: (codigoEstudante: string, data: DesativarRequest, token?: string) =>
    api.put<{ message: string }>(
      `/admin/estudante/${codigoEstudante}/desativar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarAcademia: (codigoAcademia: string, data: DesativarRequest, token?: string) =>
    api.put<{ message: string }>(
      `/admin/academia/${codigoAcademia}/desativar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarEstudante: (codigoEstudante: string, token?: string) =>
    api.put<{ message: string }>(
      `/admin/estudante/${codigoEstudante}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarAcademia: (codigoAcademia: string, token?: string) =>
    api.put<{ message: string }>(
      `/admin/academia/${codigoAcademia}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarDadosAdmin: (data: AtualizarDadosAdminRequest, token?: string) =>
    api.put<{ message: string }>(
      '/admin/dados',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarRoleAdmin: (adminId: string, data: AtualizarRoleAdminRequest, token?: string) =>
    api.put<{ message: string }>(
      `/admin/${adminId}/role`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarTodosRegistros: (params?: { limit?: number; offset?: number; token?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit)  qs.append('limit',  params.limit.toString());
    if (params?.offset) qs.append('offset', params.offset.toString());
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<RegistroCompleto>(`/admin/todos-registros${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  registrosPorEstudante: (codigoEstudante: string, token?: string) =>
    api.get<RegistrosPorEstudanteResponse>(
      `/admin/registros/estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  registrosPorAcademia: (codigoAcademia: string, token?: string) =>
    api.get<RegistrosPorAcademiaResponse>(
      `/admin/registros/academia/${codigoAcademia}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  definirAnoLetivo: (data: DefinirAnoLetivoRequest, token?: string) =>
    api.post<DefinirAnoLetivoResponse>(
      '/admin/ano-letivo',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// PERFIL
// =====================

export const perfilService = {
  meuPerfil: (token?: string) =>
    api.get<MeuPerfilResponse>('/meu-perfil', {
      token: token || tokenStorage.get() || undefined,
    }),

  alterarSenha: (data: AlterarSenhaRequest, token?: string) =>
    api.put<{ message: string }>(
      '/alterar-senha',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// Re-export AdminDetalhado for use in admin service (avoids circular import)
import type { AdminDetalhado } from '@/types/api';