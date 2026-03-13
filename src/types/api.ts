// src/types/api.ts

// =====================
// BASE TYPES
// =====================

export type UserType = 'academia' | 'estudante' | 'admin';
export type AdminType = 'gerente' | 'adm' | 'fpp';

export type AcademiaType = 'escola' | 'superior';
export type NivelEscolar = 'fundamental' | 'medio' | 'misto';

export type AnoAcademico = AnoEscolar | AnoSuperior;

export type AnoEscolar =
  | 'primeiro_fundamental' | 'segundo_fundamental' | 'terceiro_fundamental'
  | 'quarto_fundamental'   | 'quinto_fundamental'  | 'sexto_fundamental'
  | 'setimo_fundamental'   | 'oitavo_fundamental'  | 'nono_fundamental'
  | 'primeiro_medio' | 'segundo_medio' | 'terceiro_medio' | 'quarto_medio';

export type AnoSuperior =
  | 'primeiro_ano' | 'segundo_ano' | 'terceiro_ano'
  | 'quarto_ano'   | 'quinto_ano'  | 'sexto_ano';

export type StatusEscolar            = 'inativo' | 'em_andamento' | 'finalizado';
export type StatusEscolarFundamental = StatusEscolar;
export type StatusEscolarMedio       = StatusEscolar;
export type StatusSuperior           = 'inativo' | 'em_andamento' | 'finalizado';
export type StatusGeral              = 'inativo' | 'ativo' | 'finalizado';

export type Periodo =
  | '1_trimestre' | '2_trimestre' | '3_trimestre'
  | '1_semestre'  | '2_semestre';

export type CursoType   = 'medio' | 'superior';
export type MateriaType = 'fundamental' | 'medio' | 'superior';
export type Genero      = 'masculino' | 'feminino';

// =====================
// REQUEST TYPES
// =====================

