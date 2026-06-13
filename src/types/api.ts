// src/types/api.ts

// =====================
// BASE TYPES
// =====================

export type UserType = 'academia' | 'estudante' | 'admin';
export type AdminType = 'gerente' | 'adm' | 'fpp';

/**
 * Natureza da academia: pública ou privada.
 * Antes era 'escola' | 'superior' — agora é 'public' | 'private'.
 */
export type AcademiaType = 'public' | 'private';

/**
 * Nível da academia: escola ou ensino superior.
 * Anteriormente este papel era desempenhado por AcademiaType.
 */
export type AcademiaNivel = 'escola' | 'superior';

export type NivelEscolar = 'fundamental' | 'medio' | 'misto';

export type AnoAcademico = AnoFundamental | AnoMedio | AnoSuperior;

/**
 * Anos do ensino fundamental. Formato: [1-9]_ano_fundamental
 */
export type AnoFundamental =
  | '1_ano_fundamental' | '2_ano_fundamental' | '3_ano_fundamental'
  | '4_ano_fundamental' | '5_ano_fundamental' | '6_ano_fundamental'
  | '7_ano_fundamental' | '8_ano_fundamental' | '9_ano_fundamental';

/**
 * Anos do ensino médio. Formato: [n]_ano_medio
 */
export type AnoMedio =
  | '1_ano_medio' | '2_ano_medio' | '3_ano_medio' | '4_ano_medio';

/**
 * Anos do ensino superior. Formato: [n]_ano_superior
 */
export type AnoSuperior =
  | '1_ano_superior' | '2_ano_superior' | '3_ano_superior'
  | '4_ano_superior' | '5_ano_superior' | '6_ano_superior';

/** @deprecated Use AnoFundamental | AnoMedio | AnoSuperior separadamente. */
export type AnoEscolar = AnoFundamental | AnoMedio;

export type StatusEscolar            = 'inativo' | 'em_andamento' | 'finalizado';
export type StatusEscolarFundamental = StatusEscolar;
export type StatusEscolarMedio       = StatusEscolar;
export type StatusSuperior           = 'inativo' | 'em_andamento' | 'finalizado';
export type StatusGeralEstudante     = 'inativo' | 'ativo' | 'arquivado';
export type StatusGeral              = StatusGeralEstudante;

/**
 * Períodos letivos.
 * - Escolar (fixo): 1_trimestre, 2_trimestre, 3_trimestre
 * - Superior (dinâmico): [n]_semestre
 */
export type Periodo =
  | '1_trimestre' | '2_trimestre' | '3_trimestre'
  | `${number}_semestre`;

export type CursoType   = 'medio' | 'superior';
export type MateriaType = 'fundamental' | 'medio' | 'superior';
export type Genero      = 'masculino' | 'feminino';

export type TipoEnsino = 'fundamental' | 'medio' | 'superior';
export type SolicitacaoMatriculaStatus = 'pendente' | 'aprovada' | 'reprovada';
/** Date-only ISO string (YYYY-MM-DD), correspondente ao tipo `date` na documentação da API. */
export type ApiDate = string;

// =====================
// REQUEST TYPES
// =====================

/**
 * Cadastrar uma escola (nível 'escola').
 * - nivel: discriminante — sempre 'escola'
 * - type: natureza da escola — 'public' | 'private'
 */
export interface CriarEscolaRequest {
  nivel: 'escola';
  type: AcademiaType;
  nome: string;
  provincia: string;
  endereco: string;
  numero_telefone?: string;
  email?: string;
  website?: string;
  nivel_escolar: NivelEscolar;
  cursos?: string[];
  anos_academicos?: string[];
}

/**
 * Cadastrar uma universidade/superior (nível 'superior').
 * - nivel: discriminante — sempre 'superior'
 * - type: natureza da instituição — 'public' | 'private'
 */
export interface CriarUniversidadeRequest {
  nivel: 'superior';
  type: AcademiaType;
  nome: string;
  provincia: string;
  endereco: string;
  numero_telefone?: string;
  email?: string;
  website?: string;
  cursos?: string[];
}

export interface LoginRequest {
  usuario: string;
  senha: string;
}

export interface CriarEstudanteRequest {
  nome: string;
  /** Obrigatório. "masculino" | "feminino" */
  genero: Genero;
  /** Obrigatório. Formato ISO: "YYYY-MM-DD". */
  data_nascimento: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  ano_escolar_fundamental?: string | null;
  ano_escolar_medio?: string | null;
  curso_medio_id?: string | null;
  ano_superior?: string | null;
  curso_superior_id?: string | null;
}


