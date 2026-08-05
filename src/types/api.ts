// src/types/api.ts

// =====================
// BASE TYPES
// =====================

export type UserType = 'academia' | 'estudante' | 'admin';
export type AdminRole = 'fpp' | 'adm' | 'gerente';
export type AdminType = AdminRole;

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
export type AnoSuperior = `${number}_ano_superior`;

/** @deprecated Use AnoFundamental | AnoMedio | AnoSuperior separadamente. */
export type AnoEscolar = AnoFundamental | AnoMedio;

export type StatusEscolar            = 'inativo' | 'em_andamento' | 'finalizado';
export type StatusEscolarFundamental = StatusEscolar;
export type StatusEscolarMedio       = StatusEscolar;
export type StatusSuperior           = 'inativo' | 'em_andamento' | 'finalizado';
export type StatusGeralEstudante     = 'inativo' | 'ativo' | 'arquivado' | 'pendente_documentos';
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
export type ModeloCursoMedio = 'liceu' | 'tecnico';
export type MateriaType = 'fundamental' | 'medio' | 'superior';
export type Turno = 'manha' | 'tarde' | 'noite';
export type Genero      = 'masculino' | 'feminino';

export type TipoEnsino = 'fundamental' | 'medio' | 'superior';
export type SolicitacaoMatriculaStatus = 'pendente' | 'aprovada' | 'reprovada' | 'cancelada';
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';
export type JobEventType = 'job_enqueued' | 'job_progress' | 'job_done' | 'job_failed';
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
  nif: string;
  alvara: File;
  provincia: string;
  endereco: string;
  telefone?: string;
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
  nif: string;
  alvara: File;
  provincia: string;
  endereco: string;
  telefone?: string;
  email?: string;
  website?: string;
  cursos?: string[];
}


export interface AnoLetivoItem {
  ano_letivo: string;
  tipo: 'escolar' | 'superior';
  definido_por: string;
  definido_em: string;
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
  data_nascimento: ApiDate;
  email?: string;
  telefone?: string;
  telefone_encarregado?: string;
  /** Não pode ser igual ao BI do encarregado de educação (trim + case-insensitive). */
  bilhete_identidade?: string;
  /** Não pode ser igual ao BI do estudante (trim + case-insensitive). */
  bilhete_identidade_encarregado?: string;
  ano_escolar_fundamental?: string | null;
  ano_escolar_medio?: string | null;
  curso_medio_id?: string | null;
  ano_superior?: string | null;
  curso_superior_id?: string | null;
  /** Obrigatório quando `declaracao` for enviada; deve ser o ano acadêmico imediatamente anterior. */
  declaracao_ano_academico?: string;
  bi_estudante?: File;
  bi_encarregado?: File;
  cedula_estudante?: File;
  declaracao?: File;
  certificado_6_ano_fundamental?: File;
  certificado_9_ano_fundamental?: File;
  certificado_ensino_medio?: File;
}


export interface MotivoEstudanteRequest {
  motivo: string;
}

export type SolicitacaoStatusAcademicoTipo = 'interrupcao' | 'desvinculacao' | 'revinculacao';
export type SolicitacaoStatusAcademicoStatus = 'pendente' | 'aprovada' | 'reprovada' | 'cancelada';

export interface CriarSolicitacaoStatusAcademicoRequest {
  motivo: string;
}

export interface CriarSolicitacaoRevinculacaoRequest extends CriarSolicitacaoStatusAcademicoRequest {
  tipo_ensino?: TipoEnsino;
  curso_medio_id?: string | null;
  curso_superior_id?: string | null;
}

export interface CriarSolicitacaoStatusAcademicoResponse {
  message: string;
  codigo_solicitacao: string;
  status: SolicitacaoStatusAcademicoStatus;
}

export interface SolicitacaoStatusAcademico {
  id?: string;
  codigo_solicitacao: string;
  codigo_academia: string;
  academia_nome?: string;
  codigo_estudante: string;
  estudante_nome?: string;
  tipo: SolicitacaoStatusAcademicoTipo;
  status: SolicitacaoStatusAcademicoStatus;
  motivo: string;
  tipo_ensino?: TipoEnsino;
  curso_medio_id?: string | null;
  curso_superior_id?: string | null;
  observacao_academia?: string;
  motivo_reprovacao?: string;
  created_at: string;
  updated_at?: string;
}