export interface CriarEscolaRequest {
  type: 'escola';
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

export interface CriarUniversidadeRequest {
  type: 'superior';
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

/**
 * POST /academia/estudante/register
 * Estudantes são registrados EXCLUSIVAMENTE pela academia (não há auto-cadastro).
 */
export interface CriarEstudanteRequest {
  nome: string;
  genero: Genero;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  ano_escolar?: string;
  status_escolar_fundamental?: StatusEscolarFundamental;
  ano_escolar_medio?: string;
  status_escolar_medio?: StatusEscolarMedio;
  curso_medio_id?: string;
  ano_superior?: string;
  status_superior?: StatusSuperior;
  curso_superior_id?: string;
}

export interface RegistrarFaltasRequest {
  codigo_estudante: string;
  /**
   * Opcional — o backend infere internamente a partir do ano letivo ativo
   * e do nível do estudante.
   */
  ano_academico?: string;
  data: string;
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

export interface AtualizarStatusRequest {
  novo_status: StatusEscolar | StatusSuperior;
}

export interface CriarCursoRequest {
  nome: string;
  type: CursoType;
  anos_academicos: string[];
  /** Obrigatório para superior, ausente/vazio para medio */
  periodos?: string[];
}

export interface AtualizarCursoRequest {
  nome?: string;
  anos_academicos?: string[];
  periodos?: string[];
}

export interface CriarMateriaRequest {
  nome: string;
  type: MateriaType;
  anos_academicos?: string[];
  curso_id?: string;
}

export interface AtualizarMateriaRequest {
  nome?: string;
}

/** PUT /academia/materias/:id/periodo — exclusivo para matérias do tipo 'superior' */
export interface DefinirPeriodoMateriaRequest {
  periodo: string;
}

export interface AtualizarDadosPessoaisEstudanteRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
}

export interface AtualizarDadosAcademicosEstudanteRequest {
  ano_escolar?: string;
  ano_escolar_medio?: string;
  ano_superior?: string;
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
  role: AdminType;
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
  curso_id: string; // UUID
  tipo_ensino: 'medio' | 'superior';
}

/**
 * POST /academia/avaliacao-final
 * ano_lectivo resolvido automaticamente pelo backend a partir do ano letivo ativo.
 */
export interface RegistrarAvaliacaoFinalRequest {
  codigo_estudante: string;
  tipo_ensino: 'fundamental' | 'medio' | 'superior';
  nivel_ano_academico_atual: string;
  proximo_ano_academico?: string;
  aprovado: boolean;
  observacao?: string;
}

/**
 * @deprecated Use RegistrarAvaliacaoFinalRequest.
 * Mantido para compatibilidade com POST /academia/aprovacao-ano (rota ainda activa).
 */
export interface RegistrarAprovacaoAnoRequest {
  codigo_estudante: string;
  tipo_ensino: 'fundamental' | 'medio' | 'superior';
  nivel_atual: string;
  proximo_nivel?: string;
  aprovado: boolean;
  observacao?: string;
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
  observacao: string; // obrigatória na correcção (regra de negócio do aggregate)
}

export interface AtualizarFaltaRequest {
  id: string;
  data?: string;
  materia_disciplinar_id?: string;
  quantidade?: number;
  observacao?: string;
}

export interface CriarCategoriaNotaRequest {
  nome: string; // formato: nota_[nome]
  descricao?: string;
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

/** POST /academia/ano-letivo */
export interface DefinirAnoLetivoAcademiaRequest {
  ano_letivo: string; // formato: YYYY_YYYY  ex: "2025_2026"
  tipo: 'escola' | 'superior';
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

/**
 * POST /login
 * Handler retorna: { token, nome, type, codigo/email, role? }
 */
export interface AuthResponse {
  token: string;
  nome: string;
  type: UserType;
  /** codigo_academia ou codigo_estudante (ausente para admin) */
  codigo?: string;
  /** e-mail (apenas para admin) */
  email?: string;
  /** role (apenas para admin) */
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
  ano_lectivo: string;
  ano_academico?: string;
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
  ano_lectivo: string;
  ano_academico: string;
  data: string;
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
  tipo_ensino: 'fundamental' | 'medio' | 'superior';
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
  tipo_ensino: 'fundamental' | 'medio' | 'superior';
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
  /** Apenas para tipo 'superior'. Definido via PUT /academia/materias/:id/periodo */
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
  nome: string;
  descricao?: string;
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

// ── Perfis — alinhados com EstudanteDTO / AcademiaDTO / AdminDTO ──────────────

/**
 * EstudanteDTO (projection_estudantes).
 */
export interface EstudanteDetalhado {
  id: string;
  nome: string;
  codigo_estudante: string;
  email?: string;
  telefone?: string;
  email_verificado: boolean;
  bilhete_identidade?: string;
  bilhete_identidade_responsavel?: string;
  genero?: Genero;
  codigo_academia?: string;
  status: StatusGeral;
  status_escolar_fundamental: StatusEscolar;
  status_escolar_medio: StatusEscolar;
  status_superior: StatusSuperior;
  ano_escolar?: string;
  ano_escolar_medio?: string;
  ano_superior?: string;
  curso_medio_id?: string;
  curso_superior_id?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

/**
 * AcademiaDTO (projection_academias).
 */
export interface AcademiaDetalhada {
  id: string;
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
  /** Ano letivo ativo. undefined = não configurado (bloqueia registros) */
  ano_letivo?: string;
  tipo_ano_letivo?: 'escola' | 'superior';
  ano_letivo_ativado_em?: string;
}

/**
 * AdminDTO — campos retornados pelos handlers de perfil admin.
 */
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
  ano_letivo: string;   // ex: "2025_2026"
  tipo?: string;        // "escola" | "superior"
  ativado_em?: string;  // ISO timestamp
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
}

export interface AlterarCursoResponse {
  message: string;
  codigo_estudante: string;
  tipo_ensino: string;
  curso_id: string;
  curso_nome: string;
}

export interface AtualizarStatusResponse {
  message: string;
  estudante: string;
  novo_status: string;
}

/** DELETE /academia/turmas/:codigo */
export interface DeletarTurmaResponse {
  message: string;
  codigo_turma: string;
  auditavel: true;
}

/** DELETE /academia/cursos/:id */
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

// ── Perfil e consultas ────────────────────────────────────────────────────────

/**
 * GET /meu-perfil
 * Retorna { tipo, academia } | { tipo, admin } | { tipo, estudante }
 */
export interface MeuPerfilResponse {
  tipo: UserType;
  estudante?: EstudanteDetalhado & {
    academia?: {
      codigo: string;
      nome: string;
      tipo: AcademiaType;
    };
  };
  academia?: AcademiaDetalhada;
  admin?: AdminDetalhado;
}

/**
 * GET /consultar-estudante/:codigo
 * Handler retorna { estudante: { ...campos, academia?, curso_medio?, curso_superior? } }
 */
export interface ConsultarEstudanteResponse {
  estudante: EstudanteDetalhado & {
    academia?: {
      codigo: string;
      nome: string;
      tipo: AcademiaType;
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

/**
 * GET /consultar-academia/:codigo
 */
export interface ConsultarAcademiaResponse {
  academia: AcademiaDetalhada & {
    motivo_desativacao?: string; // apenas para admin
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

/**
 * GET /buscar-usuario?id=UUID (admin only)
 * Handler retorna { tipo, usuario: DTO }
 */
export interface BuscarUsuarioResponse {
  tipo: UserType;
  usuario: EstudanteDetalhado | AcademiaDetalhada | AdminDetalhado;
}

// ── Event Sourcing / Registros (admin) ───────────────────────────────────────

/**
 * GET /registros (admin) — notas e faltas de todos os estudantes com paginação.
 */
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
// 21 províncias — administração territorial 2025. Não alterar.
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

/**
 * Converte o formato interno "2025_2026" para exibição "2025/2026".
 */
export function formatAnoLetivo(valor: string): string {
  return valor.replace('_', '/');
}

/**
 * Gera as 2 opções de anos letivos relevantes com base no ano actual.
 */
export function gerarOpcoesAnoLetivo(): { valor: string; label: string }[] {
  const anoAtual = new Date().getFullYear();
  return [
    { valor: `${anoAtual - 1}_${anoAtual}`, label: `${anoAtual - 1}/${anoAtual}` },
    { valor: `${anoAtual}_${anoAtual + 1}`, label: `${anoAtual}/${anoAtual + 1}` },
  ];
}