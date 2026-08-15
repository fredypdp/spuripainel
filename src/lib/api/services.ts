// src/lib/api/services.ts
// Rotas alinhadas à documentação da API em src/docs/Documentação.md — versão 2.1.1

import { api, fetchApiBlob, tokenStorage } from './client';
import type { AsyncBatchResponse } from '@/lib/api/job-service';
import type {
  AuthResponse,
  CriarEscolaRequest,
  CriarUniversidadeRequest,
  CadastroAcademiaPublicaRequest,
  CadastroAcademiaPublicaResponse,
  LoginRequest,
  CriarEstudanteRequest,
  RegistrarNotasRequest,
  RegistrarNotaResponse,
  CorrigirNotaRequest,
  CorrigirNotaResponse,
  CriarRegraAvaliacaoFinalRequest,
  CriarRegraAvaliacaoFinalResponse,
  EditarRegraAvaliacaoFinalRequest,
  ListarRegrasAvaliacaoFinalResponse,
  RegistrarFaltasRequest,
  CorrigirFaltaRequest,
  CorrigirFaltaResponse,
  CriarAdminRequest,
  DesativarRequest,
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
  EventoAuditoriaResponse,
  VerificarIntegridadeResponse,
  CriarCursoRequest,
  AtualizarCursoRequest,
  CriarMateriaRequest,
  AtualizarMateriaRequest,
  ListarCursosResponse,
  ListarMateriasResponse,
  AtualizarDadosPessoaisEstudanteRequest,
  AtualizarTelefoneEncarregadoEstudanteRequest,
  CriarSolicitacaoEdicaoDadoEstudanteRequest,
  CriarSolicitacaoEdicaoDadoEstudanteResponse,
  CampoEdicaoDadoEstudante,
  ListarSolicitacoesEdicaoDadoEstudanteParams,
  ListarSolicitacoesEdicaoDadoEstudanteResponse,
  DecidirSolicitacaoEdicaoDadoEstudanteResponse,
  ReprovarSolicitacaoEdicaoDadoEstudanteRequest,
  AtualizarEmailUsuarioRequest,
  AtualizarTelefoneUsuarioRequest,
  AtualizarDadosAcademiaRequest,
  AtualizarDadosAdminRequest,
  AtualizarRoleAdminRequest,
  ListarAdminsResponse,
  DefinirAnoLetivoAcademiaRequest,
  DefinirAnoLetivoGlobalRequest,
  AnoLetivoAcademiaResponse,
  ListarAnosLetivosAcademiaResponse,
  DefinirAnoLetivoResponse,
  DefinirAnoLetivoGlobalResponse,
  AnoLetivoGlobalResponse,
  ListarAnosLetivosGlobalResponse,
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
  DeletarTurmaResponse,
  DeletarCursoResponse,
  TurmasEstudanteResponse,
  Turma,
  AdminDetalhado,
  Curso,
  Materia,
  ListarNotasResponse,
  ListarFaltasResponse,
  // Novos tipos de params de filtro
  ListarNotasParams,
  ListarFaltasParams,
  ListarAvaliacoesParams,
  ListarAprovacoesParams,
  ListarReprovacoesParams,
  MotivoEstudanteRequest,
  RevincularEstudanteRequest,
  MensagemResponse,
  CriarSolicitacaoStatusAcademicoRequest,
  CriarSolicitacaoRevinculacaoRequest,
  CriarSolicitacaoStatusAcademicoResponse,
  ListarSolicitacoesStatusAcademicoParams,
  ListarSolicitacoesStatusAcademicoResponse,
  DecidirSolicitacaoStatusAcademicoRequest,
  ReprovarSolicitacaoStatusAcademicoRequest,
  DecidirSolicitacaoStatusAcademicoResponse,
  CriarSolicitacaoMatriculaRequest,
  CriarSolicitacaoMatriculaResponse,
  ListarSolicitacoesMatriculaParams,
  ListarSolicitacoesMatriculaResponse,
  SolicitacaoMatricula,
  AprovarSolicitacaoMatriculaResponse,
  ReprovarSolicitacaoMatriculaRequest,
  StorageQuotaResponse,
  ListarConfiguracoesAnoLetivoResponse,
  AtualizarConfiguracaoAnoLetivoRequest,
  AtualizarConfiguracaoAnoLetivoResponse,
  FinalizarAnoLetivoRequest,
  FinalizarAnoLetivoResponse,
  ListarFinalizacoesAnoLetivoResponse,
  ListarLimitesFinalizacaoAnoLetivoResponse,
  AnoLetivoTipo,
  GerirAnosAcademicosRequest,
  GerirAnosAcademicosResponse,
  ListarAnosAcademicosResponse,
  FinanceiroCredencial,
  CriarFinanceiroCredencialRequest,
  AtualizarFinanceiroCredencialRequest,
  ListarFinanceiroCredenciaisParams,
  ListarFinanceiroCredenciaisResponse,
} from '@/types/api';

const API_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const GET_PAGE_LIMIT_MAX = 100;

function appendPageParams(qs: URLSearchParams, params?: { limit?: number; offset?: number }) {
  if (params?.limit !== undefined) qs.append('limit', String(Math.min(Math.max(1, params.limit), GET_PAGE_LIMIT_MAX)));
  if (params?.offset !== undefined) qs.append('offset', String(Math.max(0, params.offset)));
}

function hasExplicitPagination(params?: { limit?: number; offset?: number } | null): boolean {
  return params?.limit !== undefined || params?.offset !== undefined;
}

async function getAllPaginated<T extends object>(
  makeRequest: (limit: number, offset: number) => Promise<T>,
  collectionKey: keyof T,
): Promise<T> {
  const limit = GET_PAGE_LIMIT_MAX;
  let offset = 0;
  let merged: T | undefined;
  let allItems: unknown[] = [];

  while (true) {
    const page = await makeRequest(limit, offset);
    const rawItems = (page as Record<string, unknown>)[collectionKey as string];
    const items = Array.isArray(rawItems) ? rawItems : [];

    if (!merged) merged = { ...page };
    allItems = allItems.concat(items);

    const totalGeralValue = (page as Record<string, unknown>).total_geral;
    const totalGeral = typeof totalGeralValue === 'number' ? totalGeralValue : undefined;
    const nextOffset = offset + limit;
    const reachedKnownTotal = totalGeral !== undefined && allItems.length >= totalGeral;
    const reachedShortPage = items.length < limit;

    if (reachedKnownTotal || reachedShortPage || items.length === 0) {
      break;
    }

    offset = nextOffset;
  }

  if (!merged) {
    throw new Error('Resposta paginada inválida.');
  }

  return {
    ...merged,
    [collectionKey]: allItems,
    total: allItems.length,
    total_geral: typeof (merged as Record<string, unknown>).total_geral === 'number' ? (merged as Record<string, unknown>).total_geral : allItems.length,
    limit,
    offset: 0,
  } as T;
}

const ACADEMIA_ANO_LETIVO_ENDPOINT = '/academia/ano-letivo';
const ACADEMIA_DEFINIR_ANO_LETIVO_ENDPOINT = '/academia/definir-ano-letivo';
const ADMIN_SISTEMA_ANO_LETIVO_ENDPOINT = '/admin/definir-ano-letivo-geral';
const GLOBAL_ANO_LETIVO_ENDPOINT = '/ano-letivo';
const GLOBAL_ANOS_LETIVOS_LISTA_ENDPOINT = '/anos-letivos-lista';
const ANOS_LETIVOS_CONFIGURACOES_ENDPOINT = '/anos-letivos/configuracoes';
const ADMIN_ANOS_LETIVOS_CONFIGURACOES_ENDPOINT = '/admin/sistema/anos-letivos/configuracoes';

function buildSolicitacoesStatusAcademicoQuery(params?: ListarSolicitacoesStatusAcademicoParams): string {
  const qs = new URLSearchParams();
  const appendMany = (key: string, value?: string | string[]) => {
    if (!value) return;
    if (Array.isArray(value)) value.forEach((item) => qs.append(key, item));
    else qs.append(key, value);
  };
  appendMany('status', params?.status);
  appendMany('tipo', params?.tipo);
  if (params?.codigo_academia) qs.append('codigo_academia', params.codigo_academia);
  if (params?.codigo_estudante) qs.append('codigo_estudante', params.codigo_estudante);
  appendPageParams(qs, params);
  const query = qs.toString();
  return query ? `?${query}` : '';
}

function ensureApiDate(value: string | undefined, fieldName: string): string | undefined {
  if (!value) return value;
  const normalized = value.trim();
  if (!API_DATE_REGEX.test(normalized)) {
    throw new Error(`${fieldName} deve estar no formato AAAA-MM-DD`);
  }
  return normalized;
}