export interface ListarSolicitacoesStatusAcademicoParams {
  status?: SolicitacaoStatusAcademicoStatus | SolicitacaoStatusAcademicoStatus[];
  tipo?: SolicitacaoStatusAcademicoTipo | SolicitacaoStatusAcademicoTipo[];
  codigo_academia?: string;
  codigo_estudante?: string;
  limit?: number;
  offset?: number;
  token?: string;
}

export interface ListarSolicitacoesStatusAcademicoResponse {
  solicitacoes: SolicitacaoStatusAcademico[];
  total: number;
  total_geral?: number;
  limit?: number;
  offset?: number;
}

export interface DecidirSolicitacaoStatusAcademicoRequest {
  solicitacao_id: string;
  observacao_academia?: string;
}

export interface ReprovarSolicitacaoStatusAcademicoRequest {
  solicitacao_id: string;
  motivo_reprovacao: string;
}

export interface DecidirSolicitacaoStatusAcademicoResponse {
  message: string;
  codigo_solicitacao?: string;
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
  data_nascimento: ApiDate;
  email?: string;
  telefone?: string;
  telefone_encarregado?: string;
  /** Quando ambos forem enviados, não podem ser iguais (trim + case-insensitive). */
  bilhete_identidade?: string;
  bilhete_identidade_encarregado?: string;
  ano_escolar_fundamental?: string;
  ano_escolar_medio?: string;
  curso_medio_id?: string;
  ano_superior?: string;
  curso_superior_id?: string;
  /** Obrigatório quando `declaracao` for enviada; deve ser o ano acadêmico imediatamente anterior. */
  declaracao_ano_academico?: string;
  bi_estudante?: File;
  bi_encarregado?: File;
  cedula_estudante?: File;
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
  documento_id?: string;
  tipo?: string;
  nivel?: 'fundamental' | 'medio' | 'superior' | 'escopo_desconhecido' | string;
  ano_academico?: string;
  versao?: number;
  path: string;
  file_url?: string;
  download_url?: string;
}

export interface SolicitacaoMatricula {
  id?: string;
  codigo_solicitacao: string;
  codigo_academia: string;
  academia_nome?: string;
  nome: string;
  genero: Genero;
  data_nascimento: ApiDate;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_encarregado?: string;
  ano_escolar_fundamental?: string;
  ano_escolar_medio?: string;
  curso_medio_id?: string;
  curso_medio_nome?: string;
  ano_superior?: string;
  curso_superior_id?: string;
  curso_superior_nome?: string;
  documentos?: Record<string, SolicitacaoMatriculaDocumento>;
  status: SolicitacaoMatriculaStatus;
  /** Códigos de outras solicitações mapeadas pelo backend como semelhantes a esta. */
  solicitacoes_semelhantes: string[];
  codigo_estudante_gerado?: string;
  motivo_reprovacao?: string;
  aprovada_por?: string;
  reprovada_por?: string;
  created_at: string;
  updated_at?: string;
  version?: number;
}

export interface ListarSolicitacoesMatriculaParams {
  status?: SolicitacaoMatriculaStatus | SolicitacaoMatriculaStatus[];
  codigo_academia?: string;
  limit?: number;
  offset?: number;
  token?: string;
}