export interface MatricularFundamentalRequest {
  ano_escolar_fundamental: string;
}

export interface MatricularMedioRequest {
  ano_escolar_medio: string;
  curso_id: string;
}

export interface MatricularSuperiorRequest {
  curso_id: string;
}

export interface MotivoEstudanteRequest {
  motivo: string;
}

export type RevincularEstudanteRequest =
  | { tipo_ensino: 'fundamental'; ano_escolar_fundamental: string }
  | { tipo_ensino: 'medio'; ano_escolar_medio: string; curso_medio_id: string }
  | { tipo_ensino: 'superior'; curso_superior_id: string };

export interface MensagemResponse {
  message: string;
}

export interface DocumentosObrigatorios {
  declaracao: string[];
  certificado_6_ano_fundamental: string[];
  certificado_9_ano_fundamental: string[];
  certificado_ensino_medio: string[];
}

export interface AtualizarDocumentosObrigatoriosRequest {
  declaracao?: string[];
  certificado_6_ano_fundamental?: string[];
  certificado_9_ano_fundamental?: string[];
  certificado_ensino_medio?: string[];
}

export interface DocumentosObrigatoriosResponse {
  codigo_academia: string;
  documentos_obrigatorios: DocumentosObrigatorios;
}

export interface AtualizarDocumentosObrigatoriosResponse {
  message: string;
  documentos_obrigatorios: DocumentosObrigatorios;
}

export interface CriarSolicitacaoMatriculaRequest {
  codigo_academia: string;
  nome: string;
  genero: Genero;
  data_nascimento: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  ano_escolar_fundamental?: string;
  ano_escolar_medio?: string;
  curso_medio_id?: string;
  ano_superior?: string;
  curso_superior_id?: string;
  bi_estudante?: File;
  bi_responsavel?: File;
  cedula?: File;
  declaracao?: File;
  certificado_6_ano_fundamental?: File;
  certificado_9_ano_fundamental?: File;
  certificado_ensino_medio?: File;
}

export interface CriarSolicitacaoMatriculaResponse {
  message: string;
  codigo_solicitacao: string;
  codigo_academia: string;
  status: SolicitacaoMatriculaStatus;
}

export interface SolicitacaoMatriculaDocumento {
  nome?: string;
  path?: string;
  url?: string;
  content_type?: string;
  tamanho_bytes?: number;
}

export interface SolicitacaoMatricula {
  id?: string;
  codigo_solicitacao: string;
  codigo_academia: string;
  academia_nome?: string;
  nome: string;
  genero: Genero;
  data_nascimento: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  ano_escolar_fundamental?: string;
  ano_escolar_medio?: string;
  curso_medio_id?: string;
  curso_medio_nome?: string;
  ano_superior?: string;
  curso_superior_id?: string;
  curso_superior_nome?: string;
  documentos?: Record<string, SolicitacaoMatriculaDocumento | string>;
  status: SolicitacaoMatriculaStatus;
  codigo_estudante_gerado?: string;
  motivo_reprovacao?: string;
  aprovada_por?: string;
  reprovada_por?: string;
  created_at: string;
  updated_at?: string;
  version?: number;
}

export interface ListarSolicitacoesMatriculaParams {
  status?: SolicitacaoMatriculaStatus;
  codigo_academia?: string;
  limit?: number;
  offset?: number;
  token?: string;
}