function ensureQuantidadePositiva(value: number | undefined, fieldName: string): number | undefined {
  if (value === undefined) return value;
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${fieldName} deve ser maior ou igual a 1`);
  }
  return value;
}

function prepareRegistrarFalta(data: RegistrarFaltasRequest): RegistrarFaltasRequest {
  return {
    ...data,
    codigo_estudante: data.codigo_estudante?.trim(),
    materia_disciplinar_id: data.materia_disciplinar_id?.trim(),
    data: ensureApiDate(data.data, 'Data da falta')!,
    quantidade: ensureQuantidadePositiva(data.quantidade, 'Quantidade')!,
    observacao: data.observacao?.trim() || undefined,
  };
}

function appendMultiValueParam(qs: URLSearchParams, key: string, value?: string | string[]) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.filter(Boolean).forEach((item) => qs.append(key, item));
    return;
  }
  qs.append(key, value);
}

function ensureAnoLetivoFormato(anoLetivo: string): string {
  const normalized = anoLetivo?.trim();
  const match = normalized?.match(/^(\d{4})_(\d{4})$/);
  if (!match) {
    throw new Error('Ano letivo deve estar no formato AAAA_AAAA');
  }
  const anoInicio = Number(match[1]);
  const anoFim = Number(match[2]);
  if (anoFim !== anoInicio + 1) {
    throw new Error('Ano letivo inválido: o segundo ano deve ser exatamente o primeiro + 1');
  }
  return normalized;
}

function normalizarBilheteIdentidade(value?: string): string | undefined {
  return value?.trim() || undefined;
}

function ensureBilhetesDiferentes(
  bilheteIdentidade?: string,
  bilheteIdentidadeEncarregado?: string
): void {
  if (
    bilheteIdentidade &&
    bilheteIdentidadeEncarregado &&
    bilheteIdentidade.trim().toLowerCase() === bilheteIdentidadeEncarregado.trim().toLowerCase()
  ) {
    throw new Error('O BI do estudante não pode ser igual ao BI do encarregado de educação');
  }
}

function prepareCriarEstudante(data: CriarEstudanteRequest): CriarEstudanteRequest {
  const bilheteIdentidade = normalizarBilheteIdentidade(data.bilhete_identidade);
  const bilheteIdentidadeEncarregado = normalizarBilheteIdentidade(data.bilhete_identidade_encarregado);
  ensureBilhetesDiferentes(bilheteIdentidade, bilheteIdentidadeEncarregado);

  const payload: CriarEstudanteRequest = {
    nome: data.nome?.trim(),
    genero: data.genero,
    data_nascimento: ensureApiDate(data.data_nascimento, 'Data de nascimento')!,
    email: data.email?.trim() || undefined,
    telefone: data.telefone?.trim() || undefined,
    telefone_encarregado: data.telefone_encarregado?.trim() || undefined,
    bilhete_identidade: bilheteIdentidade,
    bilhete_identidade_encarregado: bilheteIdentidadeEncarregado,
    ano_escolar_fundamental: data.ano_escolar_fundamental ?? null,
    ano_escolar_medio: data.ano_escolar_medio ?? null,
    curso_medio_id: data.curso_medio_id ?? null,
    ano_superior: data.ano_superior ?? null,
    curso_superior_id: data.curso_superior_id ?? null,
    codigo_turma: data.codigo_turma?.trim() || undefined,
    declaracao_ano_academico: data.declaracao_ano_academico?.trim() || undefined,
  };

  return payload;
}

function prepareCriarEstudanteForm(data: CriarEstudanteRequest): FormData {
  const payload = prepareCriarEstudante(data);
  const form = new FormData();
  const entries = Object.entries({ ...payload,
    bi_estudante: data.bi_estudante,
    bi_encarregado: data.bi_encarregado,
    cedula_estudante: data.cedula_estudante,
    declaracao: data.declaracao,
    certificado_6_ano_fundamental: data.certificado_6_ano_fundamental,
    certificado_9_ano_fundamental: data.certificado_9_ano_fundamental,
    certificado_ensino_medio: data.certificado_ensino_medio,
  });
  entries.forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (value instanceof File) form.append(key, value);
    else form.append(key, String(value).trim());
  });
  return form;
}

function prepareMotivoEstudante(data: MotivoEstudanteRequest): MotivoEstudanteRequest {
  const motivo = data.motivo?.trim();
  if (!motivo) throw new Error('Motivo é obrigatório');
  return { motivo };
}

function buildSolicitacoesMatriculaQuery(params?: ListarSolicitacoesMatriculaParams): string {
  const qs = new URLSearchParams();
  const statuses = Array.isArray(params?.status) ? params?.status : params?.status ? [params.status] : [];
  statuses.forEach((status) => qs.append('status', status));
  if (params?.codigo_academia) appendMultiValueParam(qs, 'codigo_academia', params.codigo_academia);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const query = qs.toString();
  return query ? `?${query}` : '';
}

function prepareAtualizarDadosPessoaisEstudante(
  data: AtualizarDadosPessoaisEstudanteRequest
): AtualizarDadosPessoaisEstudanteRequest {
  const bilheteIdentidade = normalizarBilheteIdentidade(data.bilhete_identidade);
  const bilheteIdentidadeEncarregado = normalizarBilheteIdentidade(data.bilhete_identidade_encarregado);
  ensureBilhetesDiferentes(bilheteIdentidade, bilheteIdentidadeEncarregado);

  return {
    ...data,
    nome: data.nome?.trim() || undefined,
    telefone_encarregado: data.telefone_encarregado?.trim() || undefined,
    bilhete_identidade: bilheteIdentidade,
    bilhete_identidade_encarregado: bilheteIdentidadeEncarregado,
    data_nascimento: ensureApiDate(data.data_nascimento, 'Data de nascimento'),
  };
}


function prepareAtualizarTelefoneEncarregadoEstudante(
  data: AtualizarTelefoneEncarregadoEstudanteRequest
): AtualizarTelefoneEncarregadoEstudanteRequest {
  const telefone = data.telefone_encarregado?.trim();
  if (!/^\d{9}$/.test(telefone || '')) {
    throw new Error('Telefone do encarregado deve conter exatamente 9 dígitos.');
  }
  return { telefone_encarregado: telefone };
}

function prepareSolicitacaoEdicaoDadoEstudanteForm(
  data: CriarSolicitacaoEdicaoDadoEstudanteRequest
): FormData {
  const novoValor = data.novo_valor?.trim();
  if (!novoValor) throw new Error('Novo valor é obrigatório.');
  if (!data.documento) throw new Error('Documento comprovativo em PDF é obrigatório.');

  const form = new FormData();
  form.append('novo_valor', novoValor);
  form.append('documento', data.documento);
  return form;
}

function buildSolicitacoesEdicaoDadoEstudanteQuery(params?: ListarSolicitacoesEdicaoDadoEstudanteParams): string {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.campo) qs.set('campo', params.campo);
  if (params?.codigo_estudante) qs.set('codigo_estudante', params.codigo_estudante);
  appendPageParams(qs, params);
  const query = qs.toString();
  return query ? `?${query}` : '';
}

function prepareSolicitacaoMatriculaForm(data: CriarSolicitacaoMatriculaRequest): FormData {
  const bilheteIdentidade = normalizarBilheteIdentidade(data.bilhete_identidade);
  const bilheteIdentidadeEncarregado = normalizarBilheteIdentidade(data.bilhete_identidade_encarregado);
  ensureBilhetesDiferentes(bilheteIdentidade, bilheteIdentidadeEncarregado);

  const form = new FormData();
  const entries: Array<[keyof CriarSolicitacaoMatriculaRequest, unknown]> = Object.entries({
    ...data,
    bilhete_identidade: bilheteIdentidade,
    bilhete_identidade_encarregado: bilheteIdentidadeEncarregado,
  }) as any;
  entries.forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (value instanceof File) {
      form.append(key, value);
    } else {
      form.append(key, String(value).trim());
    }
  });
  return form;
}

// =====================
// SOLICITAÇÃO DE MATRÍCULA (pública)
// =====================

export const solicitacaoMatriculaService = {
  criar: (data: CriarSolicitacaoMatriculaRequest) =>
    api.postForm<CriarSolicitacaoMatriculaResponse>(
      '/solicitacao-matricula',
      prepareSolicitacaoMatriculaForm(data)
    ),
};

// =====================
// CADASTRO PÚBLICO DE ACADEMIA (rota pública, sem token)
// =====================

export const academiaPublicaService = {
  cadastrar: (data: CadastroAcademiaPublicaRequest) => {
    const senha = data.senha.trim();
    if (!senha) throw new Error('A senha é obrigatória para o cadastro público de academia.');

    const formData = new FormData();

    Object.entries({ ...data, senha }).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (typeof File !== 'undefined' && value instanceof File) {
        formData.append(key, value);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => formData.append(key, String(item)));
        return;
      }

      formData.append(key, String(value));
    });

    // Rota pública — nenhum token é enviado, igual a solicitacaoMatriculaService.criar.
    return api.postForm<CadastroAcademiaPublicaResponse>('/academia/registo-publico', formData);
  },
};

// =====================
// AUTH (rotas públicas)
// =====================

export const authService = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/login', data),

  /**
   * POST /logout
   * Encerra a sessão do usuário autenticado.
   * Como o JWT é stateless, a invalidação real depende do cliente
   * remover o token localmente após esta chamada.
   */
  logout: (token?: string) =>
    api.post<{ message: string }>(
      '/logout',
      {},
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// EMAIL
// =====================

export const emailService = {
  verificarEmail: (token: string) =>
    api.post<{ message: string }>(`/email/verificar-email/${token}`, {}),

  solicitarVerificacaoEmail: (data: { email: string }) =>
    api.post<{ message: string }>('/email/verificar-email/solicitar', data),

  solicitarRecuperacaoSenha: (data: SolicitarRecuperacaoRequest) =>
    api.post<{ message: string }>('/email/recuperar-senha/solicitar', data),

  resetarSenha: (token: string, data: { nova_senha: string }) =>
    api.post<{ message: string }>(`/email/recuperar-senha/${token}`, data),

  gerarTokenVerificacao: (data: { email: string }) =>
    api.post<{ message: string }>('/email/gerar-token/verificacao', data),

  gerarTokenRecuperacao: (data: { email: string }) =>
    api.post<{ message: string }>('/email/gerar-token/recuperacao', data),
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

  atualizarEmail: (data: AtualizarEmailUsuarioRequest, token?: string) =>
    api.put<{ message: string; email?: string; email_verificado?: boolean }>(
      '/me/email',
      { email: data.email.trim() },
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarTelefone: (data: AtualizarTelefoneUsuarioRequest, token?: string) =>
    api.put<{ message: string; telefone?: string; telefone_verificado?: boolean }>(
      '/me/telefone',
      { telefone: data.telefone.trim() },
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// CONSULTAS
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

  listarAcademias: (params?: { limit?: number; offset?: number; status?: 'ativo' | 'inativo'; token?: string }): Promise<ConsultarAcademiasResponse & { limit?: number; offset?: number }> => {
    if (!hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => consultasService.listarAcademias({ ...params, limit, offset }), 'academias');
    }
    const qs = new URLSearchParams();
    appendPageParams(qs, params);
    if (params?.status) qs.append('status', params.status);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ConsultarAcademiasResponse & { limit: number; offset: number }>(`/academias${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  listarEstudantes: (params?: {
    token?: string;
    limit?: number;
    offset?: number;
    genero?: string | string[];
    idade_min?: number;
    idade_max?: number;
    ano_escolar_fundamental?: string | string[];
    ano_escolar_medio?: string | string[];
    ano_superior?: string | string[];
    semestre_atual?: number | string | Array<number | string>;
    curso_id?: string | string[];
    curso?: string | string[];
    codigo_academia?: string | string[];
    status_escolar_fundamental?: string | string[];
    status_escolar_medio?: string | string[];
    status_superior?: string | string[];
    status?: string | string[];
    turno?: string | string[];
    codigo_turma?: string | string[];
    com_turma?: boolean;
  }): Promise<ConsultarEstudantesResponse> => {
    if (!hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => consultasService.listarEstudantes({ ...params, limit, offset }), 'estudantes');
    }
    const qs = new URLSearchParams();
    appendPageParams(qs, params);
    appendMultiValueParam(qs, 'genero', params?.genero);
    if (params?.idade_min !== undefined) qs.append('idade_min', String(params.idade_min));
    if (params?.idade_max !== undefined) qs.append('idade_max', String(params.idade_max));
    appendMultiValueParam(qs, 'ano_escolar_fundamental', params?.ano_escolar_fundamental);
    appendMultiValueParam(qs, 'ano_escolar_medio', params?.ano_escolar_medio);
    appendMultiValueParam(qs, 'ano_superior', params?.ano_superior);
    if (Array.isArray(params?.semestre_atual)) appendMultiValueParam(qs, 'semestre_atual', params.semestre_atual.map(String));
    else if (params?.semestre_atual !== undefined) qs.append('semestre_atual', String(params.semestre_atual));
    appendMultiValueParam(qs, 'curso_id', params?.curso_id);
    appendMultiValueParam(qs, 'curso', params?.curso);
    appendMultiValueParam(qs, 'codigo_academia', params?.codigo_academia);
    appendMultiValueParam(qs, 'status_escolar_fundamental', params?.status_escolar_fundamental);
    appendMultiValueParam(qs, 'status_escolar_medio', params?.status_escolar_medio);
    appendMultiValueParam(qs, 'status_superior', params?.status_superior);
    appendMultiValueParam(qs, 'status', params?.status);
    appendMultiValueParam(qs, 'turno', params?.turno);
    appendMultiValueParam(qs, 'codigo_turma', params?.codigo_turma);
    if (params?.com_turma !== undefined) qs.append('com_turma', String(params.com_turma));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ConsultarEstudantesResponse>(`/estudantes${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  /**
   * GET /avaliacoes
   * Lista avaliações finais. Escopo varia por tipo de usuário.
   * Proteção: autenticado (qualquer tipo)
   */
  listarAvaliacoes: (params?: ListarAvaliacoesParams): Promise<ListarAvaliacoesResponse> => {
    if (!hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => consultasService.listarAvaliacoes({ ...params, limit, offset }), 'avaliacoes');
    }
    const qs = new URLSearchParams();
    appendPageParams(qs, params);
    if (params?.nivel)              qs.append('nivel',              params.nivel);
    if (params?.ano_letivo)         qs.append('ano_letivo',         params.ano_letivo);
    if (params?.ano_academico_atual) qs.append('ano_academico_atual', params.ano_academico_atual);
    if (params?.codigo_turma)       qs.append('codigo_turma',       params.codigo_turma);
    if (params?.codigo_academia)    qs.append('codigo_academia',    params.codigo_academia);
    if (params?.type)               qs.append('type',               params.type);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarAvaliacoesResponse>(`/avaliacoes${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  /**
   * GET /aprovacoes
   * Lista apenas avaliações com aprovado = true.
   * Proteção: autenticado (qualquer tipo)
   */
  listarAprovacoes: (params?: ListarAprovacoesParams): Promise<ListarAprovacoesResponse> => {
    if (!hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => consultasService.listarAprovacoes({ ...params, limit, offset }), 'aprovacoes');
    }
    const qs = new URLSearchParams();
    appendPageParams(qs, params);
    if (params?.nivel)              qs.append('nivel',              params.nivel);
    if (params?.ano_letivo)         qs.append('ano_letivo',         params.ano_letivo);
    if (params?.ano_academico_atual) qs.append('ano_academico_atual', params.ano_academico_atual);
    if (params?.codigo_turma)       qs.append('codigo_turma',       params.codigo_turma);
    if (params?.codigo_academia)    qs.append('codigo_academia',    params.codigo_academia);
    if (params?.type)               qs.append('type',               params.type);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarAprovacoesResponse>(`/aprovacoes${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  /**
   * GET /reprovacoes
   * Lista apenas avaliações com aprovado = false.
   * Proteção: autenticado (qualquer tipo)
   */
  listarReprovacoes: (params?: ListarReprovacoesParams): Promise<ListarReprovacoesResponse> => {
    if (!hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => consultasService.listarReprovacoes({ ...params, limit, offset }), 'reprovacoes');
    }
    const qs = new URLSearchParams();
    appendPageParams(qs, params);
    if (params?.nivel)              qs.append('nivel',              params.nivel);
    if (params?.ano_letivo)         qs.append('ano_letivo',         params.ano_letivo);
    if (params?.ano_academico_atual) qs.append('ano_academico_atual', params.ano_academico_atual);
    if (params?.codigo_turma)       qs.append('codigo_turma',       params.codigo_turma);
    if (params?.codigo_academia)    qs.append('codigo_academia',    params.codigo_academia);
    if (params?.type)               qs.append('type',               params.type);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarReprovacoesResponse>(`/reprovacoes${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  notasEstudante: (
    codigoEstudante: string,
    params?: Omit<ListarNotasParams, 'limit' | 'offset' | 'codigo_academia' | 'token'> & { token?: string }
  ) => {
    const qs = new URLSearchParams();
    appendMultiValueParam(qs, 'ano_letivo', params?.ano_letivo);
    appendMultiValueParam(qs, 'ano_academico', params?.ano_academico);
    appendMultiValueParam(qs, 'curso_id', params?.curso_id);
    appendMultiValueParam(qs, 'codigo_turma', params?.codigo_turma);
    appendMultiValueParam(qs, 'periodo', params?.periodo);
    appendMultiValueParam(qs, 'materia_disciplinar_id', params?.materia_disciplinar_id);
    appendMultiValueParam(qs, 'categoria', params?.categoria);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<NotasEstudanteResponse>(
      `/notas-estudante/${codigoEstudante}${query}`,
      { token: params?.token || tokenStorage.get() || undefined }
    );
  },

  faltasEstudante: (
    codigoEstudante: string,
    params?: Omit<ListarFaltasParams, 'limit' | 'offset' | 'codigo_turma' | 'type' | 'token'> & { token?: string }
  ) => {
    const qs = new URLSearchParams();
    appendMultiValueParam(qs, 'ano_letivo', params?.ano_letivo);
    appendMultiValueParam(qs, 'ano_academico', params?.ano_academico);
    appendMultiValueParam(qs, 'curso_id', params?.curso_id);
    appendMultiValueParam(qs, 'periodo', params?.periodo);
    appendMultiValueParam(qs, 'materia_disciplinar_id', params?.materia_disciplinar_id);
    appendMultiValueParam(qs, 'codigo_academia', params?.codigo_academia);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<FaltasEstudanteResponse>(
      `/faltas-estudante/${codigoEstudante}${query}`,
      { token: params?.token || tokenStorage.get() || undefined }
    );
  },

  avaliacoesEstudante: (codigoEstudante: string, token?: string) =>
    getAllPaginated(
      (limit, offset) => api.get<AvaliacoesEstudanteResponse>(
        `/avaliacoes-estudante/${codigoEstudante}?limit=${limit}&offset=${offset}`,
        { token: token || tokenStorage.get() || undefined }
      ),
      'avaliacoes',
    ),

  /**
   * GET /notas
   * Lista registros de notas com escopo por perfil.
   * Proteção: autenticado (admin ou academia)
   */
  listarNotas: (params?: ListarNotasParams): Promise<ListarNotasResponse> => {
    if (!hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => consultasService.listarNotas({ ...params, limit, offset }), 'notas');
    }
    const qs = new URLSearchParams();
    appendPageParams(qs, params);
    appendMultiValueParam(qs, 'ano_letivo', params?.ano_letivo);
    appendMultiValueParam(qs, 'ano_academico', params?.ano_academico);
    appendMultiValueParam(qs, 'curso_id', params?.curso_id);
    appendMultiValueParam(qs, 'codigo_turma', params?.codigo_turma);
    appendMultiValueParam(qs, 'periodo', params?.periodo);
    appendMultiValueParam(qs, 'materia_disciplinar_id', params?.materia_disciplinar_id);
    appendMultiValueParam(qs, 'categoria', params?.categoria);
    appendMultiValueParam(qs, 'codigo_academia', params?.codigo_academia);
    appendMultiValueParam(qs, 'type', params?.type);
    if (params?.corrigido !== undefined) qs.set('corrigido', String(params.corrigido));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarNotasResponse>(`/notas${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  /**
   * GET /faltas
   * Lista registros de faltas com escopo por perfil.
   * Proteção: autenticado (admin ou academia)
   */
  listarFaltas: (params?: ListarFaltasParams): Promise<ListarFaltasResponse> => {
    if (!hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => consultasService.listarFaltas({ ...params, limit, offset }), 'faltas');
    }
    const qs = new URLSearchParams();
    appendPageParams(qs, params);
    appendMultiValueParam(qs, 'ano_letivo', params?.ano_letivo);
    appendMultiValueParam(qs, 'ano_academico', params?.ano_academico);
    appendMultiValueParam(qs, 'curso_id', params?.curso_id);
    appendMultiValueParam(qs, 'codigo_turma', params?.codigo_turma);
    appendMultiValueParam(qs, 'periodo', params?.periodo);
    appendMultiValueParam(qs, 'materia_disciplinar_id', params?.materia_disciplinar_id);
    appendMultiValueParam(qs, 'codigo_academia', params?.codigo_academia);
    appendMultiValueParam(qs, 'type', params?.type);
    if (params?.corrigido !== undefined) qs.set('corrigido', String(params.corrigido));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarFaltasResponse>(`/faltas${query}`, {
      token: params?.token || tokenStorage.get() || undefined,
    });
  },

  /**
   * GET /turmas-estudante/:codigo
   */
  turmasEstudante: (codigoEstudante: string, token?: string) =>
    api.get<TurmasEstudanteResponse>(
      `/turmas-estudante/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// TODO(finanças): criarCobranca, criarQrCode, consultarCobranca — próximas etapas
// ── Financeiro / AppyPay ────────────────────────────────────────────

export const financeiroService = {
  listarCredenciais: (params?: ListarFinanceiroCredenciaisParams & { token?: string }) => {
    const qs = new URLSearchParams();
    if (params?.contexto_tipo) qs.set('contexto_tipo', params.contexto_tipo);
    if (params?.codigo_academia) qs.set('codigo_academia', params.codigo_academia);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarFinanceiroCredenciaisResponse>(
      `/financeiro/appypay/credenciais${query}`,
      { token: params?.token || tokenStorage.get() || undefined }
    );
  },

  criarCredencial: (data: CriarFinanceiroCredencialRequest, token?: string) =>
    api.post<FinanceiroCredencial, CriarFinanceiroCredencialRequest>(
      '/financeiro/appypay/credenciais',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarCredencial: (id: string, data: AtualizarFinanceiroCredencialRequest, token?: string) =>
    api.put<FinanceiroCredencial, AtualizarFinanceiroCredencialRequest>(
      `/financeiro/appypay/credenciais/${id}`,
      data,
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

  eventoAuditoria: (eventId: string, token?: string) =>
    api.get<EventoAuditoriaResponse>(
      `/eventos/${eventId}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  verificarIntegridade: (codigoEstudante: string, token?: string) =>
    api.get<VerificarIntegridadeResponse>(
      `/verificar-integridade/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// ESTUDANTE
// =====================

export const estudanteService = {
  /** @deprecated A API removeu PUT /estudante/dados-pessoais. Use as rotas dedicadas abaixo. */
  atualizarDadosPessoais: (data: AtualizarDadosPessoaisEstudanteRequest, token?: string) =>
    api.put<{ message: string }>(
      '/estudante/dados-pessoais',
      prepareAtualizarDadosPessoaisEstudante(data),
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarTelefoneEncarregado: (data: AtualizarTelefoneEncarregadoEstudanteRequest, token?: string) =>
    api.put<{ message: string }>(
      '/estudante/encarregado/telefone',
      prepareAtualizarTelefoneEncarregadoEstudante(data),
      { token: token || tokenStorage.get() || undefined }
    ),

  listarMinhasSolicitacoesEdicao: (params?: ListarSolicitacoesEdicaoDadoEstudanteParams, token?: string) =>
    api.get<ListarSolicitacoesEdicaoDadoEstudanteResponse>(
      `/estudante/solicitacoes-edicao${buildSolicitacoesEdicaoDadoEstudanteQuery(params)}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  criarSolicitacaoEdicao: (campo: CampoEdicaoDadoEstudante, data: CriarSolicitacaoEdicaoDadoEstudanteRequest, token?: string) => {
    const endpointByCampo: Record<CampoEdicaoDadoEstudante, string> = {
      nome: '/estudante/solicitacoes-edicao/nome',
      bilhete_identidade: '/estudante/solicitacoes-edicao/bilhete-identidade',
      bilhete_identidade_encarregado: '/estudante/solicitacoes-edicao/bilhete-identidade-encarregado',
      data_nascimento: '/estudante/solicitacoes-edicao/data-nascimento',
    };
    return api.postForm<CriarSolicitacaoEdicaoDadoEstudanteResponse>(
      endpointByCampo[campo],
      prepareSolicitacaoEdicaoDadoEstudanteForm(data),
      { token: token || tokenStorage.get() || undefined }
    );
  },

  minhasAvaliacoes: (token?: string) =>
    getAllPaginated(
      (limit, offset) => api.get<ListarAvaliacoesResponse>(`/estudante/minhas-avaliacoes?limit=${limit}&offset=${offset}`, {
        token: token || tokenStorage.get() || undefined,
      }),
      'avaliacoes',
    ),

  solicitarInterrupcao: (data: CriarSolicitacaoStatusAcademicoRequest, token?: string) =>
    api.post<CriarSolicitacaoStatusAcademicoResponse>('/estudante/solicitacoes-status/interrupcao', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  solicitarDesvinculacao: (data: CriarSolicitacaoStatusAcademicoRequest, token?: string) =>
    api.post<CriarSolicitacaoStatusAcademicoResponse>('/estudante/solicitacoes-status/desvinculacao', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  solicitarRevinculacao: (codigoAcademia: string, data: CriarSolicitacaoRevinculacaoRequest, token?: string) =>
    api.post<CriarSolicitacaoStatusAcademicoResponse>(`/estudante/solicitacoes-status/revinculacao/${encodeURIComponent(codigoAcademia)}`, data, {
      token: token || tokenStorage.get() || undefined,
    }),

  listarMinhasSolicitacoesStatusAcademico: (params?: ListarSolicitacoesStatusAcademicoParams | string): Promise<ListarSolicitacoesStatusAcademicoResponse> => {
    const isLegacy = typeof params === 'string';
    if (!isLegacy && !hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => estudanteService.listarMinhasSolicitacoesStatusAcademico({ ...params, limit, offset }), 'solicitacoes');
    }
    const tok = isLegacy ? params : params?.token;
    const qs = isLegacy ? '' : buildSolicitacoesStatusAcademicoQuery(params);
    return api.get<ListarSolicitacoesStatusAcademicoResponse>(`/estudante/solicitacoes${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

};


// =====================
// DOCUMENTOS
// =====================

function normalizarDocumentoEndpoint(downloadUrl: string, prefixoPermitido: string): string {
  const endpoint = downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')
    ? `${new URL(downloadUrl).pathname}${new URL(downloadUrl).search}`
    : downloadUrl;
  const pathname = endpoint.split('?')[0] || endpoint;

  if (!pathname.startsWith(prefixoPermitido)) {
    throw new Error('URL de documento inválida para a rota autenticada esperada.');
  }

  return endpoint;
}

export const documentosService = {
  baixarAlvaraAcademia: (codigoAcademia: string, token?: string) =>
    fetchApiBlob(
      `/documentos/academias/${encodeURIComponent(codigoAcademia)}/alvara/download`,
      { token: token || tokenStorage.get() || undefined }
    ),

  baixarAlvaraAcademiaPorUrl: (downloadUrl: string, token?: string) =>
    fetchApiBlob(
      normalizarDocumentoEndpoint(downloadUrl, '/documentos/academias/'),
      { token: token || tokenStorage.get() || undefined }
    ),

  baixarDocumentoEstudante: (codigoEstudante: string, campo: string, token?: string, params?: { nivel?: string; ano_academico?: string }) => {
    const qs = new URLSearchParams();
    if (params?.nivel) qs.set('nivel', params.nivel);
    if (params?.ano_academico) qs.set('ano_academico', params.ano_academico);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return fetchApiBlob(
      `/documentos/estudantes/${encodeURIComponent(codigoEstudante)}/${encodeURIComponent(campo)}/download${query}`,
      { token: token || tokenStorage.get() || undefined }
    );
  },

  baixarDocumentoEstudantePorUrl: (downloadUrl: string, token?: string) =>
    fetchApiBlob(
      normalizarDocumentoEndpoint(downloadUrl, '/documentos/estudantes/'),
      { token: token || tokenStorage.get() || undefined }
    ),

  baixarDocumentoSolicitacaoMatricula: (codigoSolicitacao: string, campo: string, token?: string) =>
    fetchApiBlob(
      `/documentos/solicitacoes-matricula/${encodeURIComponent(codigoSolicitacao)}/${encodeURIComponent(campo)}/download`,
      { token: token || tokenStorage.get() || undefined }
    ),

  baixarDocumentoSolicitacaoMatriculaPorUrl: (downloadUrl: string, token?: string) =>
    fetchApiBlob(
      normalizarDocumentoEndpoint(downloadUrl, '/documentos/solicitacoes-matricula/'),
      { token: token || tokenStorage.get() || undefined }
    ),

  baixarDocumentoSolicitacaoEdicaoEstudante: (codigoSolicitacao: string, token?: string) =>
    fetchApiBlob(
      `/academia/documentos/solicitacoes-edicao-estudante/${encodeURIComponent(codigoSolicitacao)}/documento/download`,
      { token: token || tokenStorage.get() || undefined }
    ),

  baixarDocumentoSolicitacaoEdicaoEstudantePorUrl: (downloadUrl: string, token?: string) =>
    fetchApiBlob(
      normalizarDocumentoEndpoint(downloadUrl, '/academia/documentos/solicitacoes-edicao-estudante/'),
      { token: token || tokenStorage.get() || undefined }
    ),
};

// =====================
// ACADEMIA
// =====================

export const academiaService = {
  atualizarDados: (data: AtualizarDadosAcademiaRequest, token?: string) =>
    api.put<{ message: string; aviso?: string; email_verificado?: boolean }>(
      '/academia/dados',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarSolicitacoesEdicaoEstudante: (params?: ListarSolicitacoesEdicaoDadoEstudanteParams, token?: string) =>
    api.get<ListarSolicitacoesEdicaoDadoEstudanteResponse>(
      `/academia/solicitacoes-edicao-estudante${buildSolicitacoesEdicaoDadoEstudanteQuery(params)}`,
      { token: token || tokenStorage.get() || undefined }
    ),


  aprovarSolicitacaoEdicaoEstudante: (campo: CampoEdicaoDadoEstudante, codigo: string, token?: string) =>
    api.put<DecidirSolicitacaoEdicaoDadoEstudanteResponse>(
      `/academia/solicitacoes-edicao-estudante/${campo.replace(/_/g, '-')}/${encodeURIComponent(codigo)}/aprovar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  reprovarSolicitacaoEdicaoEstudante: (campo: CampoEdicaoDadoEstudante, codigo: string, data: ReprovarSolicitacaoEdicaoDadoEstudanteRequest, token?: string) =>
    api.put<DecidirSolicitacaoEdicaoDadoEstudanteResponse>(
      `/academia/solicitacoes-edicao-estudante/${campo.replace(/_/g, '-')}/${encodeURIComponent(codigo)}/reprovar`,
      { motivo_reprovacao: data.motivo_reprovacao?.trim() },
      { token: token || tokenStorage.get() || undefined }
    ),

  cadastrarEstudante: (data: CriarEstudanteRequest, token?: string) =>
    api.postForm<{ message: string; data: { id: string; codigo_estudante: string; codigo_academia: string; codigo_turma?: string; turma_vinculada?: boolean; turma_aviso?: string } }>(
      '/academia/estudante/register',
      prepareCriarEstudanteForm(data),
      { token: token || tokenStorage.get() || undefined }
    ),

  adicionarDocumentosEstudante: (codigoEstudante: string, documentos: Record<string, File | undefined>, token?: string) => {
    const formData = new FormData();
    Object.entries(documentos).forEach(([campo, file]) => {
      if (file) formData.append(campo, file);
    });
    return api.postForm<{ codigo_estudante: string; status: string; documentos?: Record<string, unknown> }>(
      `/academia/estudante/${encodeURIComponent(codigoEstudante)}/documentos`,
      formData,
      { token: token || tokenStorage.get() || undefined }
    );
  },

  baixarDocumentoEstudante: (codigoEstudante: string, campo: string, token?: string, params?: { nivel?: string; ano_academico?: string }) =>
    documentosService.baixarDocumentoEstudante(codigoEstudante, campo, token, params),

  // ── Solicitações de matrícula ────────────────────────────────────

  listarSolicitacoesMatricula: (params?: ListarSolicitacoesMatriculaParams | string): Promise<ListarSolicitacoesMatriculaResponse> => {
    const isLegacy = typeof params === 'string';
    if (!isLegacy && !hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => academiaService.listarSolicitacoesMatricula({ ...params, limit, offset }), 'solicitacoes');
    }
    const tok = isLegacy ? params : params?.token;
    const qs = isLegacy ? '' : buildSolicitacoesMatriculaQuery(params);
    return api.get<ListarSolicitacoesMatriculaResponse>(`/academia/solicitacoes-matricula${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  consultarSolicitacaoMatricula: (codigo: string, token?: string) =>
    api.get<{ solicitacao: SolicitacaoMatricula }>(
      `/academia/solicitacao-matricula/${encodeURIComponent(codigo)}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  aprovarSolicitacaoMatricula: (codigo: string, token?: string) =>
    api.put<AprovarSolicitacaoMatriculaResponse>(
      `/academia/solicitacao-matricula/${encodeURIComponent(codigo)}/aprovar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  reprovarSolicitacaoMatricula: (codigo: string, data: ReprovarSolicitacaoMatriculaRequest, token?: string) =>
    api.put<MensagemResponse>(
      `/academia/solicitacao-matricula/${encodeURIComponent(codigo)}/reprovar`,
      { motivo_reprovacao: data.motivo_reprovacao?.trim() },
      { token: token || tokenStorage.get() || undefined }
    ),

  baixarDocumentoSolicitacaoMatricula: (codigo: string, campo: string, token?: string) =>
    documentosService.baixarDocumentoSolicitacaoMatricula(codigo, campo, token),

  // ── Notas ──────────────────────────────────────────────────────────

  registrarNota: (data: RegistrarNotasRequest, token?: string) =>
    api.post<RegistrarNotaResponse>(
      '/academia/notas-aluno',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  corrigirNota: (id: string, data: CorrigirNotaRequest, token?: string) =>
    api.patch<CorrigirNotaResponse, CorrigirNotaRequest>(
      `/academia/notas-aluno/${id}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Faltas ──────────────────────────────────────────────────────────

  registrarFaltas: (data: RegistrarFaltasRequest, token?: string) =>
    api.post<{ message: string; estudante: string; materia: string; quantidade: number; ano_academico: string }>(
      '/academia/faltas-aluno',
      prepareRegistrarFalta(data),
      { token: token || tokenStorage.get() || undefined }
    ),

  corrigirFalta: (id: string, data: CorrigirFaltaRequest, token?: string) =>
    api.patch<CorrigirFaltaResponse, CorrigirFaltaRequest>(
      `/academia/faltas-aluno/${id}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Avaliação Final ────────────────────────────────────────────────

  criarRegraAvaliacaoFinal: (data: CriarRegraAvaliacaoFinalRequest, token?: string) =>
    api.post<CriarRegraAvaliacaoFinalResponse>(
      '/academia/avaliacao-final/regras',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarRegrasAvaliacaoFinal: (token?: string) =>
    api.get<ListarRegrasAvaliacaoFinalResponse>(
      '/academia/avaliacao-final/regras',
      { token: token || tokenStorage.get() || undefined }
    ),

  editarRegraAvaliacaoFinal: (id: string, data: EditarRegraAvaliacaoFinalRequest, token?: string) =>
    api.put<CriarRegraAvaliacaoFinalResponse>(
      `/academia/avaliacao-final/regras/${encodeURIComponent(id)}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  deletarRegraAvaliacaoFinal: (id: string, token?: string) =>
    api.delete<{ message: string }>(
      `/academia/avaliacao-final/regras/${encodeURIComponent(id)}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Ano letivo ────────────────────────────────────────────────────

  definirAnoLetivo: (
    data: DefinirAnoLetivoAcademiaRequest,
    token?: string,
    anoLetivoOficial?: string
  ) => {
    const anoLetivoNormalizado = data.ano_letivo ? ensureAnoLetivoFormato(data.ano_letivo) : undefined;
    const anoOficialNormalizado = anoLetivoOficial ? ensureAnoLetivoFormato(anoLetivoOficial) : undefined;

    if (anoOficialNormalizado && anoLetivoNormalizado && anoLetivoNormalizado !== anoOficialNormalizado) {
      throw new Error(`O ano letivo da academia deve ser igual ao ano letivo oficial do sistema (${anoOficialNormalizado}).`);
    }

    return api.post<DefinirAnoLetivoResponse>(
      ACADEMIA_DEFINIR_ANO_LETIVO_ENDPOINT,
      { ...data, ...(anoLetivoNormalizado ? { ano_letivo: anoLetivoNormalizado } : {}) },
      { token: token || tokenStorage.get() || undefined }
    );
  },

  /**
   * GET /academia/ano-letivo
   *
   * Retorna o ano letivo ativo da academia alvo.
   *
   * - Para `academia`: o backend ignora `codigo_academia` e retorna o próprio ano letivo.
   * - Para `admin`: `codigo_academia` é **obrigatório**; a busca é feita pelo código informado.
   *
   * @param params - string (token legado) ou objeto com `{ codigo_academia?, token? }`
   */
  getAnoLetivo: (params?: { codigo_academia?: string; token?: string } | string) => {
    const isLegacy = typeof params === 'string' || params === undefined;
    const tok      = isLegacy ? (params as string | undefined) : params?.token;
    const codigo   = isLegacy ? undefined : params?.codigo_academia;
    const qs       = codigo ? `?codigo_academia=${encodeURIComponent(codigo)}` : '';
    return api.get<AnoLetivoAcademiaResponse>(`${ACADEMIA_ANO_LETIVO_ENDPOINT}${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  listarConfiguracoesAnoLetivo: (token?: string) =>
    api.get<ListarConfiguracoesAnoLetivoResponse>(
      ANOS_LETIVOS_CONFIGURACOES_ENDPOINT,
      { token: token || tokenStorage.get() || undefined }
    ),

  finalizarAnoLetivo: (data: FinalizarAnoLetivoRequest, token?: string) =>
    api.post<FinalizarAnoLetivoResponse>(
      '/academia/anos-letivos/finalizar',
      {
        ...data,
        ano_letivo: ensureAnoLetivoFormato(data.ano_letivo),
      },
      { token: token || tokenStorage.get() || undefined }
    ),

  listarFinalizacoesAnoLetivo: (token?: string) =>
    api.get<ListarFinalizacoesAnoLetivoResponse>(
      '/academia/anos-letivos/finalizacoes',
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * GET /academia/anos-letivos-lista
   *
   * Retorna a lista histórica de anos letivos definidos pela academia alvo.
   *
   * - Para `academia`: o backend ignora `codigo_academia` e retorna a própria lista.
   * - Para `admin`: `codigo_academia` é **obrigatório**; a busca é feita pelo código informado.
   *
   * @param params - string (token legado) ou objeto com `{ codigo_academia?, token? }`
   */
  listarAnosLetivosLista: (params?: { codigo_academia?: string; token?: string } | string) => {
    const isLegacy = typeof params === 'string' || params === undefined;
    const tok      = isLegacy ? (params as string | undefined) : params?.token;
    const codigo   = isLegacy ? undefined : params?.codigo_academia;
    const qs       = codigo ? `?codigo_academia=${encodeURIComponent(codigo)}` : '';
    return api.get<ListarAnosLetivosAcademiaResponse>(`/academia/anos-letivos-lista${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  // ── Anos acadêmicos ────────────────────────────────────────────

  listarAnosAcademicos: (params?: { codigo_academia?: string; token?: string } | string) => {
    const isLegacy = typeof params === 'string' || params === undefined;
    const tok = isLegacy ? (params as string | undefined) : params?.token;
    const codigo = isLegacy ? undefined : params?.codigo_academia;
    const qs = codigo ? `?codigo_academia=${encodeURIComponent(codigo)}` : '';
    return api.get<ListarAnosAcademicosResponse>(`/academia/anos-academicos${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  adicionarAnosAcademicos: (data: GerirAnosAcademicosRequest, token?: string) =>
    api.post<GerirAnosAcademicosResponse>('/academia/anos-academicos', data, {
      token: token || tokenStorage.get() || undefined,
    }),

  removerAnosAcademicos: (data: GerirAnosAcademicosRequest, token?: string) =>
    api.delete<GerirAnosAcademicosResponse, GerirAnosAcademicosRequest>(
      '/academia/anos-academicos',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Categorias de nota ────────────────────────────────────────────

  criarCategoriaNota: (data: CriarCategoriaNotaRequest, token?: string) =>
    api.post<{ message: string; categoria: string }>(
      '/academia/categorias-nota',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarCategoriasNota: (params?: string | { codigo_academia?: string; token?: string }) => {
    const token = typeof params === 'string' ? params : params?.token;
    const qs = new URLSearchParams();
    if (typeof params !== 'string' && params?.codigo_academia) qs.append('codigo_academia', params.codigo_academia);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ListarCategoriasNotaResponse>(
      `/academia/categorias-nota${query}`,
      { token: token || tokenStorage.get() || undefined }
    );
  },

  deletarCategoriaNota: (codigo: string, token?: string) =>
    api.delete<{ message: string; categoria: string }>(
      `/academia/categorias-nota/${encodeURIComponent(codigo)}`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Solicitações de status acadêmico ──────────────────────────────

  listarSolicitacoesStatusAcademico: (params?: ListarSolicitacoesStatusAcademicoParams | string): Promise<ListarSolicitacoesStatusAcademicoResponse> => {
    const isLegacy = typeof params === 'string';
    if (!isLegacy && !hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => academiaService.listarSolicitacoesStatusAcademico({ ...params, limit, offset }), 'solicitacoes');
    }
    const tok = isLegacy ? params : params?.token;
    const qs = isLegacy ? '' : buildSolicitacoesStatusAcademicoQuery(params);
    return api.get<ListarSolicitacoesStatusAcademicoResponse>(`/academia/solicitacoes${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  aprovarInterrupcaoPercurso: (codigoEstudante: string, data: DecidirSolicitacaoStatusAcademicoRequest, token?: string) =>
    api.post<DecidirSolicitacaoStatusAcademicoResponse>(
      `/academia/estudante/${encodeURIComponent(codigoEstudante)}/interromper/percurso-academico`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  reprovarInterrupcaoPercurso: (codigoEstudante: string, data: ReprovarSolicitacaoStatusAcademicoRequest, token?: string) =>
    api.post<DecidirSolicitacaoStatusAcademicoResponse>(
      `/academia/estudante/${encodeURIComponent(codigoEstudante)}/interromper/percurso-academico/reprovar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  aprovarDesvinculacao: (codigoEstudante: string, data: DecidirSolicitacaoStatusAcademicoRequest, token?: string) =>
    api.post<DecidirSolicitacaoStatusAcademicoResponse>(
      `/academia/estudante/${encodeURIComponent(codigoEstudante)}/desvincular`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  reprovarDesvinculacao: (codigoEstudante: string, data: ReprovarSolicitacaoStatusAcademicoRequest, token?: string) =>
    api.post<DecidirSolicitacaoStatusAcademicoResponse>(
      `/academia/estudante/${encodeURIComponent(codigoEstudante)}/desvincular/reprovar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  aprovarRevinculacao: (codigoEstudante: string, data: DecidirSolicitacaoStatusAcademicoRequest, token?: string) =>
    api.post<DecidirSolicitacaoStatusAcademicoResponse>(
      `/academia/estudante/${encodeURIComponent(codigoEstudante)}/revincular`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  reprovarRevinculacao: (codigoEstudante: string, data: ReprovarSolicitacaoStatusAcademicoRequest, token?: string) =>
    api.post<DecidirSolicitacaoStatusAcademicoResponse>(
      `/academia/estudante/${encodeURIComponent(codigoEstudante)}/revincular/reprovar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Cursos ────────────────────────────────────────────────────────

  criarCurso: (data: CriarCursoRequest, token?: string) =>
    api.post<{ message: string; data: Curso }>(
      '/academia/curso',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * GET /academia/cursos
   * Lista cursos da academia autenticada.
   * Proteção: autenticado (academia ativa ou admin)
   *
   * Query params (quando admin):
   * - codigo_academia: obrigatório
   */
  listarCursos: (params?: { codigo_academia?: string; token?: string } | string) => {
    const isLegacy = typeof params === 'string' || params === undefined;
    const tok      = isLegacy ? (params as string | undefined) : params?.token;
    const codigo   = isLegacy ? undefined : params?.codigo_academia;
    const qs       = codigo ? `?codigo_academia=${encodeURIComponent(codigo)}` : '';
    return api.get<ListarCursosResponse>(`/academia/cursos${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  /**
   * GET /academia/curso/:id
   * Proteção: autenticado (academia ativa ou admin)
   *
   * Query params (quando admin):
   * - codigo_academia: obrigatório
   */
  getCurso: (cursoId: string, params?: { codigo_academia?: string; token?: string } | string) => {
    const isLegacy = typeof params === 'string' || params === undefined;
    const tok      = isLegacy ? (params as string | undefined) : params?.token;
    const codigo   = isLegacy ? undefined : params?.codigo_academia;
    const qs       = codigo ? `?codigo_academia=${encodeURIComponent(codigo)}` : '';
    return api.get<Curso>(
      `/academia/curso/${cursoId}${qs}`,
      { token: tok || tokenStorage.get() || undefined }
    );
  },

  ativarCurso: (cursoId: string, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/curso/${cursoId}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarCurso: (cursoId: string, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/curso/${cursoId}/desativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarCurso: (cursoId: string, data: AtualizarCursoRequest, token?: string) =>
    api.put<{ message: string; data?: Curso; nome: string; type?: string; modelo?: Curso['modelo']; anos_academicos?: string[]; periodos?: string[] }>(
      `/academia/curso/${cursoId}/dados`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  deletarCurso: (cursoId: string, motivo?: string, token?: string) =>
    api.delete<DeletarCursoResponse>(
      `/academia/curso/${cursoId}`,
      {
        token: token || tokenStorage.get() || undefined,
        method: 'DELETE',
        body: motivo ? JSON.stringify({ motivo }) : undefined,
        headers: { 'Content-Type': 'application/json' },
      } as any
    ),

  // ── Matérias ────────────────────────────────────────────────────────

  criarMateria: (data: CriarMateriaRequest, token?: string) =>
    api.post<{ message: string; data: { id: string; nome: string; type: string; status: string; proximo_passo?: string } }>(
      '/academia/materia',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * GET /academia/materias
   * Lista matérias da academia autenticada.
   * Proteção: autenticado (academia ativa ou admin)
   *
   * Query params (quando admin):
   * - codigo_academia: obrigatório
   */
  listarMaterias: (params?: { codigo_academia?: string; token?: string } | string) => {
    const isLegacy = typeof params === 'string' || params === undefined;
    const tok      = isLegacy ? (params as string | undefined) : params?.token;
    const codigo   = isLegacy ? undefined : params?.codigo_academia;
    const qs       = codigo ? `?codigo_academia=${encodeURIComponent(codigo)}` : '';
    return api.get<ListarMateriasResponse>(`/academia/materias${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  /**
   * GET /academia/materia/:id
   * Proteção: autenticado (academia ativa ou admin)
   *
   * Query params (quando admin):
   * - codigo_academia: obrigatório
   */
  getMateria: (materiaId: string, params?: { codigo_academia?: string; token?: string } | string) => {
    const isLegacy = typeof params === 'string' || params === undefined;
    const tok      = isLegacy ? (params as string | undefined) : params?.token;
    const codigo   = isLegacy ? undefined : params?.codigo_academia;
    const qs       = codigo ? `?codigo_academia=${encodeURIComponent(codigo)}` : '';
    return api.get<Materia>(
      `/academia/materia/${materiaId}${qs}`,
      { token: tok || tokenStorage.get() || undefined }
    );
  },

  ativarMateria: (materiaId: string, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/materia/${materiaId}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarMateria: (materiaId: string, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/materia/${materiaId}/desativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarMateria: (materiaId: string, data: AtualizarMateriaRequest, token?: string) =>
    api.put<{ message: string; nome: string }>(
      `/academia/materia/${materiaId}/dados`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  deletarMateria: (materiaId: string, token?: string) =>
    api.delete<{ message: string; nome: string }>(
      `/academia/materia/${materiaId}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Turmas ────────────────────────────────────────────────────────

  criarTurma: (data: CriarTurmaRequest, token?: string) =>
    api.post<{ message: string; id: string; codigo_turma: string }>(
      '/academia/turma',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  /**
   * GET /academia/turmas
   * Lista turmas da academia autenticada.
   * Proteção: autenticado (academia ativa ou admin)
   *
   * Query params (quando admin):
   * - codigo_academia: obrigatório
   */
  listarTurmas: (params?: { codigo_academia?: string; token?: string } | string) => {
    const isLegacy = typeof params === 'string' || params === undefined;
    const tok      = isLegacy ? (params as string | undefined) : params?.token;
    const codigo   = isLegacy ? undefined : params?.codigo_academia;
    const qs       = codigo ? `?codigo_academia=${encodeURIComponent(codigo)}` : '';
    return api.get<ListarTurmasResponse>(`/academia/turmas${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  /**
   * GET /academia/turma/:codigo
   * Proteção: autenticado (academia ativa ou admin)
   *
   * Query params (quando admin):
   * - codigo_academia: obrigatório (o código da turma é contextual por academia)
   */
  getTurma: (codigoTurma: string, params?: { codigo_academia?: string; token?: string } | string) => {
    const isLegacy = typeof params === 'string' || params === undefined;
    const tok      = isLegacy ? (params as string | undefined) : params?.token;
    const codigo   = isLegacy ? undefined : params?.codigo_academia;
    const qs       = codigo ? `?codigo_academia=${encodeURIComponent(codigo)}` : '';
    return api.get<Turma>(
      `/academia/turma/${codigoTurma}${qs}`,
      { token: tok || tokenStorage.get() || undefined }
    );
  },

  ativarTurma: (codigoTurma: string, token?: string) =>
    api.put<{ message: string; codigo_turma: string }>(
      `/academia/turma/${codigoTurma}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarTurma: (codigoTurma: string, token?: string) =>
    api.put<{ message: string; codigo_turma: string }>(
      `/academia/turma/${codigoTurma}/desativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarTurma: (codigoTurma: string, data: AtualizarTurmaRequest, token?: string) =>
    api.put<{ message: string }>(
      `/academia/turma/${codigoTurma}/dados`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  deletarTurma: (codigoTurma: string, motivo?: string, token?: string) =>
    api.delete<DeletarTurmaResponse>(
      `/academia/turma/${codigoTurma}`,
      {
        token: token || tokenStorage.get() || undefined,
        method: 'DELETE',
        body: motivo ? JSON.stringify({ motivo }) : undefined,
        headers: { 'Content-Type': 'application/json' },
      } as any
    ),

  adicionarEstudanteATurma: (codigoTurma: string, data: AdicionarEstudanteTurmaRequest, token?: string) =>
    api.post<{ message: string; codigo_turma: string; codigo_estudante: string }>(
      `/academia/turma/${codigoTurma}/estudante`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  removerEstudanteDaTurma: (codigoTurma: string, codigoEstudante: string, token?: string) =>
    api.delete<{ message: string; codigo_turma: string; codigo_estudante: string }>(
      `/academia/turma/${codigoTurma}/estudantes/${codigoEstudante}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Async — estudantes ──────────────────────────────────────────────

  cadastrarEstudanteBatchAsync: (data: CriarEstudanteRequest[], token?: string) =>
    api.post<AsyncBatchResponse>(
      '/academia/estudante/register/async',
      {
        com_arquivo: false,
        estudantes: data.map(prepareCriarEstudante),
      },
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Async — notas ──────────────────────────────────────────────────

  registrarNotaBatchAsync: (data: RegistrarNotasRequest[], token?: string) =>
    api.post<AsyncBatchResponse>(
      '/academia/notas-aluno/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),


  // ── Async — faltas ────────────────────────────────────────────────

  registrarFaltasBatchAsync: (data: RegistrarFaltasRequest[], token?: string) =>
    api.post<AsyncBatchResponse>(
      '/academia/faltas-aluno/async',
      data.map(prepareRegistrarFalta),
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Async — cursos ────────────────────────────────────────────────

  criarCursoBatchAsync: (data: CriarCursoRequest[], token?: string) =>
    api.post<AsyncBatchResponse>(
      '/academia/curso/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarCursoBatchAsync: (data: { id: string }[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/curso/ativar/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarCursoBatchAsync: (data: { id: string }[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/curso/desativar/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarCursoBatchAsync: (data: (AtualizarCursoRequest & { id: string })[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/curso/dados/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  deletarCursoBatchAsync: (data: { id: string; motivo?: string }[], token?: string) =>
    api.delete<AsyncBatchResponse>(
      '/academia/curso/async',
      {
        token: token || tokenStorage.get() || undefined,
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      } as any
    ),

  // ── Async — matérias ──────────────────────────────────────────────

  criarMateriaBatchAsync: (data: CriarMateriaRequest[], token?: string) =>
    api.post<AsyncBatchResponse>(
      '/academia/materia/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarMateriaBatchAsync: (data: { id: string }[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/materia/ativar/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarMateriaBatchAsync: (data: { id: string }[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/materia/desativar/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarMateriaBatchAsync: (data: ({ id: string } & AtualizarMateriaRequest)[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/materia/dados/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  deletarMateriaBatchAsync: (data: { id: string }[], token?: string) =>
    api.delete<AsyncBatchResponse>(
      '/academia/materia/async',
      {
        token: token || tokenStorage.get() || undefined,
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      } as any
    ),

  // ── Async — turmas ────────────────────────────────────────────────

  criarTurmaBatchAsync: (data: CriarTurmaRequest[], token?: string) =>
    api.post<AsyncBatchResponse>(
      '/academia/turma/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarTurmaBatchAsync: (data: { codigo_turma: string }[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/turma/ativar/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarTurmaBatchAsync: (data: { codigo_turma: string }[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/turma/desativar/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarTurmaBatchAsync: (data: ({ codigo_turma: string } & AtualizarTurmaRequest)[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/turma/dados/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  deletarTurmaBatchAsync: (data: { codigo_turma: string; motivo?: string }[], token?: string) =>
    api.delete<AsyncBatchResponse>(
      '/academia/turma/async',
      {
        token: token || tokenStorage.get() || undefined,
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      } as any
    ),

  adicionarEstudanteBatchAsync: (
    data: { codigo_turma: string; codigo_estudante: string }[],
    token?: string
  ) =>
    api.post<AsyncBatchResponse>(
      '/academia/turma/estudante/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  removerEstudanteTurmaBatchAsync: (
    data: { codigo_turma: string; codigo_estudante: string }[],
    token?: string
  ) =>
    api.delete<AsyncBatchResponse>(
      '/academia/turma/estudante/async',
      {
        token: token || tokenStorage.get() || undefined,
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      } as any
    ),

  // ── Async — dados da academia ─────────────────────────────────────

  atualizarAcademiaBatchAsync: (data: AtualizarDadosAcademiaRequest[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/academia/dados/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Async — categorias de nota ────────────────────────────────────

  criarCategoriasNotaBatchAsync: (data: CriarCategoriaNotaRequest[], token?: string) =>
    api.post<AsyncBatchResponse>(
      '/academia/categorias-nota/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  deletarCategoriasNotaBatchAsync: (data: { codigo: string }[], token?: string) =>
    api.delete<AsyncBatchResponse>(
      '/academia/categorias-nota/async',
      {
        token: token || tokenStorage.get() || undefined,
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      } as any
    ),
};

// =====================
// ADMIN
// =====================

export const adminService = {

  /**
   * POST /admin/definir-ano-letivo-geral
   * Define diretamente uma única vez o ano letivo oficial global.
   * O backend calcula o ano letivo automaticamente pelo ano civil atual.
   */
  definirAnoLetivoGlobal: (data: DefinirAnoLetivoGlobalRequest, token?: string) =>
    api.post<DefinirAnoLetivoGlobalResponse>(
      ADMIN_SISTEMA_ANO_LETIVO_ENDPOINT,
      { type: data.type, ano_letivo: ensureAnoLetivoFormato(data.ano_letivo) },
      { token: token || tokenStorage.get() || undefined }
    ),

  /** GET /ano-letivo - leitura global para qualquer usuário autenticado. */
  obterAnoLetivoGlobal: (params?: AnoLetivoTipo | { type?: AnoLetivoTipo; token?: string } | string) => {
    const legacyToken = typeof params === 'string' && params !== 'escolar' && params !== 'superior' ? params : undefined;
    const type = typeof params === 'string' ? (params === 'escolar' || params === 'superior' ? params : undefined) : params?.type;
    const token = typeof params === 'object' ? params.token : legacyToken;
    const qs = type ? `?type=${encodeURIComponent(type)}` : '';
    return api.get<AnoLetivoGlobalResponse>(
      `${GLOBAL_ANO_LETIVO_ENDPOINT}${qs}`,
      { token: token || tokenStorage.get() || undefined }
    );
  },

  /** GET /anos-letivos-lista - histórico global para qualquer usuário autenticado. */
  listarAnosLetivosGlobais: (params?: AnoLetivoTipo | { type?: AnoLetivoTipo; token?: string } | string) => {
    const legacyToken = typeof params === 'string' && params !== 'escolar' && params !== 'superior' ? params : undefined;
    const type = typeof params === 'string' ? (params === 'escolar' || params === 'superior' ? params : undefined) : params?.type;
    const token = typeof params === 'object' ? params.token : legacyToken;
    const qs = type ? `?type=${encodeURIComponent(type)}` : '';
    return api.get<ListarAnosLetivosGlobalResponse>(
      `${GLOBAL_ANOS_LETIVOS_LISTA_ENDPOINT}${qs}`,
      { token: token || tokenStorage.get() || undefined }
    );
  },

  listarConfiguracoesAnoLetivo: (token?: string) =>
    api.get<ListarConfiguracoesAnoLetivoResponse>(
      ADMIN_ANOS_LETIVOS_CONFIGURACOES_ENDPOINT,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarConfiguracaoAnoLetivo: (type: AnoLetivoTipo, data: AtualizarConfiguracaoAnoLetivoRequest, token?: string) =>
    api.put<AtualizarConfiguracaoAnoLetivoResponse>(
      `${ADMIN_ANOS_LETIVOS_CONFIGURACOES_ENDPOINT}/${encodeURIComponent(type)}`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarFinalizacoesAnoLetivo: (params?: { type?: AnoLetivoTipo; ano_letivo?: string; token?: string }) => {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.ano_letivo) search.set('ano_letivo', ensureAnoLetivoFormato(params.ano_letivo));
    const qs = search.toString() ? `?${search.toString()}` : '';
    return api.get<ListarFinalizacoesAnoLetivoResponse>(
      `/admin/academias/anos-letivos/finalizacoes${qs}`,
      { token: params?.token || tokenStorage.get() || undefined }
    );
  },

  listarLimitesFinalizacaoAnoLetivo: (token?: string) =>
    api.get<ListarLimitesFinalizacaoAnoLetivoResponse>(
      '/admin/sistema/anos-letivos/finalizacao-limites',
      { token: token || tokenStorage.get() || undefined }
    ),

  criarAdmin: (data: CriarAdminRequest, token?: string) =>
    api.post<{ message: string; data: AdminDetalhado; aviso?: string }>(
      '/dominis/register',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  registrarAcademia: (data: CriarEscolaRequest | CriarUniversidadeRequest, token?: string) => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (typeof File !== 'undefined' && value instanceof File) {
        formData.append(key, value);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => formData.append(key, String(item)));
        return;
      }

      formData.append(key, String(value));
    });

    return api.postForm<{ message: string; codigo_academia: string; data: { codigo_academia: string; id: string; nome: string; nif: string; provincia: string } }>(
      '/dominis/academia/register',
      formData,
      { token: token || tokenStorage.get() || undefined }
    );
  },

  ativarAcademia: (codigoAcademia: string, token?: string) =>
    api.put<{ message: string }>(
      `/dominis/academia/${codigoAcademia}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarAcademia: (codigoAcademia: string, data: DesativarRequest, token?: string) =>
    api.put<{ message: string }>(
      `/dominis/academia/${codigoAcademia}/desativar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarAdmin: (adminId: string, token?: string) =>
    api.put<{ message: string; email: string }>(
      `/dominis/admin/${adminId}/ativar`,
      undefined,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarAdmin: (adminId: string, data: DesativarRequest, token?: string) =>
    api.put<{ message: string; email: string }>(
      `/dominis/admin/${adminId}/desativar`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  listarAdmins: (token?: string) =>
    api.get<ListarAdminsResponse>('/dominis/admin-lista', {
      token: token || tokenStorage.get() || undefined,
    }),

  getMetrics: (token?: string) =>
    api.get<{ metrics: Record<string, unknown> }>('/dominis/metrics', {
      token: token || tokenStorage.get() || undefined,
    }),

  getStorageQuota: (token?: string) =>
    api.get<StorageQuotaResponse>('/dominis/storage/quota', {
      token: token || tokenStorage.get() || undefined,
    }),

  listarSolicitacoesMatricula: (params?: ListarSolicitacoesMatriculaParams | string): Promise<ListarSolicitacoesMatriculaResponse> => {
    const isLegacy = typeof params === 'string';
    if (!isLegacy && !hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => adminService.listarSolicitacoesMatricula({ ...params, limit, offset }), 'solicitacoes');
    }
    const tok = isLegacy ? params : params?.token;
    const qs = isLegacy ? '' : buildSolicitacoesMatriculaQuery(params);
    return api.get<ListarSolicitacoesMatriculaResponse>(`/solicitacoes-matricula${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  listarSolicitacoesStatusAcademico: (params?: ListarSolicitacoesStatusAcademicoParams | string): Promise<ListarSolicitacoesStatusAcademicoResponse> => {
    const isLegacy = typeof params === 'string';
    if (!isLegacy && !hasExplicitPagination(params)) {
      return getAllPaginated((limit, offset) => adminService.listarSolicitacoesStatusAcademico({ ...params, limit, offset }), 'solicitacoes');
    }
    const tok = isLegacy ? params : params?.token;
    const qs = isLegacy ? '' : buildSolicitacoesStatusAcademicoQuery(params);
    return api.get<ListarSolicitacoesStatusAcademicoResponse>(`/academia/solicitacoes${qs}`, {
      token: tok || tokenStorage.get() || undefined,
    });
  },

  rebuildProjection: (name: string, token?: string) =>
    api.post<{ message: string; projection: string }>(
      `/dominis/projections/rebuild/${name}`,
      {},
      { token: token || tokenStorage.get() || undefined }
    ),

  rebuildProjectionAsync: (name: string, token?: string) =>
    api.post<AsyncBatchResponse>(
      `/dominis/projections/rebuild/${name}/async`,
      {},
      { token: token || tokenStorage.get() || undefined }
    ),

  consultarAdminPorEmail: (email: string, token?: string) =>
    api.get<{ admin: AdminDetalhado }>(
      `/dominis/consultar-admin/${encodeURIComponent(email)}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarRoleAdmin: (adminId: string, data: AtualizarRoleAdminRequest, token?: string) =>
    api.put<{ message: string; role_anterior: string; novo_role: string }>(
      `/dominis/admin/${adminId}/role`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  atualizarDadosAdmin: (adminId: string, data: AtualizarDadosAdminRequest, token?: string) =>
    api.put<{ message: string }>(
      `/dominis/admin/${adminId}/dados`,
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Async — academias ─────────────────────────────────────────────

  registrarAcademiaBatchAsync: (
    data: (CriarEscolaRequest | CriarUniversidadeRequest)[],
    token?: string
  ) =>
    api.post<AsyncBatchResponse>(
      '/dominis/academia/register/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  ativarAcademiaBatchAsync: (codigos: string[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/dominis/academia/ativar/async',
      codigos.map(codigo => ({ codigo })),
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarAcademiaBatchAsync: (
    data: { codigo: string; motivo: string }[],
    token?: string
  ) =>
    api.put<AsyncBatchResponse>(
      '/dominis/academia/desativar/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Async — admins ────────────────────────────────────────────────

  ativarAdminBatchAsync: (data: { id: string }[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/dominis/admin/ativar/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  desativarAdminBatchAsync: (data: { id: string; motivo: string }[], token?: string) =>
    api.put<AsyncBatchResponse>(
      '/dominis/admin/desativar/async',
      data,
      { token: token || tokenStorage.get() || undefined }
    ),

  // ── Jobs ─────────────────────────────────────────────────────────

  listarJobs: (token?: string) =>
    api.get<{ jobs: import('@/lib/api/job-service').JobSummary[]; total: number }>(
      '/jobs',
      { token: token || tokenStorage.get() || undefined }
    ),

  consultarJob: (jobId: string, token?: string) =>
    api.get<import('@/lib/api/job-service').JobSummary>(
      `/jobs/${jobId}`,
      { token: token || tokenStorage.get() || undefined }
    ),

  consultarJobComResultados: (jobId: string, token?: string) =>
    api.get<{ job: import('@/lib/api/job-service').JobSummary; results: import('@/lib/api/job-service').JobItemResult[] }>(
      `/jobs/${jobId}?results=true`,
      { token: token || tokenStorage.get() || undefined }
    ),
};