export interface ListarSolicitacoesMatriculaResponse {
  solicitacoes: SolicitacaoMatricula[];
  total: number;
  total_geral?: number;
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
  provider: 'mega' | 'local' | string;
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

export interface MateriasChaveCursoAnoDTO {
  ano_academico: AnoMedio;
  materias_chave: string[];
}

export type CriarCursoMedioRequest = {
  nome: string;
  /** Modelo do curso médio. O backend usa essa escolha para montar os anos automaticamente. */
  modelo: ModeloCursoMedio;
};

export type CriarCursoSuperiorRequest = {
  nome: string;
  /** Obrigatório para superior: quantidade total de semestres. */
  quantidade_semestres: number;
};

export type CriarCursoRequest = CriarCursoMedioRequest | CriarCursoSuperiorRequest;

export type AtualizarCursoRequest = {
  nome?: string;
};

export type CriarMateriaFundamentalRequest = {
  nome: string;
  type?: 'fundamental';
  /** Fundamental permite 1 a 9 anos acadêmicos próprios da academia. */
  anos_academicos: AnoFundamental[];
  curso_id?: never;
  periodo?: never;
  pendencia_permitida?: never;
  pendencia_nivel_conclusao?: never;
};

export type CriarMateriaMedioRequest = {
  nome: string;
  type?: 'medio';
  /** Médio exige exatamente um ano acadêmico pertencente ao curso. */
  anos_academicos: AnoMedio[];
  curso_id: string;
  periodo?: never;
  pendencia_permitida?: never;
  pendencia_nivel_conclusao?: never;
};

export type CriarMateriaSuperiorRequest = {
  nome: string;
  type?: 'superior';
  /** Superior exige exatamente um ano acadêmico calculado pelo curso. */
  anos_academicos: string[];
  curso_id: string;
  /** Obrigatório no POST; a rota legado de definição posterior foi removida. */
  periodo: AnoSuperior;
  pendencia_permitida?: boolean;
  pendencia_nivel_conclusao?: AnoSuperior;
};

export type CriarMateriaRequest =
  | CriarMateriaFundamentalRequest
  | CriarMateriaMedioRequest
  | CriarMateriaSuperiorRequest;

export interface AtualizarMateriaRequest {
  nome?: string;
  anos_academicos?: string[];
  curso_id?: string;
  /** Apenas matérias superiores podem aceitar pendência. */
  pendencia_permitida?: boolean;
  /** Apenas matérias superiores: semestre limite para concluir a pendência. */
  pendencia_nivel_conclusao?: string;
}

export type CampoEdicaoDadoEstudante =
  | 'nome'
  | 'bilhete_identidade'
  | 'bilhete_identidade_encarregado'
  | 'data_nascimento';

export type StatusSolicitacaoEdicaoDadoEstudante = 'pendente' | 'aprovada' | 'reprovada';

/**
 * @deprecated A rota genérica PUT /estudante/dados-pessoais foi removida.
 * Use as solicitações documentadas de edição de dados sensíveis e
 * AtualizarTelefoneEncarregadoEstudanteRequest para telefone do encarregado.
 */
export interface AtualizarDadosPessoaisEstudanteRequest {
  nome?: string;
  telefone_encarregado?: string;
  /** Quando ambos forem enviados, não podem ser iguais (trim + case-insensitive). */
  bilhete_identidade?: string;
  bilhete_identidade_encarregado?: string;
  data_nascimento?: ApiDate;
}

export interface AtualizarTelefoneEncarregadoEstudanteRequest {
  telefone_encarregado: string;
}

export interface CriarSolicitacaoEdicaoDadoEstudanteRequest {
  novo_valor: string;
  documento: File;
}

export interface CriarSolicitacaoEdicaoDadoEstudanteResponse {
  message: string;
  codigo_solicitacao: string;
  campo: CampoEdicaoDadoEstudante;
  status: StatusSolicitacaoEdicaoDadoEstudante;
}

export interface SolicitacaoEdicaoDadoEstudante {
  codigo_solicitacao: string;
  codigo_estudante: string;
  codigo_academia: string;
  campo: CampoEdicaoDadoEstudante;
  valor_atual: string;
  valor_solicitado: string;
  documento_temporario_path?: string;
  documento_temporario_url?: string;
  documento?: SolicitacaoMatriculaDocumento | null;
  documentos?: Record<string, SolicitacaoMatriculaDocumento | string | null | undefined>;
  status: StatusSolicitacaoEdicaoDadoEstudante;
  motivo_reprovacao?: string | null;
  solicitado_por: string;
  decidido_por?: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ListarSolicitacoesEdicaoDadoEstudanteParams {
  status?: StatusSolicitacaoEdicaoDadoEstudante;
  campo?: CampoEdicaoDadoEstudante;
  codigo_estudante?: string;
  limit?: number;
  offset?: number;
}

export interface DecidirSolicitacaoEdicaoDadoEstudanteResponse {
  message: string;
  codigo_solicitacao: string;
  status: StatusSolicitacaoEdicaoDadoEstudante;
}

export interface ReprovarSolicitacaoEdicaoDadoEstudanteRequest {
  motivo_reprovacao: string;
}

export interface ListarSolicitacoesEdicaoDadoEstudanteResponse {
  solicitacoes: SolicitacaoEdicaoDadoEstudante[];
  limit: number;
  offset: number;
  total: number;
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
  website?: string;
}

export interface AtualizarEmailUsuarioRequest {
  email: string;
}

export interface AtualizarTelefoneUsuarioRequest {
  telefone: string;
}

export interface AtualizarDadosAdminRequest {
  nome?: string;
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
 * @deprecated A avaliação final não possui rota pública de execução manual.
 * Configure regras em /academia/avaliacao-final/regras e registre notas;
 * o backend calcula automaticamente nota_final, aprovado e progressão.
 */
export interface RegistrarAvaliacaoFinalRequest {
  codigo_estudante: string;
  /** Nível académico atual (ex: '3_ano_fundamental', '2_ano_medio', '1_semestre') */
  nivel_ano_academico_atual: string;
  /** @deprecated O backend calcula aprovado pela fórmula da regra. */
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
  /** Paginação: padrão 50, máximo 100 */
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
  /** Categoria da nota. Ex: 'nota_professor' | 'prova_trimestral' | 'exame_final' */
  categoria?: string | string[];
  /**
   * Código da academia.
   * Para admin: filtra por academia.
   * Para academia autenticada: ignorado (sempre usa o próprio código).
   */
  codigo_academia?: string | string[];
  /** Tipo de avaliação final, quando este filtro for usado pelo backend. */
  type?: string | string[];
  /** Token JWT; usa tokenStorage.get() se omitido */
  token?: string;
}
 
/**
 * Parâmetros de filtro para GET /faltas
 * Proteção: admin ou academia
 */
export interface ListarFaltasParams {
  /** Paginação: padrão 50, máximo 100 */
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
  /** Filtro `type` aceito por GET /faltas. */
  type?: string | string[];
  /** Token JWT; usa tokenStorage.get() se omitido */
  token?: string;
}
 
/**
 * Parâmetros de filtro para GET /avaliacoes
 * Proteção: autenticado (qualquer tipo)
 */
export interface ListarAvaliacoesParams {
  /** Paginação: padrão 50, máximo 100 */
  limit?: number;
  /** Paginação: padrão 0 */
  offset?: number;
  /** Filtro oficial atual da API: 'fundamental' | 'medio' | 'superior'. */
  nivel?: TipoEnsino;
  /** Ex: '2025_2026' */
  ano_letivo?: string;
  /** Ano académico/semestre em que o estudante foi re/aprovado. Ex: '3_ano_fundamental' ou '2_semestre' */
  ano_academico_atual?: string;
  /** Etapa pública da regra de avaliação final: normal, recurso, especial, etc. */
  type?: string;
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
  /** Paginação: padrão 50, máximo 100 */
  limit?: number;
  /** Paginação: padrão 0 */
  offset?: number;
  /** Filtro oficial atual da API: 'fundamental' | 'medio' | 'superior'. */
  nivel?: TipoEnsino;
  /** Ex: '2025_2026' */
  ano_letivo?: string;
  /** Ano académico/semestre em que o estudante foi aprovado. Ex: '3_ano_fundamental' ou '2_semestre' */
  ano_academico_atual?: string;
  /** Etapa pública da regra de avaliação final: normal, recurso, especial, etc. */
  type?: string;
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
  /** Paginação: padrão 50, máximo 100 */
  limit?: number;
  /** Paginação: padrão 0 */
  offset?: number;
  /** Filtro oficial atual da API: 'fundamental' | 'medio' | 'superior'. */
  nivel?: TipoEnsino;
  /** Ex: '2025_2026' */
  ano_letivo?: string;
  /** Ano académico/semestre em que o estudante foi reprovado. Ex: '3_ano_fundamental' ou '2_semestre' */
  ano_academico_atual?: string;
  /** Etapa pública da regra de avaliação final: normal, recurso, especial, etc. */
  type?: string;
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
  | 'nota_professor'
  | 'prova_trimestral'
  | 'exame_final'
  | 'exame_recurso'
  | 'nota_pap';

export type CategoriaNota = CategoriaNotaEscolar | string;


/**
 * Fórmula textual declarativa (`formula_textual_v1`) usada pelo backend para
 * avaliação final. Ex.: `([nota_professor,1_trimestre]+[prova_trimestral,1_trimestre])/2`.
 */
export type AvaliacaoFinalFormulaTextual = string;

export type EscopoMateriaAplicavelFundamental = {
  ano_academico: string;
  materias: string[];
};

export type EscopoMateriaAplicavelCurso = {
  curso_id: string;
  ano_academico: string;
  materias: string[];
};

export type EscopoAnosAcademicosMedio = {
  curso_id: string;
  anos_academicos: AnoMedio[];
};

interface CriarRegraAvaliacaoFinalBaseRequest {
  /** Obrigatório. Identifica a etapa pública; espaços são normalizados pelo backend. */
  type: string;
  nome: string;
  descricao?: string;
  nota_minima_aprovacao: number;
  /** O backend extrai automaticamente a partir de formula quando omitido. */
  categorias_envolvidas?: CategoriaNota[];
  /** Fórmula textual v1; o modelo JSON em árvore antigo foi removido. */
  formula: AvaliacaoFinalFormulaTextual;
  /** Exclusivo de regra raiz; descendentes são acionadas por reprovação ancestral. */
  nota_despertadora?: string;
  aplica_se_reprovado_em_type?: string | null;
}

export type CriarRegraAvaliacaoFinalRequest =
  | (CriarRegraAvaliacaoFinalBaseRequest & {
      nivel: 'fundamental';
      anos_academicos: AnoFundamental[];
      materias_aplicaveis?: EscopoMateriaAplicavelFundamental[];
      limite_materias_pendentes?: never;
    })
  | (CriarRegraAvaliacaoFinalBaseRequest & {
      nivel: 'medio';
      anos_academicos: EscopoAnosAcademicosMedio[];
      materias_aplicaveis?: EscopoMateriaAplicavelCurso[];
      limite_materias_pendentes: number;
    })
  | (CriarRegraAvaliacaoFinalBaseRequest & {
      nivel: 'superior';
      anos_academicos?: never;
      materias_aplicaveis?: EscopoMateriaAplicavelCurso[];
      limite_materias_pendentes: number;
    });

export interface EditarRegraAvaliacaoFinalRequest {
  nome: string;
  descricao?: string;
  nota_minima_aprovacao: number;
  formula: AvaliacaoFinalFormulaTextual;
}

export interface RegraAvaliacaoFinal {
  id: string;
  codigo_academia: string;
  type: string;
  nome: string;
  descricao?: string;
  nivel: TipoEnsino;
  anos_academicos?: string[] | EscopoAnosAcademicosMedio[];
  nota_minima_aprovacao: number;
  categorias_envolvidas: CategoriaNota[];
  formula: AvaliacaoFinalFormulaTextual;
  aplica_se_reprovado_em_type?: string | null;
  materias_aplicaveis?: EscopoMateriaAplicavelFundamental[] | EscopoMateriaAplicavelCurso[];
  limite_materias_pendentes?: number | null;
  status: 'ativo' | 'inativo' | 'deletado' | string;
  version: number;
}

export interface AvaliacaoFinalAutomaticaResultado {
  message: string;
  tipo_ensino: TipoEnsino;
  type: string;
  aprovado: boolean;
  nota_final: number;
  nota_minima_aprovacao: number;
  resultado: string;
  turmas_removidas?: string[];
}

export interface RegistrarNotaResponse {
  message: string;
  estudante: string;
  materia: string;
  nota: number;
  ano_academico: string;
  periodo: string;
  periodos_validos: string[];
  avaliacoes_finais_automaticas?: AvaliacaoFinalAutomaticaResultado[];
}

export interface RegistrarNotasRequest {
  codigo_estudante: string;
  periodo: Periodo;
  materia_disciplinar_id: string;
  tipo: TipoNota;
  categoria: CategoriaNota;
  nota: number;
  observacao?: string;
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
  turno: Turno;
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
 * POST /academia/definir-ano-letivo
 * O backend infere o tipo pelo cadastro da academia. Não envie `type`, `tipo` nem `periodo`.
 */
export interface DefinirAnoLetivoAcademiaRequest {
  /** Opcional: quando omitido, o backend usa o ano letivo global atual. */
  ano_letivo?: string; // formato: YYYY_YYYY  ex: "2025_2026"
}

/**
 * POST /admin/definir-ano-letivo-geral
 * O backend calcula automaticamente o ano letivo oficial global pelo ano civil atual.
 */
export interface DefinirAnoLetivoGlobalRequest {
  /** Tipo de ano letivo oficial global a definir. */
  type: AnoLetivoTipo;
  /** Formato: YYYY_YYYY  ex: "2026_2027" */
  ano_letivo: string;
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

export interface AvaliacaoFinalResultadoMateria {
  materia_id: string;
  nota_final: number;
  aprovado: boolean;
  type: string;
  formula_snapshot?: AvaliacaoFinalFormulaTextual;
  regra_avaliacao_final_id?: string;
  pendencia_permitida?: boolean;
}

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
  /** Etapa pública configurada na regra: normal, recurso, especial, etc. */
  type?: string;
  aprovado: boolean;
  nota_final?: number;
  nota_minima_aprovacao?: number;
  regra_avaliacao_final_id?: string;
  formula_snapshot?: AvaliacaoFinalFormulaTextual;
  aplica_se_reprovado_em_type?: string | null;
  aprovado_com_pendencia?: boolean;
  resultados_materias?: AvaliacaoFinalResultadoMateria[];
  observacao?: string;
  registered_at: string;
  version: number;
}


export type GerirAnosAcademicosRequest =
  | { type: 'fundamental'; anos_academicos: string[] }
  | { type: 'medio'; curso_id: string; anos_academicos: string[] };

export interface GerirAnosAcademicosResponse {
  message: string;
  type: TipoEnsino;
  curso_id?: string;
  anos_academicos: string[];
  periodos?: string[];
}

export interface ListarAnosAcademicosResponse {
  academia: Pick<AcademiaDetalhada, 'nivel' | 'nivel_escolar' | 'anos_academicos'>;
  cursos: Curso[];
}

export interface Curso {
  id: string;
  nome: string;
  type: CursoType;
  modelo?: 'liceu' | 'tecnico';
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
  pendencia_permitida?: boolean;
  pendencia_nivel_conclusao?: string;
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
  turno: Turno;
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
  id?: string;
  codigo_academia: string;
  codigo: string;
  nome: string;
  descricao?: string;
  /** Anos acadêmicos nos quais a categoria pode receber notas. */
  anos_academicos: string[];
  adicionado_por?: string;
  source?: 'system' | string;
  fixed?: boolean;
  readonly?: boolean;
  status: 'ativo' | 'inativo';
  created_at?: string;
  version?: number;
}

export interface Evento {
  id: number;
  event_id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  event_version: number;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
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
  telefone_encarregado?: string;
  telefone_verificado: boolean;
  telefone_encarregado_verificado: boolean;
  email_verificado: boolean;
  bilhete_identidade?: string;
  bilhete_identidade_encarregado?: string;
  genero: Genero;
  data_nascimento: ApiDate;
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
  documentos?: Record<string, SolicitacaoMatriculaDocumento | string | null | undefined>;
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
  telefone?: string;
  telefone_verificado: boolean;
  email?: string;
  email_verificado: boolean;
  website?: string;
  nivel_escolar?: NivelEscolar;
  anos_academicos?: string[];
  status: string;
  cursos: string[];
  motivo_desativacao?: string;
  created_at: string;
  updated_at: string;
  total_estudantes: number;
  version: number;
  ano_letivo?: string;
  tipo_ano_letivo?: 'escolar' | 'superior';
  ano_letivo_ativado_em?: string;
  anos_letivos_lista: AnoLetivoItem[];
  documentos_obrigatorios?: DocumentosObrigatorios;
}

export interface AdminDetalhado {
  id: string;
  nome: string;
  email: string;
  role: AdminRole;
  status: string;
  email_verificado: boolean;
  telefone?: string;
  telefone_verificado: boolean;
  created_by?: string;
  total_acoes_realizadas?: number;
  created_at: string;
  updated_at: string;
  version: number;
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

export interface CriarRegraAvaliacaoFinalResponse {
  message: string;
  id: string;
}

export interface ListarRegrasAvaliacaoFinalResponse {
  regras: RegraAvaliacaoFinal[];
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
  total_geral?: number;
  limit?: number;
  offset?: number;
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
  total_geral?: number;
  limit?: number;
  offset?: number;
}

/** GET /reprovacoes */
export interface ListarReprovacoesResponse {
  reprovacoes: AvaliacaoFinal[];
  total: number;
  total_geral?: number;
  limit?: number;
  offset?: number;
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
  tipo?: 'escolar' | 'superior';
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
  tipo?: AnoLetivoTipo;
  periodo: string;
  imutavel: boolean;
}

export interface DefinirAnoLetivoGlobalResponse {
  message: string;
  type: AnoLetivoTipo;
  ano_letivo: string;
  periodo: string;
  imutavel: boolean;
}

/** GET /ano-letivo */
export interface AnoLetivoGlobalResponse {
  type?: AnoLetivoTipo;
  ano_letivo: string;
  definido_em?: string;
  definido_por?: string;
}

/** GET /anos-letivos-lista */
export interface ListarAnosLetivosGlobalResponse {
  anos_letivos_lista: Array<{
    ano_letivo: string;
    type?: AnoLetivoTipo;
    definido_por?: string;
    definido_em?: string;
  }>;
}

/** GET /academia/anos-letivos-lista */
export interface ListarAnosLetivosAcademiaResponse {
  anos_letivos_lista: Array<{
    ano_letivo: string;
    type?: AnoLetivoTipo;
    tipo?: 'escolar' | 'superior';
    definido_por?: string;
    definido_em?: string;
  }>;
}


export type AnoLetivoTipo = 'escolar' | 'superior';

export interface AnoLetivoConfiguracao {
  type: AnoLetivoTipo;
  periodo: string;
  imutavel: boolean;
}

export interface ListarConfiguracoesAnoLetivoResponse {
  configuracoes: AnoLetivoConfiguracao[];
}

export interface AtualizarConfiguracaoAnoLetivoRequest {
  periodo: string;
}

export interface AtualizarConfiguracaoAnoLetivoResponse {
  message: string;
  type: AnoLetivoTipo;
  periodo: string;
}

export interface FinalizarAnoLetivoRequest {
  type: AnoLetivoTipo;
  ano_letivo: string;
  observacao?: string;
}

export interface FinalizarAnoLetivoResponse {
  message: string;
  academia_id: string;
  type: AnoLetivoTipo;
  /** Ano encerrado pela operação. */
  ano_letivo_finalizado: string;
  /** Novo ano letivo ativo da academia após a finalização. */
  ano_letivo: string;
  finalizado: boolean;
  /** Indica se o global foi atualizado automaticamente porque todas as academias ficaram alinhadas. */
  global_atualizado?: boolean;
}

export interface AnoLetivoFinalizacao {
  academia_id?: string;
  codigo_academia?: string;
  type: AnoLetivoTipo;
  ano_letivo: string;
  finalizado: boolean;
  finalizado_em?: string;
  observacao?: string;
}

export interface ListarFinalizacoesAnoLetivoResponse {
  finalizacoes: AnoLetivoFinalizacao[];
}

export interface AnoLetivoFinalizacaoLimite {
  type: AnoLetivoTipo;
  ano_letivo_finalizado_por_todas: string;
  minimo_global_permitido: string;
  academias_total: number;
  academias_finalizadas: number;
}

export interface ListarLimitesFinalizacaoAnoLetivoResponse {
  limites: AnoLetivoFinalizacaoLimite[];
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
  total_geral?: number;
  limit?: number;
  offset?: number;
  tipo_usuario: UserType;
}

export interface ConsultarEstudantesResponse {
  estudantes: EstudanteDetalhado[];
  total: number;
  total_geral?: number;
  limit?: number;
  offset?: number;
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

export const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export function formatMesAnoLetivo(mes: string | number): string {
  const numero = typeof mes === 'number' ? mes : Number(String(mes).trim());
  return Number.isInteger(numero) && numero >= 1 && numero <= 12
    ? MESES_PT[numero - 1]
    : String(mes || '—');
}

export function formatPeriodoAnoLetivo(periodo?: string): string {
  if (!periodo) return '—';
  const [inicio, fim] = periodo.split('_');
  if (!inicio || !fim) return periodo;
  return `${formatMesAnoLetivo(inicio)} a ${formatMesAnoLetivo(fim)}`;
}

export function descreverJanelaFinalizacao(periodo?: string): string {
  if (!periodo) return 'Configure o período para visualizar a janela de finalização.';
  const [, fim] = periodo.split('_');
  return `A finalização pode ser solicitada a partir de ${formatMesAnoLetivo(fim)} e fica disponível até o mês anterior ao novo início letivo.`;
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