export interface ListarSolicitacoesMatriculaResponse {
  solicitacoes: SolicitacaoMatricula[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface AprovarSolicitacaoMatriculaResponse {
  message: string;
  codigo_solicitacao: string;
  codigo_estudante_gerado: string;
}

export interface ReprovarSolicitacaoMatriculaRequest {
  motivo_reprovacao: string;
}

export interface AcademiaStorageUsage {
  codigo_academia: string;
  nome?: string;
  used_bytes: number;
  used_human: string;
}

export interface AccountFileUsage {
  path: string;
  name: string;
  size_bytes: number;
  size_human?: string;
  managed: boolean;
}

export interface StorageQuotaResponse {
  provider: string;
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  managed_bytes?: number;
  outside_academias_bytes?: number;
  unmanaged_bytes?: number;
  total_human: string;
  used_human: string;
  available_human: string;
  managed_human?: string;
  outside_academias_human?: string;
  unmanaged_human?: string;
  academias?: AcademiaStorageUsage[];
  account_files?: AccountFileUsage[];
}

export interface RegistrarFaltasRequest {
  codigo_estudante: string;
  ano_academico?: string;
  data: ApiDate;
  materia_disciplinar_id: string;
  quantidade: number;
  observacao?: string;
}

export interface CriarAdminRequest {
  nome: string;
  email: string;
  role: AdminType;
}

export interface DesativarRequest {
  motivo: string;
}

export interface CriarCursoRequest {
  nome: string;
  type: CursoType;
  anos_academicos: string[];
  /** Obrigatório para superior */
  periodos?: string[];
}

export interface AtualizarCursoRequest {
  nome?: string;
  anos_academicos?: string[];
  periodos?: string[];
}

export interface CriarMateriaRequest {
  nome: string;
  /**
   * Opcional: no backend atual o tipo é preenchido automaticamente,
   * exceto em academias escolares de nível misto.
   */
  type?: MateriaType;
  anos_academicos?: string[];
  curso_id?: string;
}

export interface AtualizarMateriaRequest {
  nome?: string;
}

/** PUT /academia/materias/:id/periodo */
export interface DefinirPeriodoMateriaRequest {
  periodo: string;
}

export interface AtualizarDadosPessoaisEstudanteRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  data_nascimento?: string;
}

export interface AtualizarDadosAcademicosEstudanteRequest {
  ano_escolar_fundamental?: string;
  ano_escolar_medio?: string;
  ano_superior?: string;
  semestre_atual?: number;
  curso_medio_id?: string;
  curso_superior_id?: string;
}

export interface AtualizarDadosAcademiaRequest {
  nome?: string;
  provincia?: string;
  endereco?: string;
  numero_telefone?: string;
  email?: string;
  website?: string;
  nivel_escolar?: string;
  cursos?: string[];
}

export interface AtualizarDadosAdminRequest {
  nome?: string;
  email?: string;
}

export interface AtualizarRoleAdminRequest {
  novo_role: AdminType;
}

export interface AlterarSenhaRequest {
  senha_atual: string;
  nova_senha: string;
}

export interface SolicitarRecuperacaoRequest {
  identificador: string;
  tipo: UserType;
}

export interface SolicitarVerificacaoRequest {
  identificador: string;
  tipo: UserType;
}

export interface AlterarCursoRequest {
  curso_id: string;
  tipo_ensino: 'medio' | 'superior';
}

/**
 * POST /academia/avaliacao-final
 * Campos alinhados com a API v1.5.5:
 *   - nivel_ano_academico_atual: nível académico atual
 *   - aprovado: resultado da avaliação
 *   - tipo_ensino é inferido automaticamente pelo backend
 *   - observacao: opcional — substitui validação automática de notas
 *
 * IMPORTANTE: proximo_ano_academico NÃO deve ser enviado.
 * O backend calcula automaticamente o próximo nível e retorna 400 se o campo for incluído.
 */
export interface RegistrarAvaliacaoFinalRequest {
  codigo_estudante: string;
  /** Nível académico atual (ex: '3_ano_fundamental', '2_ano_medio', '1_ano_superior') */
  nivel_ano_academico_atual: string;
  aprovado: boolean;
  observacao?: string;
}

/**
 * @deprecated Use RegistrarAvaliacaoFinalRequest.
 */
export interface RegistrarAprovacaoAnoRequest {
  codigo_estudante: string;
  tipo_ensino: TipoEnsino;
  nivel_atual: string;
  proximo_nivel?: string;
  aprovado: boolean;
  observacao?: string;
}

/**
 * Parâmetros de filtro para GET /notas
 * Proteção: admin ou academia
 */
export interface ListarNotasParams {
  /** Paginação: padrão 50, máximo 1000 */
  limit?: number;
  /** Paginação: padrão 0 */
  offset?: number;
  /** Ex: '2025_2026' */
  ano_letivo?: string | string[];
  /** Ex: '3_ano_fundamental' */
  ano_academico?: string | string[];
  /** UUID do curso (filtra por nível médio ou superior) */
  curso_id?: string | string[];
  /** Código da turma (requer codigo_academia em consultas admin) */
  codigo_turma?: string | string[];
  /** '1_trimestre' | '2_trimestre' | '3_trimestre' | '1_semestre' | '2_semestre' */
  periodo?: string | string[];
  /** UUID da matéria disciplinar */
  materia_disciplinar_id?: string | string[];
  /** Categoria da nota. Ex: 'nota_professor' | 'nota_escola' | 'nota_pp1' */
  categoria?: string | string[];
  /**
   * Código da academia.
   * Para admin: filtra por academia.
   * Para academia autenticada: ignorado (sempre usa o próprio código).
   */
  codigo_academia?: string | string[];
  /** Token JWT; usa tokenStorage.get() se omitido */
  token?: string;
}
 
/**
 * Parâmetros de filtro para GET /faltas
 * Proteção: admin ou academia
 */
export interface ListarFaltasParams {
  /** Paginação: padrão 50, máximo 1000 */
  limit?: number;
  /** Paginação: padrão 0 */
  offset?: number;
  /** Ex: '2025_2026' */
  ano_letivo?: string | string[];
  /** Ex: '3_ano_fundamental' */
  ano_academico?: string | string[];
  /** UUID do curso (filtra por nível médio ou superior) */
  curso_id?: string | string[];
  /** Código da turma (requer codigo_academia em consultas admin) */
  codigo_turma?: string | string[];
  /** Período da matéria: '1_trimestre' | '2_trimestre' | '3_trimestre' | '1_semestre' | '2_semestre' */
  periodo?: string | string[];
  /** UUID da matéria disciplinar */
  materia_disciplinar_id?: string | string[];
  /**
   * Código da academia.
   * Para admin: filtra por academia.
   * Para academia autenticada: ignorado (sempre usa o próprio código).
   */
  codigo_academia?: string | string[];
  /** Token JWT; usa tokenStorage.get() se omitido */
  token?: string;
}
 
/**
 * Parâmetros de filtro para GET /avaliacoes
 * Proteção: autenticado (qualquer tipo)
 */
export interface ListarAvaliacoesParams {
  /** 'fundamental' | 'medio' | 'superior' */
  tipo_ensino?: TipoEnsino;
  /** Ex: '2025_2026' */
  ano_letivo?: string;
  /** Ano académico em que o estudante foi re/aprovado. Ex: '3_ano_fundamental' */
  ano_academico_atual?: string;
  /** Código da turma (requer codigo_academia em consultas admin) */
  codigo_turma?: string;
  /**
   * Código da academia.
   * Para admin: filtra por academia.
   * Para academia autenticada: ignorado (sempre usa o próprio código).
   */
  codigo_academia?: string;
  /** Token JWT; usa tokenStorage.get() se omitido */
  token?: string;
}
 
/**
 * Parâmetros de filtro para GET /aprovacoes (aprovado = true)
 * Proteção: autenticado (qualquer tipo)
 */
export interface ListarAprovacoesParams {
  /** 'fundamental' | 'medio' | 'superior' */
  tipo_ensino?: TipoEnsino;
  /** Ex: '2025_2026' */
  ano_letivo?: string;
  /** Ano académico em que o estudante foi aprovado. Ex: '3_ano_fundamental' */
  ano_academico_atual?: string;
  /** Código da turma (requer codigo_academia em consultas admin) */
  codigo_turma?: string;
  /**
   * Código da academia.
   * Para admin: filtra por academia.
   * Para academia autenticada: ignorado (sempre usa o próprio código).
   */
  codigo_academia?: string;
  /** Token JWT; usa tokenStorage.get() se omitido */
  token?: string;
}
 
/**
 * Parâmetros de filtro para GET /reprovacoes (aprovado = false)
 * Proteção: autenticado (qualquer tipo)
 */
export interface ListarReprovacoesParams {
  /** 'fundamental' | 'medio' | 'superior' */
  tipo_ensino?: TipoEnsino;
  /** Ex: '2025_2026' */
  ano_letivo?: string;
  /** Ano académico em que o estudante foi reprovado. Ex: '3_ano_fundamental' */
  ano_academico_atual?: string;
  /** Código da turma (requer codigo_academia em consultas admin) */
  codigo_turma?: string;
  /**
   * Código da academia.
   * Para admin: filtra por academia.
   * Para academia autenticada: ignorado (sempre usa o próprio código).
   */
  codigo_academia?: string;
  /** Token JWT; usa tokenStorage.get() se omitido */
  token?: string;
}

// ── Notas ────────────────────────────────────────────────────────────────────

export type TipoNota = 'escolar' | 'superior';

export type CategoriaNotaEscolar =
  | 'nota_escola'
  | 'nota_professor';

export type CategoriaNotaSuperiorFixa =
  | 'nota_pp1'
  | 'nota_pp2'
  | 'nota_exame';

export type CategoriaNota =
  | CategoriaNotaEscolar
  | CategoriaNotaSuperiorFixa
  | string;

export interface RegistrarNotasRequest {
  codigo_estudante: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  tipo: TipoNota;
  categoria: CategoriaNota;
  nota: number;
  observacao?: string;
}

export interface AtualizarNotaRequest {
  id: string;
  nota_nova: number;
  observacao: string;
}

export interface AtualizarFaltaRequest {
  id: string;
  data?: ApiDate;
  materia_disciplinar_id?: string;
  quantidade?: number;
  observacao: string;
}

export interface CriarCategoriaNotaRequest {
  codigo: string;
  nome: string;
  descricao?: string;
  /** Anos acadêmicos nos quais a categoria pode ser usada. */
  anos_academicos: string[];
}

// ── Turmas ───────────────────────────────────────────────────────────────────

export interface CriarTurmaRequest {
  codigo_turma: string;
  nivel: string;
  turno: 'manha' | 'tarde' | 'noite';
  curso_id?: string;
}

export interface AtualizarTurmaRequest {
  nivel?: string;
  turno?: string;
  curso_id?: string;
}

export interface AdicionarEstudanteTurmaRequest {
  codigo_estudante: string;
}

// ── Ano Letivo ────────────────────────────────────────────────────────────────

/**
 * POST /academia/ano-letivo
 * tipo: 'escola' | 'superior'
 */
export interface DefinirAnoLetivoAcademiaRequest {
  ano_letivo: string; // formato: YYYY_YYYY  ex: "2025_2026"
  tipo: 'escola' | 'superior';
}

/**
 * POST /admin/sistema/ano-letivo
 * Define o ano letivo oficial global do sistema (apenas admin FPP).
 */
export interface DefinirAnoLetivoGlobalRequest {
  ano_letivo: string; // formato: YYYY_YYYY  ex: "2026_2027"
}

/**
 * @deprecated Substituído por DefinirAnoLetivoAcademiaRequest.
 */
export interface DefinirAnoLetivoRequest {
  ano_letivo: string;
}

// =====================
// RESPONSE TYPES
// =====================

export interface AuthResponse {
  token: string;
  nome: string;
  type: UserType;
  codigo?: string;
  email?: string;
  role?: AdminType;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ── Modelos de domínio ────────────────────────────────────────────────────────

export interface Nota {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  estudante_nome?: string;
  academia_nome?: string;
  ano_lectivo: string;
  ano_academico: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  materia_nome?: string;
  tipo: TipoNota;
  categoria: CategoriaNota;
  nota: number;
  observacao?: string;
  registered_at: string;
  event_id: string;
  version: number;
}

export interface Falta {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  estudante_nome?: string;
  academia_nome?: string;
  ano_lectivo: string;
  ano_academico: string;
  data: ApiDate;
  materia_disciplinar_id: string;
  materia_nome?: string;
  quantidade: number;
  observacao?: string;
  registered_at: string;
  event_id: string;
  version: number;
}

export interface AprovacaoAno {
  id: string;
  codigo_estudante: string;
  codigo_academia: string;
  ano_lectivo: string;
  tipo_ensino: TipoEnsino;
  nivel_atual: string;
  proximo_nivel?: string;
  aprovado: boolean;
  observacao?: string;
  registered_at: string;
  event_id: string;
  version: number;
}

/**
 * Avaliação final — projecção projection_avaliacao_final.
 * Campos alinhados com AvaliacaoFinalDTO do backend.
 */
export interface AvaliacaoFinal {
  id: string;
  event_id: string;
  codigo_estudante: string;
  codigo_academia: string;
  ano_lectivo: string;
  tipo_ensino: TipoEnsino;
  /** Campo real da projecção: ano_academico_atual */
  ano_academico_atual: string;
  proximo_ano_academico?: string;
  aprovado: boolean;
  observacao?: string;
  registered_at: string;
  version: number;
}

export interface Curso {
  id: string;
  nome: string;
  type: CursoType;
  anos_academicos: string[];
  periodos?: string[];
  codigo_academia: string;
  status: 'ativo' | 'inativo' | 'deletado';
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Materia {
  id: string;
  nome: string;
  type: MateriaType;
  anos_academicos?: string[];
  codigo_academia: string;
  curso_id?: string;
  /** Apenas para tipo 'superior'. */
  periodo?: string;
  status: 'ativo' | 'inativo' | 'deletado';
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Turma {
  id: string;
  codigo_turma: string;
  codigo_academia: string;
  nivel: string;
  curso_id?: string;
  turno: 'manha' | 'tarde' | 'noite';
  estudantes: string[];
  /**
   * Histórico de estudantes por ano letivo.
   * Chave: ano_letivo (ex: "2025_2026") → valor: lista de codigo_estudante
   */
  historico_estudantes_ano_letivo?: Record<string, string[]>;
  status: 'ativo' | 'inativo' | 'deletado';
  status_alterado_por?: string;
  status_alterado_em?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  version: number;
}

export interface CategoriaNotaItem {
  id: string;
  codigo_academia: string;
  codigo: string;
  nome: string;
  descricao?: string;
  /** Anos acadêmicos nos quais a categoria pode receber notas. */
  anos_academicos: string[];
  adicionado_por?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  version: number;
}

export interface Evento {
  id: number;
  event_id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  event_version: number;
  payload: any;
  metadata: any;
  occurred_at: string;
  recorded_at: string;
  ledger_hash: string;
  previous_hash?: string;
}

// ── Perfis ────────────────────────────────────────────────────────────────────

export interface EstudanteDetalhado {
  id: string;
  nome: string;
  codigo_estudante: string;
  email?: string;
  telefone?: string;
  email_verificado: boolean;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  genero: Genero;
  data_nascimento: string;
  codigo_academia?: string;
  status: StatusGeral;
  status_escolar_fundamental: StatusEscolar;
  status_escolar_medio: StatusEscolar;
  status_superior: StatusSuperior;
  ano_escolar_fundamental?: string;
  ano_escolar_medio?: string;
  ano_superior?: string;
  semestre_atual?: number;
  curso_medio_id?: string;
  curso_superior_id?: string;
  total_notas?: number;
  total_faltas?: number;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface AcademiaDetalhada {
  id: string;
  /**
   * Nível da academia: 'escola' | 'superior'.
   * Antes este papel era do campo type.
   */
  nivel: AcademiaNivel;
  /**
   * Natureza da academia: 'public' | 'private'.
   */
  type: AcademiaType;
  nome: string;
  codigo_academia: string;
  provincia: string;
  endereco: string;
  numero_telefone?: string;
  email?: string;
  email_verificado: boolean;
  website?: string;
  nivel_escolar?: NivelEscolar;
  anos_academicos?: string[];
  status: string;
  cursos: string[];
  created_at: string;
  updated_at?: string;
  total_estudantes: number;
  version: number;
  ano_letivo?: string;
  tipo_ano_letivo?: 'escola' | 'superior';
  ano_letivo_ativado_em?: string;
  anos_letivos_lista?: Array<{ ano_letivo: string; tipo: 'escola' | 'superior'; definido_por: string; definido_em: string }>;
  documentos_obrigatorios: DocumentosObrigatorios;
}

export interface AdminDetalhado {
  id: string;
  nome: string;
  email: string;
  email_verificado: boolean;
  role: AdminType;
  status: string;
  created_at: string;
}

// ── Respostas de listagem ─────────────────────────────────────────────────────

export interface ListarCursosResponse {
  cursos: Curso[];
  total: number;
}

export interface ListarMateriasResponse {
  materias: Materia[];
  total: number;
}

export interface ListarTurmasResponse {
  turmas: Turma[];
}

export interface ListarCategoriasNotaResponse {
  categorias: CategoriaNotaItem[];
  total: number;
}

export interface ListarNotasResponse {
  notas: Nota[];
  total: number;
  total_geral: number;
  limit: number;
  offset: number;
}

export interface ListarFaltasResponse {
  faltas: Falta[];
  total: number;
  total_geral: number;
  limit: number;
  offset: number;
}

export interface NotasEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  notas: Nota[];
  total: number;
}

export interface FaltasEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  faltas: Falta[];
  total: number;
}

export interface AprovacoesEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  aprovacoes: AprovacaoAno[];
  total: number;
}

/** GET /avaliacoes e GET /estudante/minhas-avaliacoes */
export interface ListarAvaliacoesResponse {
  avaliacoes: AvaliacaoFinal[];
  total: number;
}

/** GET /avaliacoes-estudante/:codigo */
export interface AvaliacoesEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  avaliacoes: AvaliacaoFinal[];
  total: number;
}

/** GET /aprovacoes */
export interface ListarAprovacoesResponse {
  aprovacoes: AvaliacaoFinal[];
  total: number;
}

/** GET /reprovacoes */
export interface ListarReprovacoesResponse {
  reprovacoes: AvaliacaoFinal[];
  total: number;
}

export interface EventosEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  eventos: Evento[];
  total: number;
  message: string;
}

export interface VerificarIntegridadeResponse {
  codigo_estudante: string;
  nome: string;
  integro: boolean;
  message: string;
}

/** GET /academia/ano-letivo */
export interface AnoLetivoAcademiaResponse {
  ano_letivo: string;
  tipo?: 'escola' | 'superior';
  ativado_em?: string;
  /** Ano letivo oficial global definido pelo sistema (admin FPP). */
  ano_letivo_oficial?: string;
}

/**
 * @deprecated Substituído por AnoLetivoAcademiaResponse.
 */
export interface AnoLetivoResponse {
  ano_letivo: string;
}

export interface DefinirAnoLetivoResponse {
  message: string;
  ano_letivo: string;
  tipo?: string;
  /** Ano letivo oficial global definido pelo sistema (admin FPP). */
  ano_letivo_oficial?: string;
}

export interface DefinirAnoLetivoGlobalResponse {
  message: string;
  ano_letivo: string;
}

/** GET /admin/sistema/ano-letivo */
export interface AnoLetivoGlobalResponse {
  ano_letivo: string;
  definido_em?: string;
  definido_por?: string;
}

/** GET /admin/sistema/anos-letivos-lista */
export interface ListarAnosLetivosGlobalResponse {
  anos_letivos_lista: Array<{
    ano_letivo: string;
    definido_por?: string;
    definido_em?: string;
  }>;
}

/** GET /academia/anos-letivos-lista */
export interface ListarAnosLetivosAcademiaResponse {
  anos_letivos_lista: Array<{
    ano_letivo: string;
    tipo?: 'escola' | 'superior';
    definido_por?: string;
    definido_em?: string;
  }>;
}

export interface AlterarCursoResponse {
  message: string;
  codigo_estudante: string;
  tipo_ensino: string;
  curso_id: string;
  curso_nome: string;
}

export interface DeletarTurmaResponse {
  message: string;
  codigo_turma: string;
  auditavel: true;
}

export interface DeletarCursoResponse {
  message: string;
  curso_id: string;
  nome: string;
  materias_deletadas: string[];
  turmas_deletadas: string[];
  auditavel: true;
}

export interface ListarAdminsResponse {
  admins: AdminDetalhado[];
  total: number;
}

export interface PrimeiroAdminResponse {
  message: string;
  admin: AdminDetalhado;
}

/**
 * GET /turmas-estudante/:codigo
 * Retorna as turmas de um estudante com autorização por perfil.
 */
export interface TurmasEstudanteResponse {
  codigo_estudante: string;
  nome: string;
  turmas: Turma[];
  total: number;
}

// ── Perfil e consultas ────────────────────────────────────────────────────────

/**
 * GET /meu-perfil
 * Retorna { tipo, academia } | { tipo, admin } | { tipo, estudante }
 */
export interface MeuPerfilResponse {
  tipo: UserType;
  estudante?: EstudanteDetalhado & {
    /**
     * Informações da academia vinculada ao estudante.
     * - nivel: 'escola' | 'superior'
     * - type: 'public' | 'private'
     */
    academia_info?: {
      codigo: string;
      nome: string;
      nivel: AcademiaNivel;
      type: AcademiaType;
    };
    /** @deprecated Use academia_info */
    academia?: {
      codigo: string;
      nome: string;
      nivel: AcademiaNivel;
      type: AcademiaType;
    };
    curso_medio?: {
      id: string;
      nome: string;
      type: CursoType;
      status: string;
    };
    curso_superior?: {
      id: string;
      nome: string;
      type: CursoType;
      status: string;
    };
  };
  academia?: AcademiaDetalhada;
  admin?: AdminDetalhado;
}

export interface ConsultarEstudanteResponse {
  estudante: EstudanteDetalhado & {
    academia?: {
      codigo: string;
      nome: string;
      nivel: AcademiaNivel;
      type: AcademiaType;
    };
    curso_medio?: {
      id: string;
      nome: string;
      type: CursoType;
      status: string;
    };
    curso_superior?: {
      id: string;
      nome: string;
      type: CursoType;
      status: string;
    };
  };
}

export interface ConsultarAcademiaResponse {
  academia: AcademiaDetalhada & {
    motivo_desativacao?: string;
  };
}

export interface ConsultarAcademiasResponse {
  academias: AcademiaDetalhada[];
  total: number;
  tipo_usuario: UserType;
}

export interface ConsultarEstudantesResponse {
  estudantes: EstudanteDetalhado[];
  total: number;
  tipo_usuario: UserType;
  codigo_academia?: string;
  nome_academia?: string;
}

export interface BuscarUsuarioResponse {
  tipo: UserType;
  usuario: EstudanteDetalhado | AcademiaDetalhada | AdminDetalhado;
}

// ── Event Sourcing / Registros ───────────────────────────────────────────────

export interface RegistroCompleto {
  notas?: Nota[];
  total_notas?: number;
  total_notas_geral?: number;
  faltas?: Falta[];
  total_faltas?: number;
  total_faltas_geral?: number;
  estatisticas?: {
    total_estudantes: number;
    total_academias: number;
    total_notas: number;
    total_faltas: number;
  };
  limit?: number;
  offset?: number;
  filtro_tipo?: string;
}

// =====================
// PROVÍNCIAS
// =====================

export interface Provincia {
  nome: ProvinciaNome;
  codigo: ProvinciaCodigo;
}

export type ProvinciaNome =
  | 'BENGO' | 'BENGUELA' | 'BIE' | 'CABINDA' | 'CUANDO CUBANGO'
  | 'CUANZA NORTE' | 'CUANZA SUL' | 'CUBANGO' | 'CUNENE' | 'HUAMBO'
  | 'HUILA' | 'ICOLO E BENGO' | 'LUANDA' | 'LUNDA NORTE' | 'LUNDA SUL'
  | 'MALANJE' | 'MOXICO' | 'MOXICO LESTE' | 'NAMIBE' | 'UIGE' | 'ZAIRE';

export type ProvinciaCodigo =
  | 'BGO' | 'BGU' | 'BIE' | 'CAB' | 'CND' | 'CNO' | 'CUS'
  | 'CBG' | 'CNN' | 'HUA' | 'HUI' | 'IBG' | 'LUA'
  | 'LNO' | 'LSU' | 'MAL' | 'MOX' | 'MXL' | 'NAM'
  | 'UIG' | 'ZAI';

export const Provincias: Provincia[] = [
  { nome: 'BENGO',          codigo: 'BGO' },
  { nome: 'BENGUELA',       codigo: 'BGU' },
  { nome: 'BIE',            codigo: 'BIE' },
  { nome: 'CABINDA',        codigo: 'CAB' },
  { nome: 'CUANDO CUBANGO', codigo: 'CND' },
  { nome: 'CUANZA NORTE',   codigo: 'CNO' },
  { nome: 'CUANZA SUL',     codigo: 'CUS' },
  { nome: 'CUBANGO',        codigo: 'CBG' },
  { nome: 'CUNENE',         codigo: 'CNN' },
  { nome: 'HUAMBO',         codigo: 'HUA' },
  { nome: 'HUILA',          codigo: 'HUI' },
  { nome: 'ICOLO E BENGO',  codigo: 'IBG' },
  { nome: 'LUANDA',         codigo: 'LUA' },
  { nome: 'LUNDA NORTE',    codigo: 'LNO' },
  { nome: 'LUNDA SUL',      codigo: 'LSU' },
  { nome: 'MALANJE',        codigo: 'MAL' },
  { nome: 'MOXICO',         codigo: 'MOX' },
  { nome: 'MOXICO LESTE',   codigo: 'MXL' },
  { nome: 'NAMIBE',         codigo: 'NAM' },
  { nome: 'UIGE',           codigo: 'UIG' },
  { nome: 'ZAIRE',          codigo: 'ZAI' },
];

// =====================
// HELPERS
// =====================

export function formatAnoLetivo(valor: string): string {
  return valor.replace('_', '/');
}

export function gerarOpcoesAnoLetivo(): { valor: string; label: string }[] {
  const anoAtual = new Date().getFullYear();
  return [
    { valor: `${anoAtual - 1}_${anoAtual}`, label: `${anoAtual - 1}/${anoAtual}` },
    { valor: `${anoAtual}_${anoAtual + 1}`, label: `${anoAtual}/${anoAtual + 1}` },
  ];
}

export function isAnoFundamentalValido(ano: string): ano is AnoFundamental {
  return /^[1-9]_ano_fundamental$/.test(ano);
}

export function isAnoMedioValido(ano: string): ano is AnoMedio {
  return /^[1-9]\d*_ano_medio$/.test(ano);
}

export function isAnoSuperiorValido(ano: string): ano is AnoSuperior {
  return /^[1-9]\d*_ano_superior$/.test(ano);
}

export function isSemestreValido(periodo: string): boolean {
  return /^[1-9]\d*_semestre$/.test(periodo);
}

export function gerarAnosFundamentais(): AnoFundamental[] {
  return Array.from({ length: 9 }, (_, i) => `${i + 1}_ano_fundamental` as AnoFundamental);
}

export function formatAnoAcademico(ano: string): string {
  const match = ano.match(/^(\d+)_ano_(fundamental|medio|superior)$/);
  if (!match) return ano;
  const [, n, tipo] = match;
  const label = { fundamental: 'Fundamental', medio: 'Médio', superior: 'Superior' }[tipo] ?? tipo;
  return `${n}.º Ano (${label})`;
}

export function formatDataNascimento(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function dateToIso(date: Date): string {
  return date.toISOString().split('T')[0];
}
